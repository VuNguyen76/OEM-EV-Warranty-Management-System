const mongoose = require('mongoose');
const { getManufacturingConnection } = require('../../shared/database/manufacturingConnection');

// Các class lỗi tùy chỉnh để xử lý lỗi tốt hơn
class QualityCheckError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'QualityCheckError';
        this.code = code;
    }
}

// Schema Xe Sản xuất (cho từng xe trong sản xuất)
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

    // Thông tin Sản xuất
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

    plantCode: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        maxlength: 1,
        match: /^[A-HJ-NPR-Z0-9]$/,
        default: 'H'
    },

    // Thông số kỹ thuật Xe
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

    // Kiểm soát Chất lượng
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

    // Trạng thái Sản xuất
    status: {
        type: String,
        enum: ["manufactured", "quality_check", "ready_for_delivery", "delivered", "recalled"],
        default: "manufactured"
    },

    // Thông tin Giao hàng
    deliveryDate: Date,
    dealershipId: String,
    dealershipName: String,

    // Thông tin Thu hồi
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

    // Thông tin Chi phí
    productionCost: {
        materials: Number,
        labor: Number,
        overhead: Number,
        total: Number
    },

    // Notes
    productionNotes: String,

    // Các trường audit
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

// Trường ảo
ProducedVehicleSchema.virtual('isReadyForDelivery').get(function () {
    return this.status === 'ready_for_delivery' && this.qualityStatus === 'passed';
});

ProducedVehicleSchema.virtual('productionAge').get(function () {
    return Math.floor((Date.now() - this.productionDate) / (1000 * 60 * 60 * 24));
});

// Phương thức instance
ProducedVehicleSchema.methods.passQualityCheck = function (checkType, checkedBy, notes) {
    // Kiểm tra đã pass loại kiểm tra này chưa
    const existingPassedCheck = this.qualityChecks.find(
        check => check.checkType === checkType && check.status === 'pass'
    );

    if (existingPassedCheck) {
        throw new QualityCheckError(`Quality check '${checkType}' đã được pass rồi`, 'DUPLICATE_CHECK');
    }

    // Xóa các lần kiểm tra thất bại trước đó cùng loại
    this.qualityChecks = this.qualityChecks.filter(
        check => check.checkType !== checkType
    );

    // Thêm lần kiểm tra pass mới
    this.qualityChecks.push({
        checkType,
        status: 'pass',
        checkedBy,
        checkedAt: new Date(),
        notes
    });

    // Kiểm tra tất cả kiểm tra chất lượng bắt buộc đã pass
    const requiredChecks = ['safety', 'performance', 'electrical', 'final'];
    const passedCheckTypes = new Set(
        this.qualityChecks
            .filter(check => check.status === 'pass')
            .map(check => check.checkType)
    );

    // Đảm bảo khớp chính xác - tất cả kiểm tra bắt buộc đã pass, không thừa
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

// Phương thức static
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

// Middleware trước khi lưu
ProducedVehicleSchema.pre('save', function (next) {
    if (this.isModified('vin')) {
        this.vin = this.vin.toUpperCase();
    }

    // Tính tổng chi phí sản xuất
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
