const mongoose = require('mongoose');
const { getManufacturingConnection } = require('../../shared/database/manufacturingConnection');

// Custom error classes for better error handling
class QualityCheckError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'QualityCheckError';
        this.code = code;
    }
}

// Produced Vehicle Schema (for individual vehicles in production)
const ProducedVehicleSchema = new mongoose.Schema({
    vin: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },

    modelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VehicleModel',
        required: true
    },

    // Production Information
    productionDate: {
        type: Date,
        required: true
    },

    productionBatch: {
        type: String,
        required: true,
        trim: true
    },

    productionLine: {
        type: String,
        trim: true
    },

    factoryLocation: {
        type: String,
        trim: true
    },

    // Vehicle Specifications
    color: {
        type: String,
        required: true,
        trim: true
    },

    engineNumber: {
        type: String,
        trim: true,
        unique: true,
        sparse: true
    },

    batterySerialNumber: {
        type: String,
        trim: true,
        unique: true,
        sparse: true
    },

    // Quality Control
    qualityStatus: {
        type: String,
        enum: ["pending", "passed", "failed", "rework"],
        default: "pending"
    },

    qualityChecks: [{
        checkType: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ["pass", "fail"],
            required: true
        },
        checkedBy: String,
        checkedAt: {
            type: Date,
            default: Date.now
        },
        notes: String
    }],

    // Production Status
    status: {
        type: String,
        enum: ["manufactured", "quality_check", "ready_for_delivery", "delivered", "recalled"],
        default: "manufactured"
    },

    // Delivery Information
    deliveryDate: Date,
    dealershipId: String,
    dealershipName: String,

    // Recall Information
    recallStatus: {
        type: String,
        enum: ["none", "pending", "completed"],
        default: "none"
    },

    recallCampaigns: [{
        campaignId: String,
        campaignName: String,
        recallDate: Date,
        completedDate: Date,
        status: {
            type: String,
            enum: ["pending", "completed", "not_applicable"]
        }
    }],

    // Cost Information
    productionCost: {
        materials: Number,
        labor: Number,
        overhead: Number,
        total: Number
    },

    // Notes
    productionNotes: String,

    // Audit fields
    createdBy: {
        type: String,
        required: true
    },

    createdByRole: {
        type: String,
        enum: ["manufacturer_staff", "admin"],
        required: true
    },

    updatedBy: String
}, {
    timestamps: true,
    collection: "produced_vehicles"
});

// Indexes
ProducedVehicleSchema.index({ productionDate: -1 });
ProducedVehicleSchema.index({ productionBatch: 1, status: 1 });
ProducedVehicleSchema.index({ qualityStatus: 1 });
ProducedVehicleSchema.index({ createdAt: -1 });

// Virtual fields
ProducedVehicleSchema.virtual('isReadyForDelivery').get(function () {
    return this.status === 'ready_for_delivery' && this.qualityStatus === 'passed';
});

ProducedVehicleSchema.virtual('productionAge').get(function () {
    return Math.floor((Date.now() - this.productionDate) / (1000 * 60 * 60 * 24));
});

// Instance methods
ProducedVehicleSchema.methods.passQualityCheck = function (checkType, checkedBy, notes) {
    // Check if already passed this check type
    const existingPassedCheck = this.qualityChecks.find(
        check => check.checkType === checkType && check.status === 'pass'
    );

    if (existingPassedCheck) {
        throw new QualityCheckError(`Quality check '${checkType}' đã được pass rồi`, 'DUPLICATE_CHECK');
    }

    // Remove any previous failed checks of the same type
    this.qualityChecks = this.qualityChecks.filter(
        check => check.checkType !== checkType
    );

    // Add new passed check
    this.qualityChecks.push({
        checkType,
        status: 'pass',
        checkedBy,
        checkedAt: new Date(),
        notes
    });

    // Check if all required quality checks are passed
    const requiredChecks = ['safety', 'performance', 'electrical', 'final'];
    const passedCheckTypes = new Set(
        this.qualityChecks
            .filter(check => check.status === 'pass')
            .map(check => check.checkType)
    );

    // Ensure exact match - all required checks passed, no extras
    if (requiredChecks.every(check => passedCheckTypes.has(check)) &&
        passedCheckTypes.size === requiredChecks.length) {
        this.qualityStatus = 'passed';
        this.status = 'ready_for_delivery';
    }

    return this.save();
};

ProducedVehicleSchema.methods.failQualityCheck = function (checkType, checkedBy, notes) {
    this.qualityChecks.push({
        checkType,
        status: 'fail',
        checkedBy,
        notes
    });

    this.qualityStatus = 'failed';
    this.status = 'quality_check';

    return this.save();
};

ProducedVehicleSchema.methods.markAsDelivered = function (dealershipId, dealershipName) {
    this.status = 'delivered';
    this.deliveryDate = new Date();
    this.dealershipId = dealershipId;
    this.dealershipName = dealershipName;

    return this.save();
};

// Static methods
ProducedVehicleSchema.statics.findByBatch = function (batchNumber) {
    return this.find({ productionBatch: batchNumber });
};

ProducedVehicleSchema.statics.findReadyForDelivery = function () {
    return this.find({
        status: 'ready_for_delivery',
        qualityStatus: 'passed'
    });
};

ProducedVehicleSchema.statics.getProductionStats = function (startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                productionDate: {
                    $gte: startDate,
                    $lte: endDate
                }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: "$productionDate" },
                    month: { $month: "$productionDate" },
                    status: "$status"
                },
                count: { $sum: 1 }
            }
        }
    ]);
};

// Pre-save middleware
ProducedVehicleSchema.pre('save', function (next) {
    if (this.isModified('vin')) {
        this.vin = this.vin.toUpperCase();
    }

    // Calculate total production cost
    if (this.productionCost && this.isModified('productionCost')) {
        const { materials = 0, labor = 0, overhead = 0 } = this.productionCost;
        this.productionCost.total = materials + labor + overhead;
    }

    next();
});

// Export factory function
module.exports = function createProducedVehicle() {
    const manufacturingConnection = getManufacturingConnection();
    return manufacturingConnection.model('ProducedVehicle', ProducedVehicleSchema);
};
