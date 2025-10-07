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
    // ✅ INHERIT BASE PATTERNS
    ...BaseEntity,
    ...VINMixin,
    ...ServiceCenterMixin,
    ...AuditableMixin,

    // ✅ VIN is unique in WarrantyActivation collection (one warranty per VIN)
    vin: {
        ...VINMixin.vin,
        unique: true // One warranty activation per VIN
    },

    // Warranty period information
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
        max: 120 // Max 10 years
    },

    warrantySource: {
        type: String,
        required: true,
        enum: ['model', 'default', 'custom'],
        default: 'default'
    },

    // Warranty status
    warrantyStatus: {
        type: String,
        required: true,
        enum: ['active', 'expired', 'voided', 'transferred'],
        default: 'active'
    },

    // ✅ SERVICE CENTER FIELDS INHERITED FROM ServiceCenterMixin

    // Activation information
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

    // Additional information (extends BaseEntity.note)
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

// Indexes for performance
warrantyActivationSchema.index({ vin: 1 }, { unique: true });
warrantyActivationSchema.index({ warrantyStatus: 1 });
warrantyActivationSchema.index({ serviceCenterId: 1 });
warrantyActivationSchema.index({ warrantyEndDate: 1 });
warrantyActivationSchema.index({ createdAt: -1 });

// Virtual for checking if warranty is still valid
warrantyActivationSchema.virtual('isValid').get(function () {
    return this.warrantyStatus === 'active' && new Date() <= this.warrantyEndDate;
});

// Virtual for remaining warranty days
warrantyActivationSchema.virtual('remainingDays').get(function () {
    if (this.warrantyStatus !== 'active') return 0;
    const now = new Date();
    const endDate = new Date(this.warrantyEndDate);
    const diffTime = endDate - now;
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
});

// Pre-save middleware to update timestamps
warrantyActivationSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Static method to find active warranty by VIN
warrantyActivationSchema.statics.findActiveByVIN = function (vin) {
    return this.findOne({
        vin: vin.toUpperCase(),
        warrantyStatus: 'active',
        warrantyEndDate: { $gte: new Date() }
    });
};

// Static method to check if VIN has warranty
warrantyActivationSchema.statics.hasWarranty = function (vin) {
    return this.exists({
        vin: vin.toUpperCase(),
        warrantyStatus: 'active',
        warrantyEndDate: { $gte: new Date() }
    });
};

// Instance method to expire warranty
warrantyActivationSchema.methods.expire = function () {
    this.warrantyStatus = 'expired';
    return this.save();
};

// Instance method to void warranty
warrantyActivationSchema.methods.void = function (reason) {
    this.warrantyStatus = 'voided';
    this.notes = (this.notes || '') + `\nVoided: ${reason}`;
    return this.save();
};

module.exports = function () {
    const connection = getWarrantyConnection();
    return connection.model('WarrantyActivation', warrantyActivationSchema);
};
