const mongoose = require('mongoose');
const { getWarrantyConnection } = require('../../shared/database/warrantyConnection');
const { BaseEntity } = require('../../shared/Base/BaseEntity');
const { ServiceCenterMixin } = require('../../shared/Base/ServiceCenterMixin');
const { VINMixin } = require('../../shared/Base/VINMixin');

const warrantyClaimSchema = new mongoose.Schema({
    // ✅ INHERIT BASE PATTERNS
    ...BaseEntity,
    ...VINMixin,
    ...ServiceCenterMixin,

    // Claim identification
    claimNumber: {
        type: String,
        unique: true,
        required: true,
        // Format: WC-YYYY-XXXXX
    },

    // ✅ VIN FIELD INHERITED FROM VINMixin

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
            "parts_shipped",        // UC9: Parts have been shipped
            "parts_received",       // UC9: Parts received and verified
            "parts_rejected",       // UC9: Parts rejected due to quality issues
            "repair_in_progress",   // UC10: Repair work is in progress
            "repair_on_hold",       // UC10: Repair work is on hold due to issues
            "repair_completed",     // UC10: Repair work completed, awaiting final check
            "in_progress",          // Legacy status
            "completed",
            "cancelled",
        ],
        default: "pending",
    },

    // UC6: Status History Tracking
    statusHistory: [{
        status: {
            type: String,
            enum: [
                "pending",
                "under_review",
                "approved",
                "rejected",
                "parts_shipped",        // UC9: Parts have been shipped
                "parts_received",       // UC9: Parts received and verified
                "parts_rejected",       // UC9: Parts rejected due to quality issues
                "repair_in_progress",   // UC10: Repair work is in progress
                "repair_on_hold",       // UC10: Repair work is on hold due to issues
                "repair_completed",     // UC10: Repair work completed, awaiting final check
                "in_progress",          // Legacy status
                "completed",
                "cancelled",
            ],
            required: true
        },
        changedAt: {
            type: Date,
            default: Date.now
        },
        changedBy: {
            type: String,
            required: true
        },
        reason: {
            type: String,
            maxlength: 500
        },
        notes: {
            type: String,
            maxlength: 1000
        }
    }],

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

    // ✅ SERVICE CENTER FIELDS INHERITED FROM ServiceCenterMixin

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

    // Additional notes (extends BaseEntity.note)
    notes: {
        type: String,
        maxlength: 2000
    },

    // ✅ TIMESTAMPS INHERITED FROM BaseEntity

    completedAt: {
        type: Date,
        required: false
    },

    // UC7: Approval/Rejection fields
    approvedAt: {
        type: Date,
        required: false
    },

    approvedBy: {
        type: String,
        required: false
    },

    rejectedAt: {
        type: Date,
        required: false
    },

    rejectedBy: {
        type: String,
        required: false
    },

    rejectionReason: {
        type: String,
        maxlength: 1000,
        required: false
    },

    // UC7: Approval notes array
    approvalNotes: [{
        note: {
            type: String,
            required: true,
            maxlength: 1000
        },
        addedBy: {
            type: String,
            required: true
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // UC9: Parts Shipment Management
    partsShipment: {
        status: {
            type: String,
            enum: ['pending', 'shipped', 'received', 'rejected'],
            default: 'pending'
        },
        shippedDate: {
            type: Date,
            required: false
        },
        receivedDate: {
            type: Date,
            required: false
        },
        trackingNumber: {
            type: String,
            required: false,
            maxlength: 100
        },
        receivedBy: {
            type: String,
            required: false
        },
        qualityCheckNotes: {
            type: String,
            required: false,
            maxlength: 1000
        },
        parts: [{
            partId: {
                type: mongoose.Schema.Types.ObjectId,
                required: false
            },
            partName: {
                type: String,
                required: true
            },
            serialNumber: {
                type: String,
                required: false
            },
            condition: {
                type: String,
                enum: ['good', 'damaged', 'defective'],
                required: true
            },
            receivedQuantity: {
                type: Number,
                required: true,
                min: 0
            },
            notes: {
                type: String,
                required: false,
                maxlength: 500
            }
        }]
    },

    // UC10: Repair Progress Management
    repairProgress: {
        status: {
            type: String,
            enum: ['not_started', 'in_progress', 'on_hold', 'completed'],
            default: 'not_started'
        },
        assignedTechnician: {
            type: mongoose.Schema.Types.ObjectId,
            required: false,
            ref: 'User'
        },
        startDate: {
            type: Date,
            required: false
        },
        estimatedCompletionDate: {
            type: Date,
            required: false
        },
        actualCompletionDate: {
            type: Date,
            required: false
        },
        steps: [{
            stepType: {
                type: String,
                enum: ['diagnosis', 'removal', 'installation', 'testing', 'quality_check'],
                required: true
            },
            status: {
                type: String,
                enum: ['pending', 'in_progress', 'completed', 'skipped'],
                default: 'pending'
            },
            startedAt: {
                type: Date,
                required: false
            },
            completedAt: {
                type: Date,
                required: false
            },
            notes: {
                type: String,
                required: false,
                maxlength: 1000
            },
            performedBy: {
                type: String,
                required: false
            }
        }],
        issues: [{
            issueType: {
                type: String,
                enum: ['parts_mismatch', 'additional_damage', 'parts_defective', 'other'],
                required: true
            },
            severity: {
                type: String,
                enum: ['low', 'medium', 'high', 'critical'],
                required: true
            },
            description: {
                type: String,
                required: true,
                maxlength: 1000
            },
            reportedAt: {
                type: Date,
                default: Date.now
            },
            reportedBy: {
                type: String,
                required: true
            },
            status: {
                type: String,
                enum: ['open', 'in_progress', 'resolved', 'escalated'],
                default: 'open'
            },
            resolvedAt: {
                type: Date,
                required: false
            },
            resolvedBy: {
                type: String,
                required: false
            },
            resolution: {
                type: String,
                required: false,
                maxlength: 1000
            }
        }],
        qualityCheck: {
            performed: {
                type: Boolean,
                default: false
            },
            performedAt: {
                type: Date,
                required: false
            },
            performedBy: {
                type: String,
                required: false
            },
            passed: {
                type: Boolean,
                required: false
            },
            notes: {
                type: String,
                required: false,
                maxlength: 1000
            },
            checklist: [{
                item: {
                    type: String,
                    required: true
                },
                status: {
                    type: String,
                    enum: ['pass', 'fail', 'na'],
                    required: true
                },
                notes: {
                    type: String,
                    required: false
                }
            }]
        },
        totalLaborHours: {
            type: Number,
            required: false,
            min: 0,
            default: 0
        },
        totalCost: {
            type: Number,
            required: false,
            min: 0,
            default: 0
        }
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

// UC10: Repair Progress indexes
warrantyClaimSchema.index({ 'repairProgress.status': 1 });
warrantyClaimSchema.index({ 'repairProgress.assignedTechnician': 1 });
warrantyClaimSchema.index({ 'repairProgress.startDate': 1 });
warrantyClaimSchema.index({ claimStatus: 1, 'repairProgress.status': 1 });

// Pre-save middleware to update updatedAt and track status changes
warrantyClaimSchema.pre('save', function (next) {
    this.updatedAt = new Date();

    // UC6: Track status changes in statusHistory
    if (this.isModified('claimStatus')) {
        // Initialize statusHistory if it doesn't exist
        if (!this.statusHistory) {
            this.statusHistory = [];
        }

        // Add new status to history
        // Note: changedBy should be set by the controller before saving
        const statusEntry = {
            status: this.claimStatus,
            changedAt: new Date(),
            changedBy: this._statusChangedBy || 'system',
            reason: this._statusChangeReason || '',
            notes: this._statusChangeNotes || ''
        };

        this.statusHistory.push(statusEntry);

        // Clean up temporary fields
        this._statusChangedBy = undefined;
        this._statusChangeReason = undefined;
        this._statusChangeNotes = undefined;
    }

    next();
});

// Virtual for calculating estimated total cost
warrantyClaimSchema.virtual('estimatedTotalCost').get(function () {
    if (!this.partsToReplace || !Array.isArray(this.partsToReplace)) {
        return 0;
    }
    return this.partsToReplace.reduce((total, part) => {
        return total + (part.estimatedCost || 0) * part.quantity;
    }, 0);
});

// Virtual for checking if claim is still editable
warrantyClaimSchema.virtual('isEditable').get(function () {
    return ['pending', 'under_review'].includes(this.claimStatus);
});

// Virtual for checking if claim is closed
warrantyClaimSchema.virtual('isClosed').get(function () {
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
