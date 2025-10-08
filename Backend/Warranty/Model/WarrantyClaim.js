const mongoose = require('mongoose');
const { getWarrantyConnection } = require('../../shared/database/warrantyConnection');
const { BaseEntity } = require('../../shared/Base/BaseEntity');
const { ServiceCenterMixin } = require('../../shared/Base/ServiceCenterMixin');
const { VINMixin } = require('../../shared/Base/VINMixin');

const warrantyClaimSchema = new mongoose.Schema({
    // ✅ KẾ THỪA CÁC PATTERN CƠ BẢN
    ...BaseEntity,
    ...VINMixin,
    ...ServiceCenterMixin,

    // Nhận dạng claim
    claimNumber: {
        type: String,
        unique: true,
        required: true,
        // Định dạng: WC-YYYY-XXXXX
    },

    // ✅ VIN FIELD INHERITED FROM VINMixin

    // Tham chiếu bảo hành
    warrantyActivationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WarrantyActivation",
        required: true,
    },

    // Thông tin vấn đề
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

    // Phụ tùng cần thay
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
            "parts_shipped",        // Parts đã được gửi
            "parts_received",       // Parts đã nhận và xác minh
            "parts_rejected",       // Parts bị từ chối do vấn đề chất lượng
            "repair_in_progress",   // Công việc sửa chữa đang tiến hành
            "repair_on_hold",       // Công việc sửa chữa tạm dừng do vấn đề
            "repair_completed",     // Công việc sửa chữa hoàn thành, chờ kiểm tra cuối
            "uploading_results",    // Đang upload ảnh kết quả
            "ready_for_handover",   // Sẵn sàng bàn giao xe
            "handed_over",          // Xe đã bàn giao cho khách hàng
            "in_progress",          // Trạng thái cũ
            "completed",
            "cancelled",
        ],
        default: "pending",
    },

    // Theo dõi lịch sử trạng thái
    statusHistory: [{
        status: {
            type: String,
            enum: [
                "pending",
                "under_review",
                "approved",
                "rejected",
                "parts_shipped",        // Parts đã được gửi
                "parts_received",       // Parts đã nhận và xác minh
                "parts_rejected",       // Parts bị từ chối do vấn đề chất lượng
                "repair_in_progress",   // Công việc sửa chữa đang tiến hành
                "repair_on_hold",       // Công việc sửa chữa tạm dừng do vấn đề
                "repair_completed",     // Công việc sửa chữa hoàn thành, chờ kiểm tra cuối
                "uploading_results",    // Đang upload ảnh kết quả
                "ready_for_handover",   // Sẵn sàng bàn giao xe
                "handed_over",          // Xe đã bàn giao cho khách hàng
                "in_progress",          // Trạng thái cũ
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

    // Đính kèm
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

    // Phản hồi nhà sản xuất
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

    // Ghi chú bổ sung (mở rộng BaseEntity.note)
    notes: {
        type: String,
        maxlength: 2000
    },

    // ✅ TIMESTAMPS INHERITED FROM BaseEntity

    completedAt: {
        type: Date,
        required: false
    },

    // Các trường phê duyệt/từ chối
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

    // Mảng ghi chú phê duyệt
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

    // Quản lý vận chuyển phụ tùng
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

    // Quản lý tiến độ sửa chữa
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
    },

    // Quản lý kết quả bảo hành
    warrantyResults: {
        // Ảnh kết quả
        resultPhotos: [{
            url: {
                type: String,
                required: true
            },
            description: {
                type: String,
                required: true,
                maxlength: 500
            },
            uploadedAt: {
                type: Date,
                default: Date.now
            },
            uploadedBy: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
                ref: 'User'
            }
        }],

        // Thông tin hoàn thành
        completionInfo: {
            completedBy: {
                type: mongoose.Schema.Types.ObjectId,
                required: false,
                ref: 'User'
            },
            completedAt: {
                type: Date,
                required: false
            },
            finalNotes: {
                type: String,
                required: false,
                maxlength: 2000
            },
            workSummary: {
                type: String,
                required: false,
                maxlength: 2000
            },
            testResults: {
                type: String,
                required: false,
                maxlength: 2000
            }
        },

        // Thông tin bàn giao xe
        handoverInfo: {
            handoverDate: {
                type: Date,
                required: false
            },
            handedOverBy: {
                type: mongoose.Schema.Types.ObjectId,
                required: false,
                ref: 'User'
            },
            customerName: {
                type: String,
                required: false,
                maxlength: 200
            },
            customerPhone: {
                type: String,
                required: false,
                maxlength: 20
            },
            customerSignature: {
                type: String,
                required: false
            },
            vehicleCondition: {
                type: String,
                enum: ['excellent', 'good', 'fair'],
                required: false
            },
            mileageAtHandover: {
                type: Number,
                required: false,
                min: 0
            },
            notes: {
                type: String,
                required: false,
                maxlength: 1000
            }
        },

        // Trạng thái kết quả bảo hành
        status: {
            type: String,
            enum: ['uploading_results', 'ready_for_handover', 'handed_over', 'closed'],
            required: false
        },
        closedAt: {
            type: Date,
            required: false
        },
        closedBy: {
            type: mongoose.Schema.Types.ObjectId,
            required: false,
            ref: 'User'
        }
    }
}, {
    timestamps: true // Điều này sẽ tự động quản lý createdAt and updatedAt
});

