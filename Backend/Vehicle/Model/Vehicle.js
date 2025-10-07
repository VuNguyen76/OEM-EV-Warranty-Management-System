const mongoose = require('mongoose');
const { getVehicleConnection } = require('../../shared/database/vehicleConnection');

const VehicleSchema = new mongoose.Schema({
    vin: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },

    // ✅ Model Reference (from Manufacturing DB)
    modelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VehicleModel'
    },

    modelName: {
        type: String,
        required: true,
        trim: true,

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

    // ✅ Vehicle Category (SUV, Sedan, Hatchback, etc.)
    category: {
        type: String,
        trim: true
    },

    color: {
        type: String,
        required: true,
        trim: true
    },

    productionDate: {
        type: Date
    },

    // ✅ Production Information (from Manufacturing DB)
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

    // ✅ Quality Information
    qualityStatus: {
        type: String,
        enum: ['pending', 'passed', 'failed'],
        default: 'pending'
    },

    // ✅ Vehicle Specifications (from Model)
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

    // ✅ Warranty Information (from Model)
    vehicleWarrantyMonths: {
        type: Number,
        default: 36
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

    // ✅ Service Center Reference (Primary Key)
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

    status: {
        type: String,
        enum: ["active", "inactive", "maintenance", "recalled"],
        default: "active"
    },

    notes: {
        type: String,
        trim: true
    },

    createdBy: {
        type: String,
        required: true
    },

    updatedBy: {
        type: String
    }
}, {
    timestamps: true,
    collection: "vehicles"
});

// Note: vin already has unique index from schema definition
VehicleSchema.index({ modelCode: 1, year: 1 });
VehicleSchema.index({ serviceCenterCode: 1, status: 1 });
VehicleSchema.index({ ownerPhone: 1 });
VehicleSchema.index({ registrationDate: -1 });
VehicleSchema.index({ createdAt: -1 });

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

VehicleSchema.pre('save', function (next) {
    if (this.isNew) {
        this.createdBy = this.registeredBy;
    }
    next();
});

VehicleSchema.pre(['updateOne', 'findOneAndUpdate'], function (next) {
    this.set({ updatedAt: new Date() });
    next();
});

let Vehicle = null;

const createVehicleModel = () => {
    if (!Vehicle) {
        const connection = getVehicleConnection();
        Vehicle = connection.model('Vehicle', VehicleSchema);
    }
    return Vehicle;
};

module.exports = {
    VehicleSchema,
    createVehicleModel,
    getVehicleModel: () => Vehicle
};