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

    // Warranty Results
    // warrantyResults: {
    //     resultPhotos: [{
    //         url: {
    //             type: String,
    //             required: true
    //         },
    //         description: {
    //             type: String,
    //             required: false,
    //             maxlength: 500
    //         },
    //         uploadedAt: {
    //             type: Date,
    //             default: Date.now
    //         },
    //         uploadedBy: {
    //             type: mongoose.Schema.Types.ObjectId,
    //             required: true,
    //             ref: 'User'
    //         }
    //     }],

    //     completionInfo: {
    //         completedBy: {
    //             type: mongoose.Schema.Types.ObjectId,
    //             ref: 'User',
    //             required: true
    //         },
    //         completedAt: {
    //             type: Date,
    //             required: true
    //         },
    //         finalNotes: {
    //             type: String,
    //             maxlength: 2000
    //         },
    //         workSummary: {
    //             type: String,
    //             required: true,
    //             maxlength: 2000
    //         },
    //         testResults: {
    //             type: String,
    //             required: false,
    //             maxlength: 2000
    //         }
    //     },

    //     handoverInfo: {
    //         handoverDate: {
    //             type: Date,
    //             required: true
    //         },
    //         handedOverBy: {
    //             type: mongoose.Schema.Types.ObjectId,
    //             ref: 'User',
    //             required: true
    //         },
    //         customerName: {
    //             type: String,
    //             required: true,
    //             maxlength: 100
    //         },
    //         customerPhone: {
    //             type: String,
    //             required: true,
    //             maxlength: 20
    //         },
    //         customerSignature: {
    //             type: String,
    //             required: true
    //         },
    //         vehicleCondition: {
    //             type: String,
    //             required: true,
    //             maxlength: 1000
    //         },
    //         mileageAtHandover: {
    //             type: Number,
    //             required: true,
    //             min: 0
    //         },
    //         notes: {
    //             type: String,
    //             maxlength: 1000
    //         }
    //     },

    //     status: {
    //         type: String,
    //         enum: ['uploading_results', 'ready_for_handover', 'handed_over', 'closed'],
    //         required: true
    //     },
    //     closedAt: Date,
    //     closedBy: {
    //         type: mongoose.Schema.Types.ObjectId,
    //         ref: 'User'
    //     }
    // },

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

// Indexes
WarrantyClaimSchema.index({ vin: 1, status: 1 });
WarrantyClaimSchema.index({ claimDate: -1 });
WarrantyClaimSchema.index({ status: 1, priority: 1 });
WarrantyClaimSchema.index({ issueCategory: 1 });
WarrantyClaimSchema.index({ serviceCenterName: 1 });

// UC10: Repair Progress indexes
warrantyClaimSchema.index({ 'repairProgress.status': 1 });
warrantyClaimSchema.index({ 'repairProgress.assignedTechnician': 1 });
warrantyClaimSchema.index({ 'repairProgress.startDate': 1 });
warrantyClaimSchema.index({ claimStatus: 1, 'repairProgress.status': 1 });

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
