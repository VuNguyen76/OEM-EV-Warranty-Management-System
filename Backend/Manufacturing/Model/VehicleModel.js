const mongoose = require('mongoose');
const { getManufacturingConnection } = require('../../shared/database/manufacturingConnection');

// Schema Model Xe (để nhà sản xuất định nghĩa thông số xe)
const VehicleModelSchema = new mongoose.Schema({
    modelName: {
        type: String,
        required: true,
        trim: true
    },

    modelCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },

    manufacturer: {
        type: String,
        required: true,
        trim: true
    },

    category: {
        type: String,
        required: true,
        enum: ["sedan", "suv", "hatchback", "truck", "van"]
    },

    year: {
        type: Number,
        required: true,
        min: 2020,
        max: new Date().getFullYear() + 2
    },

    // Thông số kỹ thuật EV
    batteryCapacity: {
        type: Number,
        required: true,
        min: 10,
        max: 200 // kWh
    },

    motorPower: {
        type: Number,
        required: true,
        min: 50,
        max: 1000 // kW
    },

    range: {
        type: Number,
        required: true,
        min: 100,
        max: 1000 // km
    },

    // Thông tin Bảo hành
    vehicleWarrantyMonths: {
        type: Number,
        required: true,
        min: 12,
        max: 120
    },

    batteryWarrantyMonths: {
        type: Number,
        required: true,
        min: 24,
        max: 240
    },

    // Pricing
    basePrice: {
        type: Number,
        required: true,
        min: 100000000 // Tối thiểu 100 triệu VND
    },

    // Status
    status: {
        type: String,
        enum: ["development", "production", "discontinued"],
        default: "development"
    },

    // Thông số kỹ thuật
    specifications: {
        chargingTime: Number, // giờ cho 0-80%
        topSpeed: Number, // km/h
        acceleration: Number, // 0-100 km/h trong giây
        weight: Number, // kg
        dimensions: {
            length: Number, // mm
            width: Number, // mm
            height: Number, // mm
            wheelbase: Number // mm
        }
    },

    // Features
    features: [{
        type: String,
        trim: true
    }],

    // Notes
    description: {
        type: String,
        trim: true
    },

    // Các trường audit
    createdBy: {
        type: String,
        required: true
    },

    updatedBy: {
        type: String
    }
}, {
    timestamps: true,
    collection: "vehicle_models"
});

// Indexes
VehicleModelSchema.index({ manufacturer: 1, year: 1 });
VehicleModelSchema.index({ category: 1, status: 1 });
VehicleModelSchema.index({ createdAt: -1 });

// Trường ảo
VehicleModelSchema.virtual('fullName').get(function () {
    return `${this.manufacturer} ${this.modelName} ${this.year}`;
});

VehicleModelSchema.virtual('isActive').get(function () {
    return this.status === 'production';
});

// Phương thức instance
VehicleModelSchema.methods.activate = function () {
    this.status = 'production';
    return this.save();
};

VehicleModelSchema.methods.discontinue = function () {
    this.status = 'discontinued';
    return this.save();
};

// Phương thức static
VehicleModelSchema.statics.findByManufacturer = function (manufacturer) {
    return this.find({ manufacturer: new RegExp(manufacturer, 'i') });
};

VehicleModelSchema.statics.findActiveModels = function () {
    return this.find({ status: 'production' });
};

// Middleware trước khi lưu
VehicleModelSchema.pre('save', function (next) {
    if (this.isModified('modelCode')) {
        this.modelCode = this.modelCode.toUpperCase();
    }
    next();
});

// Export factory function
module.exports = function createVehicleModel() {
    const manufacturingConnection = getManufacturingConnection();
    return manufacturingConnection.model('VehicleModel', VehicleModelSchema);
};
