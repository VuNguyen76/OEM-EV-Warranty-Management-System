const mongoose = require('mongoose');
const { getWarrantyConnection } = require('../../shared/database/warrantyConnection');

/**
 * WarrantyActivation Model
 * Represents warranty activation for a vehicle (1 time only when vehicle is sold)
 * Separate from WarrantyClaim (UC4 - multiple claims during warranty period)
 */
const warrantyActivationSchema = new mongoose.Schema({
    // Vehicle identification
    vin: {
        type: String,
        required: true,
        unique: true, // One warranty activation per VIN
        uppercase: true,
        trim: true,
        minlength: 17,
        maxlength: 17,
        validate: {
            validator: function (v) {
                return /^[A-HJ-NPR-Z0-9]{17}$/.test(v);
            },
            message: 'VIN must be exactly 17 characters (excluding I, O, Q)'
        }
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

    // Service center information (who activated the warranty)
    serviceCenterId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },

    // serviceCenterName and serviceCenterCode removed - can be looked up from serviceCenterId
    // as per GIẢI_THÍCH_TRƯỜNG_TÙY_CHỌN_ĐĂNG_KÝ_VIN.md

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

    // Additional information
    notes: {
        type: String,
        trim: true,
        maxlength: 1000
    },

    // System fields
    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    },

    createdBy: {
        type: String,
        required: true,
        trim: true
    },

    createdByRole: {
        type: String,
        required: true,
        enum: ['admin', 'service_staff', 'technician', 'manufacturer_staff']
    }
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
