const mongoose = require('mongoose');
const { getVehicleConnection } = require('../../shared/database/vehicleConnection');
const { BaseEntity } = require('../../shared/Base/BaseEntity');
const { ServiceCenterMixin } = require('../../shared/Base/ServiceCenterMixin');
const { AuditableMixin } = require('../../shared/Base/AuditableMixin');
const { VINMixin } = require('../../shared/Base/VINMixin');

const VehicleSchema = new mongoose.Schema({
    // ✅ INHERIT BASE PATTERNS
    ...BaseEntity,
    ...VINMixin,
    ...ServiceCenterMixin,
    ...AuditableMixin,

    // ✅ VIN is unique in Vehicle collection
    vin: {
        ...VINMixin.vin,
        unique: true
    },

    // ✅ Model Reference (from Manufacturing DB) - PRIMARY SOURCE OF TRUTH
    modelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VehicleModel',
        required: true
    },

    // ✅ DENORMALIZED FIELDS - For performance, populated from Manufacturing service
    // These are READ-ONLY copies from VehicleModel, updated only during registration
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
        required: true,
        min: 2020,
        max: new Date().getFullYear() + 2
    },

    category: {
        type: String,
        trim: true
    },

    batteryCapacity: {
        type: Number, // kWh - from VehicleModel
        required: true
    },

    motorPower: {
        type: Number, // kW - from VehicleModel
        required: true
    },

    variant: {
        type: String,
        trim: true
    },

    vehicleWarrantyMonths: {
        type: Number,
        required: true
    },

    // ✅ VEHICLE-SPECIFIC FIELDS - Unique per vehicle instance
    color: {
        type: String,
        required: true,
        trim: true
    },

    productionDate: {
        type: Date,
        required: true
    },

    productionBatch: {
        type: String,
        trim: true
    },

    productionLocation: {
        type: String,
        trim: true
    },

    plantCode: {
        type: String,
        trim: true,
        uppercase: true
    },

    qualityStatus: {
        type: String,
        enum: ['pending', 'passed', 'failed'],
        required: true
    },

    // ✅ VIN Validation Timestamp
    vinValidatedAt: {
        type: Date,
        default: Date.now
    },

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

    // ✅ PURCHASE INFORMATION - Required for warranty calculation
    purchaseDate: {
        type: Date,
        required: true,
        validate: {
            validator: function (v) {
                // Purchase date cannot be in the future
                return v <= new Date();
            },
            message: 'Purchase date cannot be in the future'
        }
    },

    purchasePrice: {
        type: Number,
        min: 0
    },

    dealerName: {
        type: String,
        trim: true
    },

    // ✅ SERVICE CENTER FIELDS INHERITED FROM ServiceCenterMixin

    serviceCenterAddress: {
        type: String,
        trim: true
    },

    serviceCenterPhone: {
        type: String,
        trim: true
    },

    registrationDate: {
        type: Date,
        default: Date.now
    },

    registeredBy: {
        type: String,
        required: true,
        trim: true
    },

    registeredByRole: {
        type: String,
        enum: ["service_staff", "admin"],
        required: true
    },

    // ✅ VEHICLE-SPECIFIC STATUS (overrides BaseEntity.status)
    status: {
        type: String,
        enum: ["active", "inactive", "maintenance", "recalled"],
        default: "active"
    },

    // ✅ NOTES FIELD INHERITED FROM BaseEntity as 'note'
    notes: {
        type: String,
        trim: true
    }

    // ✅ AUDIT FIELDS INHERITED FROM AuditableMixin
    // ✅ TIMESTAMPS INHERITED FROM BaseEntity
}, {
    timestamps: false, // ✅ Using BaseEntity timestamps
    collection: "vehicles"
});

// ✅ VEHICLE-SPECIFIC INDEXES
VehicleSchema.index({ modelCode: 1, year: 1 });
VehicleSchema.index({ ownerPhone: 1 });
VehicleSchema.index({ registrationDate: -1 });

VehicleSchema.virtual('fullOwnerInfo').get(function () {
    return `${this.ownerName} - ${this.ownerPhone}`;
});

VehicleSchema.virtual('fullServiceCenterInfo').get(function () {
    return `${this.serviceCenterName} (${this.serviceCenterCode})`;
});

VehicleSchema.methods.updateOwnerInfo = function (ownerInfo) {
    if (ownerInfo) {
        this.ownerName = ownerInfo.name || this.ownerName;
        this.ownerPhone = ownerInfo.phone || this.ownerPhone;
        this.ownerEmail = ownerInfo.email || this.ownerEmail;
        this.ownerAddress = ownerInfo.address || this.ownerAddress;
    }
    return this;
};

VehicleSchema.methods.updateServiceCenterInfo = function (serviceCenterInfo) {
    if (serviceCenterInfo) {
        this.serviceCenterName = serviceCenterInfo.name || this.serviceCenterName;
        this.serviceCenterCode = serviceCenterInfo.code || this.serviceCenterCode;
        this.serviceCenterAddress = serviceCenterInfo.address || this.serviceCenterAddress;
        this.serviceCenterPhone = serviceCenterInfo.phone || this.serviceCenterPhone;
    }
    return this;
};

VehicleSchema.statics.findByVIN = function (vin) {
    return this.findOne({ vin: vin.toUpperCase() });
};

VehicleSchema.statics.findByServiceCenter = function (serviceCenterCode) {
    return this.find({ serviceCenterCode: serviceCenterCode.toUpperCase() });
};

VehicleSchema.statics.findByOwnerPhone = function (phone) {
    return this.find({ ownerPhone: phone });
};

VehicleSchema.statics.getActiveVehicles = function () {
    return this.find({ status: 'active' });
};

// ✅ BUSINESS LOGIC METHODS
VehicleSchema.methods.canActivateWarranty = function () {
    // Can only activate warranty if vehicle is active and quality passed
    return this.status === 'active' && this.qualityStatus === 'passed';
};

VehicleSchema.methods.getWarrantyStartDate = function () {
    // Warranty starts from purchase date, not registration date
    return this.purchaseDate;
};

VehicleSchema.methods.calculateWarrantyEndDate = function () {
    const startDate = this.getWarrantyStartDate();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + this.vehicleWarrantyMonths);
    return endDate;
};

VehicleSchema.methods.isWarrantyExpired = function () {
    const endDate = this.calculateWarrantyEndDate();
    return new Date() > endDate;
};

VehicleSchema.virtual('warrantyInfo').get(function () {
    return {
        startDate: this.getWarrantyStartDate(),
        endDate: this.calculateWarrantyEndDate(),
        months: this.vehicleWarrantyMonths,
        isExpired: this.isWarrantyExpired(),
        canActivate: this.canActivateWarranty()
    };
});

// ✅ VEHICLE-SPECIFIC MIDDLEWARE
VehicleSchema.pre('save', function (next) {
    if (this.isNew) {
        this.createdBy = this.registeredBy;
    }
    next();
});

// ✅ USE MODEL FACTORY PATTERN
const { createModelFactory } = require('../../shared/Base/ModelFactory');

module.exports = createModelFactory(
    getVehicleConnection,
    'Vehicle',
    VehicleSchema,
    {
        addServiceCenterIndexes: true
    }
);