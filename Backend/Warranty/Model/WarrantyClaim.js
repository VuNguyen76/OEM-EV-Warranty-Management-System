const mongoose = require('mongoose');
const { getWarrantyConnection } = require('../../shared/database/warrantyConnection');

const warrantyClaimSchema = new mongoose.Schema({
    // Claim identification
    claimNumber: {
        type: String,
        unique: true,
        required: true,
        // Format: WC-YYYY-XXXXX
    },

    vin: {
        type: String,
        required: true,
        uppercase: true,
        validate: {
            validator: function(v) {
                return /^[A-HJ-NPR-Z0-9]{17}$/.test(v);
            },
            message: 'VIN phải có 17 ký tự và không chứa I, O, Q'
        }
    },

    // Warranty reference
    warrantyActivationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WarrantyActivation",
        required: true,
    },

    // Issue information
    issueDescription: {
        type: String,
        required: true,
        maxlength: 2000
    },

    issueCategory: {
        type: String,
        enum: ["battery", "motor", "electrical", "mechanical", "software", "other"],
        required: true,
    },

    // Parts to replace
    partsToReplace: [{
        partId: {
            type: mongoose.Schema.Types.ObjectId,
            required: false
        },
        partName: {
            type: String,
            required: true
        },
        partSerialNumber: {
            type: String,
            required: false
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        reason: {
            type: String,
            required: true
        },
        estimatedCost: {
            type: Number,
            required: false,
            min: 0
        }
    }],

    // Diagnosis
    diagnosis: {
        type: String,
        maxlength: 2000
    },

    mileage: {
        type: Number,
        min: 0
    },

    // Priority
    priority: {
        type: String,
        enum: ["low", "medium", "high", "critical"],
        default: "medium",
    },

    // Status
    claimStatus: {
        type: String,
        enum: [
            "pending",
            "under_review",
            "approved",
            "rejected",
            "in_progress",
            "completed",
            "cancelled",
        ],
        default: "pending",
    },

    // Attachments
    attachments: [{
        fileName: {
            type: String,
            required: true
        },
        fileUrl: {
            type: String,
            required: true
        },
        fileType: {
            type: String,
            required: true
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        },
        uploadedBy: {
            type: String,
            required: true
        },
        attachmentType: {
            type: String,
            enum: ["inspection_report", "diagnostic_report", "photo_evidence", "other"],
            default: "inspection_report"
        }
    }],

    // Service center info
    serviceCenterId: {
        type: String,
        required: true
    },

    serviceCenterName: {
        type: String,
        required: false // Can be looked up from serviceCenterId
    },

    requestedBy: {
        type: String,
        required: true
    },

    // Manufacturer response
    reviewedBy: {
        type: String,
        required: false
    },

    reviewedAt: {
        type: Date,
        required: false
    },

    reviewNotes: {
        type: String,
        maxlength: 2000
    },

    approvedCost: {
        type: Number,
        min: 0
    },

    // Additional notes
    notes: {
        type: String,
        maxlength: 2000
    },

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    },

    completedAt: {
        type: Date,
        required: false
    }
}, {
    timestamps: true // This will automatically manage createdAt and updatedAt
});

// Indexes for better performance
warrantyClaimSchema.index({ vin: 1 });
warrantyClaimSchema.index({ claimNumber: 1 });
warrantyClaimSchema.index({ serviceCenterId: 1 });
warrantyClaimSchema.index({ claimStatus: 1 });
warrantyClaimSchema.index({ createdAt: -1 });

// Pre-save middleware to update updatedAt
warrantyClaimSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Virtual for calculating estimated total cost
warrantyClaimSchema.virtual('estimatedTotalCost').get(function() {
    return this.partsToReplace.reduce((total, part) => {
        return total + (part.estimatedCost || 0) * part.quantity;
    }, 0);
});

// Virtual for checking if claim is still editable
warrantyClaimSchema.virtual('isEditable').get(function() {
    return ['pending', 'under_review'].includes(this.claimStatus);
});

// Virtual for checking if claim is closed
warrantyClaimSchema.virtual('isClosed').get(function() {
    return ['completed', 'cancelled', 'rejected'].includes(this.claimStatus);
});

// Ensure virtual fields are serialized
warrantyClaimSchema.set('toJSON', { virtuals: true });
warrantyClaimSchema.set('toObject', { virtuals: true });

// Export as factory function to use correct connection
module.exports = function () {
    const connection = getWarrantyConnection();
    return connection.model('WarrantyClaim', warrantyClaimSchema);
};
