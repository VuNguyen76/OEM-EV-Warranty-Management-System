const mongoose = require('mongoose');
const { getWarrantyConnection } = require('../../shared/database/warrantyConnection');

// Warranty Vehicle Schema (for vehicles registered in warranty system)
const WarrantyVehicleSchema = new mongoose.Schema({
    vin: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },

    // Vehicle Information (from Manufacturing Service)
    modelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VehicleModel'
    },

    modelName: {
        type: String,
        required: true,
        trim: true
    },

    modelCode: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },

    manufacturer: {
        type: String,
        required: true,
        trim: true
    },

    year: {
        type: Number,
        required: true
    },

    category: {
        type: String,
        trim: true
    },

    color: {
        type: String,
        required: true,
        trim: true
    },

    productionDate: Date,

    // Vehicle Specifications (from Model)
    batteryCapacity: {
        type: Number // kWh
    },

    motorPower: {
        type: Number // kW
    },

    variant: {
        type: String,
        trim: true
    },

    // Owner Information
    ownerName: {
        type: String,
        required: true,
        trim: true
    },

    ownerPhone: {
        type: String,
        required: true,
        trim: true
    },

    ownerEmail: {
        type: String,
        trim: true,
        lowercase: true
    },

    ownerAddress: {
        type: String,
        required: true,
        trim: true
    },

    // Service Center Information
    serviceCenterId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'ServiceCenter'
    },

    serviceCenterName: {
        type: String,
        required: true,
        trim: true
    },

    serviceCenterCode: {
        type: String,
        required: true,
        trim: true
    },

    // Vehicle Reference
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle'
    },

    // Warranty Information
    warrantyStartDate: {
        type: Date,
        required: true
    },

    warrantyEndDate: {
        type: Date,
        required: true
    },

    warrantyStatus: {
        type: String,
        enum: ["pending", "active", "expired", "voided"],
        default: "pending"
    },

    warrantyMonths: {
        type: Number,
        required: true
    },

    warrantySource: {
        type: String,
        required: true
    },

    vehicleWarrantyMonths: {
        type: Number,
        required: true
    },

    batteryWarrantyMonths: {
        type: Number,
        required: true
    },

    // Registration Information
    registrationDate: {
        type: Date,
        default: Date.now,

    },

    registrationNumber: String,

    // Vehicle Status
    status: {
        type: String,
        enum: ["registered", "active", "inactive", "recalled"],
        default: "registered",

    },

    // Mileage tracking
    currentMileage: {
        type: Number,
        required: true,
        min: 0
    },

    lastServiceMileage: {
        type: Number,
        required: true,
        min: 0
    },

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

    // Notes
    notes: String,

    // Audit fields
    createdBy: {
        type: String,
        required: true
    },

    createdByRole: {
        type: String,
        enum: ["service_staff", "admin"],
        required: true
    },

    updatedBy: String
}, {
    timestamps: true,
    collection: "warranty_vehicles"
});

// Indexes
WarrantyVehicleSchema.index({ serviceCenterId: 1, warrantyStatus: 1 });
WarrantyVehicleSchema.index({ warrantyEndDate: 1 });
WarrantyVehicleSchema.index({ ownerPhone: 1 });
WarrantyVehicleSchema.index({ createdAt: -1 });

// Additional indexes for search performance
WarrantyVehicleSchema.index({ ownerName: 1 });
WarrantyVehicleSchema.index({ modelName: 1 });
WarrantyVehicleSchema.index({ warrantyStatus: 1, warrantyEndDate: 1 });
WarrantyVehicleSchema.index({ ownerName: 'text', modelName: 'text' }); // Text search

// Compound indexes for common queries
WarrantyVehicleSchema.index({ serviceCenterId: 1, warrantyStatus: 1 });
WarrantyVehicleSchema.index({ warrantyStatus: 1, createdAt: -1 });
WarrantyVehicleSchema.index({ ownerPhone: 1, warrantyStatus: 1 });
WarrantyVehicleSchema.index({ modelName: 1, warrantyStatus: 1 });
WarrantyVehicleSchema.index({ warrantyEndDate: 1, warrantyStatus: 1 }); // For expiration queries

// Virtual fields
WarrantyVehicleSchema.virtual('isWarrantyActive').get(function () {
    return this.warrantyStatus === 'active' && this.warrantyEndDate > new Date();
});

