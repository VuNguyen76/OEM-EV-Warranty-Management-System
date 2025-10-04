const mongoose = require("mongoose");
const { getVehicleConnection } = require("../../shared/database/vehicleConnection");

// Vehicle Model Schema (for manufacturers)
const VehicleModelSchema = new mongoose.Schema({
    // Basic Model Information
    modelName: {
        type: String,
        required: true,
        trim: true,
        description: "Tên model xe (VD: EV-SUV-2024)"
    },

    modelCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        description: "Mã model (VD: EVSUV24)"
    },

    manufacturer: {
        type: String,
        required: true,
        trim: true,
        description: "Hãng sản xuất"
    },

    category: {
        type: String,
        required: true,
        enum: ["sedan", "suv", "hatchback", "truck", "van"],
        description: "Loại xe"
    },

    year: {
        type: Number,
        required: true,
        min: 2020,
        max: new Date().getFullYear() + 2,
        description: "Năm sản xuất"
    },

    // Technical Specifications
    batteryCapacity: {
        type: Number,
        required: true,
        min: 10,
        max: 200,
        description: "Dung lượng pin (kWh)"
    },

    motorPower: {
        type: Number,
        required: true,
        min: 50,
        max: 1000,
        description: "Công suất động cơ (kW)"
    },

    range: {
        type: Number,
        required: true,
        min: 100,
        max: 1000,
        description: "Phạm vi hoạt động (km)"
    },

    // Warranty Information
    vehicleWarrantyMonths: {
        type: Number,
        required: true,
        min: 12,
        max: 120,
        default: 36,
        description: "Bảo hành xe (tháng)"
    },

    batteryWarrantyMonths: {
        type: Number,
        required: true,
        min: 24,
        max: 120,
        default: 96,
        description: "Bảo hành pin (tháng)"
    },

    // Pricing
    basePrice: {
        type: Number,
        required: true,
        min: 100000000,
        description: "Giá cơ bản (VND)"
    },

    // Status
    status: {
        type: String,
        enum: ["development", "production", "discontinued"],
        default: "development",
        description: "Trạng thái model"
    },

    // Metadata
    createdBy: {
        type: String,
        required: true,
        description: "Người tạo model"
    }
}, {
    timestamps: true,
    collection: "vehicle_models"
});

// Vehicle Schema (for individual vehicles)
const VehicleSchema = new mongoose.Schema({
    // Basic Information
    vin: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        description: "Vehicle Identification Number (nhập thủ công)"
    },

    // Model Reference
    modelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VehicleModel',
        description: "ID của vehicle model (optional)"
    },

    // Production Information (for manufacturers)
    productionDate: {
        type: Date,
        description: "Ngày sản xuất"
    },

    productionBatch: {
        type: String,
        trim: true,
        description: "Lô sản xuất"
    },

    // Vehicle Specific Details
    color: {
        type: String,
        required: true,
        trim: true,
        description: "Màu sắc xe"
    },

    // Registration Information (for service centers)
    registrationDate: {
        type: Date,
        description: "Ngày đăng ký vào hệ thống bảo hành"
    },

    // Warranty Information
    warrantyStartDate: {
        type: Date,
        description: "Ngày bắt đầu bảo hành"
    },

    warrantyEndDate: {
        type: Date,
        description: "Ngày kết thúc bảo hành"
    },

    warrantyStatus: {
        type: String,
        enum: ["pending", "active", "expired", "voided"],
        default: "pending",
        description: "Trạng thái bảo hành"
    },

    // Owner Information (filled by service center)
    ownerName: {
        type: String,
        trim: true,
        description: "Tên chủ sở hữu"
    },

    ownerPhone: {
        type: String,
        trim: true,
        description: "Số điện thoại chủ sở hữu"
    },

    ownerEmail: {
        type: String,
        trim: true,
        lowercase: true,
        description: "Email chủ sở hữu"
    },

    ownerAddress: {
        type: String,
        trim: true,
        description: "Địa chỉ chủ sở hữu"
    },

    // Service Center Information
    serviceCenterId: {
        type: String,
        description: "ID trung tâm bảo hành"
    },

    serviceCenterName: {
        type: String,
        trim: true,
        description: "Tên trung tâm bảo hành"
    },

    // Status
    status: {
        type: String,
        enum: ["manufactured", "registered", "active", "inactive", "recalled"],
        default: "manufactured",
        description: "Trạng thái xe"
    },

    // Role-based tracking
    createdBy: {
        type: String,
        required: true,
        description: "Người tạo (manufacturer hoặc service_staff)"
    },

    createdByRole: {
        type: String,
        enum: ["manufacturer_staff", "service_staff", "admin"],
        required: true,
        description: "Vai trò người tạo"
    }
}, {
    timestamps: true,
    collection: "vehicles"
});

// Indexes
VehicleModelSchema.index({ modelCode: 1 }, { unique: true });
VehicleModelSchema.index({ manufacturer: 1, modelName: 1 });
VehicleModelSchema.index({ status: 1 });

VehicleSchema.index({ vin: 1 }, { unique: true });
VehicleSchema.index({ modelId: 1 });
VehicleSchema.index({ status: 1 });
VehicleSchema.index({ warrantyStatus: 1 });
VehicleSchema.index({ serviceCenterId: 1 });
VehicleSchema.index({ createdByRole: 1 });

// Virtual fields
VehicleSchema.virtual('isWarrantyActive').get(function () {
    return this.warrantyStatus === 'active' && this.warrantyEndDate > new Date();
});

// Methods
VehicleSchema.methods.activateWarranty = function (startDate, ownerInfo, serviceCenterInfo, updatedBy) {
    this.warrantyStartDate = startDate || new Date();
    this.registrationDate = new Date();
    this.status = 'registered';
    this.warrantyStatus = 'active';

    // Set owner information
    if (ownerInfo) {
        this.ownerName = ownerInfo.name;
        this.ownerPhone = ownerInfo.phone;
        this.ownerEmail = ownerInfo.email;
        this.ownerAddress = ownerInfo.address;
    }

    // Set service center information
    if (serviceCenterInfo) {
        this.serviceCenterId = serviceCenterInfo.id;
        this.serviceCenterName = serviceCenterInfo.name;
    }

    this.updatedBy = updatedBy;
    return this.save();
};

// Static methods
VehicleSchema.statics.findByVIN = function (vin) {
    return this.findOne({ vin: vin.toUpperCase() }).populate('modelId');
};

VehicleModelSchema.statics.findByCode = function (modelCode) {
    return this.findOne({ modelCode: modelCode.toUpperCase() });
};

// Export factory functions
module.exports = function createVehicleModels() {
    try {
        const vehicleConnection = getVehicleConnection();
        const VehicleModel = vehicleConnection.model('VehicleModel', VehicleModelSchema);
        const Vehicle = vehicleConnection.model('Vehicle', VehicleSchema);

        return { VehicleModel, Vehicle };
    } catch (error) {
        console.warn("Vehicle connection not available, using default connection");
        const VehicleModel = mongoose.model('VehicleModel', VehicleModelSchema);
        const Vehicle = mongoose.model('Vehicle', VehicleSchema);

        return { VehicleModel, Vehicle };
    }
};
