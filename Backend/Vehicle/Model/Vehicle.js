const mongoose = require("mongoose");
const { BaseEntity } = require("../../shared/Base/BaseEntity");

// VIN validation function
const validateVIN = (vin) => {
    // VIN must be exactly 17 characters
    if (vin.length !== 17) return false;

    // VIN should not contain I, O, Q
    if (/[IOQ]/.test(vin)) return false;

    // Basic format check (alphanumeric)
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return false;

    return true;
};

// Parts Schema for embedded parts
const PartSchema = new mongoose.Schema({
    serialNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    partType: {
        type: String,
        required: true,
        enum: [
            'battery', 'motor', 'bms', 'inverter', 'charger',
            'brake_system', 'suspension', 'steering', 'hvac',
            'infotainment', 'lighting', 'body_parts', 'other'
        ]
    },
    partName: {
        type: String,
        required: true,
        trim: true
    },
    manufacturer: {
        type: String,
        trim: true
    },
    installationDate: {
        type: Date,
        default: Date.now
    },
    warrantyStartDate: {
        type: Date,
        default: Date.now
    },
    warrantyEndDate: {
        type: Date,
        required: true
    },
    position: {
        type: String,
        trim: true,
        description: "Vị trí lắp đặt trên xe"
    },
    status: {
        type: String,
        enum: ['active', 'replaced', 'defective', 'recalled'],
        default: 'active'
    },
    specifications: {
        type: mongoose.Schema.Types.Mixed,
        description: "Thông số kỹ thuật của phụ tùng"
    }
}, {
    timestamps: true
});

// Service History Schema
const ServiceHistorySchema = new mongoose.Schema({
    serviceType: {
        type: String,
        required: true,
        enum: ['maintenance', 'repair', 'warranty', 'recall', 'inspection']
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    serviceDate: {
        type: Date,
        default: Date.now
    },
    mileage: {
        type: Number,
        min: 0,
        description: "Số km khi thực hiện dịch vụ"
    },
    serviceCenterName: {
        type: String,
        trim: true
    },
    technicianId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    partsReplaced: [{
        partType: String,
        oldSerialNumber: String,
        newSerialNumber: String,
        reason: String
    }],
    cost: {
        type: Number,
        min: 0,
        description: "Chi phí dịch vụ"
    },
    attachments: [{
        fileName: String,
        filePath: String,
        fileType: String,
        uploadDate: {
            type: Date,
            default: Date.now
        }
    }],
    notes: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['completed', 'in_progress', 'cancelled'],
        default: 'completed'
    }
}, {
    timestamps: true
});

// Main Vehicle Schema
const VehicleSchema = new mongoose.Schema({
    ...BaseEntity,

    // Vehicle Identification
    vin: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        validate: {
            validator: validateVIN,
            message: 'VIN không hợp lệ. VIN phải có 17 ký tự và không chứa I, O, Q'
        }
    },

    // Vehicle Information
    model: {
        type: String,
        required: true,
        trim: true
    },
    year: {
        type: Number,
        required: true,
        min: 2020,
        max: new Date().getFullYear() + 1
    },
    color: {
        type: String,
        trim: true
    },
    batteryCapacity: {
        type: Number,
        min: 0,
        description: "Dung lượng pin (kWh)"
    },
    range: {
        type: Number,
        min: 0,
        description: "Phạm vi hoạt động (km)"
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
        trim: true
    },

    // Purchase Information
    purchaseDate: {
        type: Date,
        required: true
    },
    dealerName: {
        type: String,
        trim: true
    },
    warrantyStartDate: {
        type: Date,
        default: Date.now
    },
    warrantyEndDate: {
        type: Date,
        required: true
    },

    // Current Status
    currentMileage: {
        type: Number,
        min: 0,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'recalled', 'scrapped'],
        default: 'active'
    },

    // Service Center
    assignedServiceCenter: {
        type: String,
        trim: true,
        description: "Trung tâm dịch vụ được phân công"
    },

    // Parts and Service History
    parts: [PartSchema],
    serviceHistory: [ServiceHistorySchema],

    // Additional Information
    specifications: {
        type: mongoose.Schema.Types.Mixed,
        description: "Thông số kỹ thuật chi tiết của xe"
    },
    notes: {
        type: String,
        trim: true
    }
});

// Indexes for better performance
VehicleSchema.index({ vin: 1 });
VehicleSchema.index({ ownerPhone: 1 });
VehicleSchema.index({ ownerEmail: 1 });
VehicleSchema.index({ model: 1, year: 1 });
VehicleSchema.index({ status: 1 });
VehicleSchema.index({ assignedServiceCenter: 1 });
VehicleSchema.index({ 'parts.serialNumber': 1 });
VehicleSchema.index({ 'parts.partType': 1 });

// Virtual for warranty status
VehicleSchema.virtual('isUnderWarranty').get(function () {
    return new Date() <= this.warrantyEndDate;
});

// Virtual for vehicle age
VehicleSchema.virtual('vehicleAge').get(function () {
    const currentYear = new Date().getFullYear();
    return currentYear - this.year;
});

// Methods
VehicleSchema.methods.addPart = function (partData) {
    this.parts.push(partData);
    return this.save();
};

VehicleSchema.methods.addServiceRecord = function (serviceData) {
    this.serviceHistory.push(serviceData);
    return this.save();
};

VehicleSchema.methods.updateMileage = function (newMileage) {
    if (newMileage >= this.currentMileage) {
        this.currentMileage = newMileage;
        return this.save();
    }
    throw new Error('Số km mới không thể nhỏ hơn số km hiện tại');
};

// Static methods
VehicleSchema.statics.findByVIN = function (vin) {
    return this.findOne({ vin: vin.toUpperCase() });
};

VehicleSchema.statics.findByOwner = function (ownerInfo) {
    const query = {};
    if (ownerInfo.phone) query.ownerPhone = ownerInfo.phone;
    if (ownerInfo.email) query.ownerEmail = ownerInfo.email.toLowerCase();
    return this.find(query);
};

VehicleSchema.statics.findByServiceCenter = function (serviceCenterName) {
    return this.find({ assignedServiceCenter: serviceCenterName });
};

// Ensure virtual fields are serialized
VehicleSchema.set('toJSON', { virtuals: true });
VehicleSchema.set('toObject', { virtuals: true });

const Vehicle = mongoose.model("Vehicle", VehicleSchema);

module.exports = Vehicle;
