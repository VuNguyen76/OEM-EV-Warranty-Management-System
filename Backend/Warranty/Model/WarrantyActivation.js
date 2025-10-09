const mongoose = require('mongoose');
const { getWarrantyConnection } = require('../../shared/database/warrantyConnection');
const { BaseEntity } = require('../../shared/Base/BaseEntity');
const { ServiceCenterMixin } = require('../../shared/Base/ServiceCenterMixin');
const { AuditableMixin } = require('../../shared/Base/AuditableMixin');
const { VINMixin } = require('../../shared/Base/VINMixin');

/**
 * WarrantyActivation Model
 * Represents warranty activation for a vehicle (1 time only when vehicle is sold)
 * Separate from WarrantyClaim (UC4 - multiple claims during warranty period)
 */
const warrantyActivationSchema = new mongoose.Schema({
    // ✅ KẾ THỪA CÁC PATTERN CƠ BẢN
    ...BaseEntity,
    ...VINMixin,
    ...ServiceCenterMixin,
    ...AuditableMixin,

    // ✅ VIN là duy nhất trong collection WarrantyActivation (một bảo hành mỗi VIN)
    vin: {
        ...VINMixin.vin,
        unique: true // Một kích hoạt bảo hành mỗi VIN
    },

    // Thông tin thời hạn bảo hành
    warrantyStartDate: {
        type: Date,
        required: true,
        default: Date.now
    },

    warrantyEndDate: {
        type: Date,
        required: true
    },

    warrantyMonths: {
        type: Number,
        required: true,
        min: 1,
        max: 120 // Tối đa 10 năm
    },

    warrantySource: {
        type: String,
        required: true,
        enum: ['model', 'default', 'custom'],
        default: 'default'
    },

    // Trạng thái bảo hành
    warrantyStatus: {
        type: String,
        required: true,
        enum: ['active', 'expired', 'voided', 'transferred'],
        default: 'active'
    },

    // ✅ SERVICE CENTER FIELDS INHERITED FROM ServiceCenterMixin

    // Thông tin kích hoạt
    activatedBy: {
        type: String,
        required: true,
        trim: true
    },

    activatedByRole: {
        type: String,
        required: true,
        enum: ['admin', 'service_staff', 'technician', 'manufacturer_staff']
    },

    activatedDate: {
        type: Date,
        required: true,
        default: Date.now
    },

    // Thông tin bổ sung (extends BaseEntity.note)
    notes: {
        type: String,
        trim: true,
        maxlength: 1000
    }

    // ✅ TIMESTAMPS INHERITED FROM BaseEntity
    // ✅ AUDIT FIELDS INHERITED FROM AuditableMixin
}, {
    timestamps: true,
    collection: 'warranty_activations'
});

// Index để tăng hiệu suất
warrantyActivationSchema.index({ vin: 1 }, { unique: true });
warrantyActivationSchema.index({ warrantyStatus: 1 });
warrantyActivationSchema.index({ serviceCenterId: 1 });
warrantyActivationSchema.index({ warrantyEndDate: 1 });
warrantyActivationSchema.index({ createdAt: -1 });

// Trường ảo cho checking if warranty is still valid
warrantyActivationSchema.virtual('isValid').get(function () {
    return this.warrantyStatus === 'active' && new Date() <= this.warrantyEndDate;
});

// Trường ảo cho remaining warranty days
warrantyActivationSchema.virtual('remainingDays').get(function () {
    if (this.warrantyStatus !== 'active') return 0;
    const now = new Date();
    const endDate = new Date(this.warrantyEndDate);
    const diffTime = endDate - now;
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
});

// Middleware trước khi lưu to update timestamps
warrantyActivationSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Phương thức static tìm bảo hành hoạt động theo VIN
warrantyActivationSchema.statics.findActiveByVIN = function (vin) {
    return this.findOne({
        vin: vin.toUpperCase(),
        warrantyStatus: 'active',
        warrantyEndDate: { $gte: new Date() }
    });
};

// Phương thức static kiểm tra VIN có bảo hành
warrantyActivationSchema.statics.hasWarranty = function (vin) {
    return this.exists({
        vin: vin.toUpperCase(),
        warrantyStatus: 'active',
        warrantyEndDate: { $gte: new Date() }
    });
};

// Phương thức instance hết hạn bảo hành
warrantyActivationSchema.methods.expire = function () {
    this.warrantyStatus = 'expired';
    return this.save();
};

// Phương thức instance hủy bảo hành
warrantyActivationSchema.methods.void = function (reason) {
    this.warrantyStatus = 'voided';
    this.notes = (this.notes || '') + `\nVoided: ${reason}`;
    return this.save();
};

module.exports = function () {
    const connection = getWarrantyConnection();
    return connection.model('WarrantyActivation', warrantyActivationSchema);
};