// Indexes for better performance
warrantyClaimSchema.index({ vin: 1 });
warrantyClaimSchema.index({ claimNumber: 1 });
warrantyClaimSchema.index({ serviceCenterId: 1 });
warrantyClaimSchema.index({ claimStatus: 1 });
warrantyClaimSchema.index({ createdAt: -1 });

// Indexes cho tiến độ sửa chữa
warrantyClaimSchema.index({ 'repairProgress.status': 1 });
warrantyClaimSchema.index({ 'repairProgress.assignedTechnician': 1 });
warrantyClaimSchema.index({ 'repairProgress.startDate': 1 });
warrantyClaimSchema.index({ claimStatus: 1, 'repairProgress.status': 1 });

// Indexes cho kết quả bảo hành
warrantyClaimSchema.index({ 'warrantyResults.status': 1 });
warrantyClaimSchema.index({ 'warrantyResults.completionInfo.completedAt': 1 });
warrantyClaimSchema.index({ 'warrantyResults.handoverInfo.handoverDate': 1 });
warrantyClaimSchema.index({ claimStatus: 1, 'warrantyResults.status': 1 });

// Middleware trước khi lưu to update updatedAt and track status changes
warrantyClaimSchema.pre('save', function (next) {
    this.updatedAt = new Date();

    // Theo dõi thay đổi trạng thái trong lịch sử
    if (this.isModified('claimStatus')) {
        // Khởi tạo statusHistory nếu chưa tồn tại
        if (!this.statusHistory) {
            this.statusHistory = [];
        }

        // Thêm trạng thái mới vào lịch sử
        // Lưu ý: changedBy nên được đặt bởi controller trước khi lưu
        const statusEntry = {
            status: this.claimStatus,
            changedAt: new Date(),
            changedBy: this._statusChangedBy || 'system',
            reason: this._statusChangeReason || '',
            notes: this._statusChangeNotes || ''
        };

        this.statusHistory.push(statusEntry);

        // Dọn dẹp các trường tạm thời
        this._statusChangedBy = undefined;
        this._statusChangeReason = undefined;
        this._statusChangeNotes = undefined;
    }

    next();
});

// Trường ảo cho calculating estimated total cost
warrantyClaimSchema.virtual('estimatedTotalCost').get(function () {
    if (!this.partsToReplace || !Array.isArray(this.partsToReplace)) {
        return 0;
    }
    return this.partsToReplace.reduce((total, part) => {
        return total + (part.estimatedCost || 0) * part.quantity;
    }, 0);
});

// Trường ảo cho checking if claim is still editable
warrantyClaimSchema.virtual('isEditable').get(function () {
    return ['pending', 'under_review'].includes(this.claimStatus);
});

// Trường ảo cho checking if claim is closed
warrantyClaimSchema.virtual('isClosed').get(function () {
    return ['completed', 'cancelled', 'rejected', 'handed_over'].includes(this.claimStatus);
});

// Đảm bảo trường ảo được serialize
warrantyClaimSchema.set('toJSON', { virtuals: true });
warrantyClaimSchema.set('toObject', { virtuals: true });

// Export dưới dạng factory function to use correct connection
module.exports = function () {
    const connection = getWarrantyConnection();
    return connection.model('WarrantyClaim', warrantyClaimSchema);
};
