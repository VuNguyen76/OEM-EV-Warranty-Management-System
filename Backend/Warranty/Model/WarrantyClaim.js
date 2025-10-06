const mongoose = require("mongoose");
const BaseEntity = require("../../shared/Base/BaseEntity");

const WarrantyClaimSchema = new mongoose.Schema({
    ...BaseEntity.BaseEntity,

    // Claim Information
    claimNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Vehicle Information
    vin: {
        type: String,
        required: true,
        index: true
    },
    vehicleModel: String,
    vehicleYear: Number,
    mileage: {
        type: Number,
        required: true
    },

    // Customer Information
    customerName: {
        type: String,
        required: true
    },
    customerEmail: {
        type: String,
        required: true
    },
    customerPhone: String,

    // Claim Details
    issueDescription: {
        type: String,
        required: true
    },
    issueCategory: {
        type: String,
        enum: ['battery', 'motor', 'electronics', 'mechanical', 'software', 'other'],
        required: true
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },

    // Dates
    incidentDate: {
        type: Date,
        required: true
    },
    claimDate: {
        type: Date,
        default: Date.now
    },

    // Status
    status: {
        type: String,
        enum: ['pending', 'under_review', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled'],
        default: 'pending',
        index: true
    },

    // Service Center
    serviceCenterName: String,
    serviceCenterLocation: String,
    assignedTechnician: {
        id: String,
        name: String,
        email: String
    },

    // Approval/Rejection
    reviewedBy: {
        id: String,
        name: String,
        email: String,
        date: Date
    },
    approvalReason: String,
    rejectionReason: String,

    // Financial
    estimatedCost: {
        type: Number,
        default: 0
    },
    approvedAmount: {
        type: Number,
        default: 0
    },
    actualCost: {
        type: Number,
        default: 0
    },

    // Parts and Labor
    partsRequired: [{
        partNumber: String,
        partName: String,
        quantity: Number,
        unitCost: Number,
        totalCost: Number
    }],
    laborHours: {
        type: Number,
        default: 0
    },
    laborRate: {
        type: Number,
        default: 0
    },

    // Documentation
    attachments: [{
        filename: String,
        url: String,
        uploadDate: Date,
        uploadedBy: String
    }],

    // Warranty Information
    warrantyType: {
        type: String,
        enum: ['vehicle', 'battery', 'extended'],
        required: true
    },
    warrantyStartDate: Date,
    warrantyEndDate: Date,
    warrantyMileageLimit: Number,

    // Resolution
    resolutionDate: Date,
    resolutionNotes: String,
    customerSatisfaction: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        feedback: String,
        date: Date
    },

    // Internal Notes
    internalNotes: [{
        note: String,
        addedBy: {
            id: String,
            name: String
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Priority
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },

    // Follow-up
    followUpRequired: {
        type: Boolean,
        default: false
    },
    followUpDate: Date,
    followUpNotes: String
});

// Indexes
WarrantyClaimSchema.index({ vin: 1, status: 1 });
WarrantyClaimSchema.index({ claimDate: -1 });
WarrantyClaimSchema.index({ status: 1, priority: 1 });
WarrantyClaimSchema.index({ issueCategory: 1 });
WarrantyClaimSchema.index({ serviceCenterName: 1 });

// Virtual for claim age in days
WarrantyClaimSchema.virtual('claimAgeInDays').get(function () {
    return Math.floor((Date.now() - this.claimDate) / (1000 * 60 * 60 * 24));
});

// Virtual for warranty status
WarrantyClaimSchema.virtual('warrantyStatus').get(function () {
    const now = new Date();
    if (this.warrantyEndDate && now > this.warrantyEndDate) {
        return 'expired';
    }
    return 'active';
});

// Method to generate claim number
WarrantyClaimSchema.statics.generateClaimNumber = function () {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `WC${year}${timestamp}`;
};

// Method to check if warranty is valid
WarrantyClaimSchema.methods.isWarrantyValid = function () {
    const now = new Date();
    return this.warrantyEndDate && now <= this.warrantyEndDate;
};

// Method to calculate total cost
WarrantyClaimSchema.methods.calculateTotalCost = function () {
    const partsCost = this.partsRequired.reduce((total, part) => total + (part.totalCost || 0), 0);
    const laborCost = this.laborHours * this.laborRate;
    return partsCost + laborCost;
};

WarrantyClaimSchema.set('toJSON', { virtuals: true });
WarrantyClaimSchema.set('toObject', { virtuals: true });

// Export factory function
module.exports = function createWarrantyClaim() {
    const { getWarrantyConnection } = require('../../shared/database/warrantyConnection');
    const warrantyConnection = getWarrantyConnection();
    return warrantyConnection.model('WarrantyClaim', WarrantyClaimSchema);
};