WarrantyVehicleSchema.virtual('warrantyDaysRemaining').get(function () {
    if (this.warrantyStatus !== 'active') return 0;
    const today = new Date();
    const endDate = new Date(this.warrantyEndDate);
    const diffTime = endDate - today;
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
});

WarrantyVehicleSchema.virtual('fullOwnerInfo').get(function () {
    return `${this.ownerName} - ${this.ownerPhone}`;
});

// Instance methods
WarrantyVehicleSchema.methods.activateWarranty = function (startDate, ownerInfo, serviceCenterInfo, activatedBy) {
    this.warrantyStatus = 'active';
    this.warrantyStartDate = startDate || new Date();

    if (ownerInfo) {
        this.ownerName = ownerInfo.name || this.ownerName;
        this.ownerPhone = ownerInfo.phone || this.ownerPhone;
        this.ownerEmail = ownerInfo.email || this.ownerEmail;
        this.ownerAddress = ownerInfo.address || this.ownerAddress;
    }

    if (serviceCenterInfo) {
        this.serviceCenterId = serviceCenterInfo.id || this.serviceCenterId;
        this.serviceCenterName = serviceCenterInfo.name || this.serviceCenterName;
    }

    this.status = 'active';
    this.updatedBy = activatedBy;

    return this.save();
};

WarrantyVehicleSchema.methods.voidWarranty = function (reason, voidedBy) {
    this.warrantyStatus = 'voided';
    this.status = 'inactive';
    this.notes = (this.notes || '') + `\nBảo hành bị hủy: ${reason} (${new Date().toLocaleDateString()})`;
    this.updatedBy = voidedBy;

    return this.save();
};

WarrantyVehicleSchema.methods.updateMileage = function (newMileage, updatedBy) {
    if (newMileage > this.currentMileage) {
        this.currentMileage = newMileage;
        this.updatedBy = updatedBy;
        return this.save();
    }
    return Promise.resolve(this);
};

// Static methods
WarrantyVehicleSchema.statics.findByServiceCenter = function (serviceCenterId) {
    return this.find({ serviceCenterId });
};

WarrantyVehicleSchema.statics.findActiveWarranties = function () {
    return this.find({
        warrantyStatus: 'active',
        warrantyEndDate: { $gt: new Date() }
    });
};

WarrantyVehicleSchema.statics.findExpiringWarranties = function (days = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.find({
        warrantyStatus: 'active',
        warrantyEndDate: {
            $gte: new Date(),
            $lte: futureDate
        }
    });
};

WarrantyVehicleSchema.statics.getWarrantyStats = function (serviceCenterId = null) {
    const matchStage = serviceCenterId ? { serviceCenterId } : {};

    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$warrantyStatus',
                count: { $sum: 1 }
            }
        }
    ]);
};

// Pre-save middleware
WarrantyVehicleSchema.pre('save', function (next) {
    if (this.isModified('vin')) {
        this.vin = this.vin.toUpperCase();
    }

    if (this.isModified('modelCode')) {
        this.modelCode = this.modelCode.toUpperCase();
    }

    // Auto-expire warranty if past end date
    if (this.warrantyStatus === 'active' && this.warrantyEndDate < new Date()) {
        this.warrantyStatus = 'expired';
    }

    next();
});

// Static methods
WarrantyVehicleSchema.statics.findActiveWarranties = function (query = {}) {
    return this.find({
        ...query,
        warrantyStatus: 'active',
        warrantyEndDate: { $gt: new Date() } // Only truly active warranties
    });
};

WarrantyVehicleSchema.statics.expireOverdueWarranties = async function () {
    const result = await this.updateMany(
        {
            warrantyStatus: 'active',
            warrantyEndDate: { $lt: new Date() }
        },
        {
            $set: {
                warrantyStatus: 'expired',
                updatedAt: new Date()
            }
        }
    );

    console.log(`✅ Expired ${result.modifiedCount} overdue warranties`);
    return result;
};

// Virtual field for actual status
WarrantyVehicleSchema.virtual('actualStatus').get(function () {
    if (this.warrantyStatus === 'active' && this.warrantyEndDate < new Date()) {
        return 'expired';
    }
    return this.warrantyStatus;
});

// Export factory function
module.exports = function createWarrantyVehicle() {
    const warrantyConnection = getWarrantyConnection();
    return warrantyConnection.model('WarrantyVehicle', WarrantyVehicleSchema);
};
