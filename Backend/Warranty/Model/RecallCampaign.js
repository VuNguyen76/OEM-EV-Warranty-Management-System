const mongoose = require('mongoose');
const { BaseEntity } = require('../../shared/Base/BaseEntity');

const RecallCampaignSchema = new mongoose.Schema({
    // Thông tin cơ bản
    campaignCode: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    campaignName: {
        type: String,
        required: true,
        maxlength: 200,
        trim: true
    },
    campaignType: {
        type: String,
        required: true,
        enum: ['safety', 'quality', 'service', 'software_update']
    },
    severity: {
        type: String,
        required: true,
        enum: ['critical', 'high', 'medium', 'low']
    },

    // Mô tả vấn đề
    issueDescription: {
        type: String,
        required: true,
        maxlength: 2000
    },
    issueCategory: {
        type: String,
        required: true,
        enum: ['battery', 'motor', 'bms', 'inverter', 'charger', 'software', 'other']
    },
    potentialRisk: {
        type: String,
        maxlength: 1000
    },
    rootCause: {
        type: String,
        maxlength: 1000
    },

    // Tiêu chí xe bị ảnh hưởng
    affectedCriteria: {
        models: [{
            type: String
        }],
        vinRanges: [{
            from: {
                type: String,
                validate: {
                    validator: function (v) {
                        return /^[A-HJ-NPR-Z0-9]{17}$/.test(v);
                    },
                    message: 'VIN phải có 17 ký tự hợp lệ'
                }
            },
            to: {
                type: String,
                validate: {
                    validator: function (v) {
                        return /^[A-HJ-NPR-Z0-9]{17}$/.test(v);
                    },
                    message: 'VIN phải có 17 ký tự hợp lệ'
                }
            }
        }],
        productionDateRange: {
            from: Date,
            to: Date
        },
        specificVINs: [{
            type: String,
            validate: {
                validator: function (v) {
                    return /^[A-HJ-NPR-Z0-9]{17}$/.test(v);
                },
                message: 'VIN phải có 17 ký tự hợp lệ'
            }
        }],
        excludedVINs: [{
            type: String,
            validate: {
                validator: function (v) {
                    return /^[A-HJ-NPR-Z0-9]{17}$/.test(v);
                },
                message: 'VIN phải có 17 ký tự hợp lệ'
            }
        }]
    },

    // Giải pháp
    solution: {
        description: {
            type: String,
            required: true,
            maxlength: 2000
        },
        partsToReplace: [{
            partName: String,
            partNumber: String,
            quantity: Number
        }],
        estimatedTime: {
            type: Number, // phút
            min: 0
        },
        instructions: {
            type: String,
            maxlength: 5000
        },
        specialTools: [String]
    },

    // Nội dung thông báo
    notification: {
        title: {
            type: String,
            required: true,
            maxlength: 200
        },
        message: {
            type: String,
            required: true,
            maxlength: 5000
        },
        urgency: {
            type: String,
            required: true,
            enum: ['immediate', 'urgent', 'normal']
        },
        instructions: {
            type: String,
            maxlength: 2000
        }
    },

    // Lịch trình
    schedule: {
        startDate: {
            type: Date,
            required: true
        },
        endDate: {
            type: Date,
            required: true
        },
        actualStartDate: Date,
        actualEndDate: Date
    },

    // Trạng thái
    status: {
        type: String,
        required: true,
        enum: ['draft', 'scheduled', 'active', 'in_progress', 'completed', 'cancelled', 'closed'],
        default: 'draft'
    },

    // Thống kê
    statistics: {
        totalAffectedVehicles: {
            type: Number,
            default: 0
        },
        totalCompleted: {
            type: Number,
            default: 0
        },
        totalInProgress: {
            type: Number,
            default: 0
        },
        totalPending: {
            type: Number,
            default: 0
        },
        completionRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        }
    },

    // Danh sách xe bị ảnh hưởng
    affectedVehicles: [{
        vin: {
            type: String,
            required: true,
            validate: {
                validator: function (v) {
                    return /^[A-HJ-NPR-Z0-9]{17}$/.test(v);
                },
                message: 'VIN phải có 17 ký tự hợp lệ'
            }
        },
        model: String,
        productionDate: Date,
        serviceCenterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ServiceCenter'
        },
        serviceCenterName: String,
        status: {
            type: String,
            enum: ['pending', 'notified', 'scheduled', 'in_progress', 'completed', 'declined'],
            default: 'pending'
        },
        notifiedAt: Date,
        scheduledDate: Date,
        completedAt: Date,
        notes: String
    }],

    // Audit trail
    createdBy: {
        type: String,
        required: true
    },
    createdByRole: {
        type: String,
        required: true
    },
    publishedBy: String,
    publishedAt: Date,
    cancelledBy: String,
    cancelledAt: Date,
    cancellationReason: String,

    // Metadata
    updatedBy: String
}, {
    timestamps: true,
    collection: 'recallCampaigns'
});

// Indexes cho performance
RecallCampaignSchema.index({ campaignCode: 1 }, { unique: true });
RecallCampaignSchema.index({ status: 1 });
RecallCampaignSchema.index({ campaignType: 1 });
RecallCampaignSchema.index({ severity: 1 });
RecallCampaignSchema.index({ createdAt: -1 });
RecallCampaignSchema.index({ 'schedule.startDate': 1 });
RecallCampaignSchema.index({ 'schedule.endDate': 1 });
RecallCampaignSchema.index({ 'affectedVehicles.vin': 1 });
RecallCampaignSchema.index({ 'affectedVehicles.serviceCenterId': 1 });
RecallCampaignSchema.index({ 'affectedVehicles.status': 1 });

// Virtual fields
RecallCampaignSchema.virtual('isActive').get(function () {
    return ['active', 'in_progress'].includes(this.status);
});

RecallCampaignSchema.virtual('isEditable').get(function () {
    return ['draft', 'scheduled'].includes(this.status);
});

RecallCampaignSchema.virtual('isCancellable').get(function () {
    return ['draft', 'scheduled', 'active'].includes(this.status);
});

RecallCampaignSchema.virtual('daysRemaining').get(function () {
    if (!this.schedule.endDate) return null;
    const now = new Date();
    const endDate = new Date(this.schedule.endDate);
    const diffTime = endDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Static methods
RecallCampaignSchema.statics.generateCampaignCode = async function () {
    const year = new Date().getFullYear();
    const lastCampaign = await this.findOne({
        campaignCode: new RegExp(`^RC-${year}-`)
    }).sort({ campaignCode: -1 });

    const nextNumber = lastCampaign
        ? parseInt(lastCampaign.campaignCode.split('-')[2]) + 1
        : 1;

    return `RC-${year}-${String(nextNumber).padStart(3, '0')}`;
};

RecallCampaignSchema.statics.findAffectedVehicles = async function (criteria) {
    // This will be implemented in VehicleLookupService
    // Placeholder for now
    return [];
};

// Instance methods
RecallCampaignSchema.methods.updateStatistics = function () {
    const vehicles = this.affectedVehicles;
    this.statistics.totalAffectedVehicles = vehicles.length;
    this.statistics.totalCompleted = vehicles.filter(v => v.status === 'completed').length;
    this.statistics.totalInProgress = vehicles.filter(v => v.status === 'in_progress').length;
    this.statistics.totalPending = vehicles.filter(v => v.status === 'pending').length;

    if (this.statistics.totalAffectedVehicles > 0) {
        this.statistics.completionRate = Math.round(
            (this.statistics.totalCompleted / this.statistics.totalAffectedVehicles) * 100
        );
    }
};

RecallCampaignSchema.methods.canTransitionTo = function (newStatus) {
    const validTransitions = {
        'draft': ['scheduled', 'cancelled'],
        'scheduled': ['active', 'cancelled'],
        'active': ['in_progress', 'cancelled'],
        'in_progress': ['completed', 'cancelled'],
        'completed': ['closed'],
        'cancelled': [],
        'closed': []
    };

    return validTransitions[this.status]?.includes(newStatus) || false;
};

// Pre-save middleware
RecallCampaignSchema.pre('save', function (next) {
    // Validate date logic
    if (this.schedule.startDate && this.schedule.endDate) {
        if (this.schedule.startDate >= this.schedule.endDate) {
            return next(new Error('Ngày bắt đầu phải trước ngày kết thúc'));
        }
    }

    // Validate severity and urgency match
    if (this.severity === 'critical' && this.notification.urgency !== 'immediate') {
        return next(new Error('Mức độ nghiêm trọng critical phải có urgency immediate'));
    }

    // Validate VIN ranges (from <= to)
    if (this.affectedCriteria.vinRanges && this.affectedCriteria.vinRanges.length > 0) {
        for (let i = 0; i < this.affectedCriteria.vinRanges.length; i++) {
            const range = this.affectedCriteria.vinRanges[i];
            if (range.from && range.to && range.from > range.to) {
                return next(new Error(`VIN range ${i + 1}: VIN bắt đầu phải nhỏ hơn hoặc bằng VIN kết thúc`));
            }
        }
    }

    // Update statistics
    this.updateStatistics();

    // Set updatedBy
    if (this.isModified() && !this.isNew) {
        this.updatedAt = new Date();
    }

    next();
});

// Apply BaseEntity mixin
Object.assign(RecallCampaignSchema.statics, BaseEntity.statics);
Object.assign(RecallCampaignSchema.methods, BaseEntity.methods);

// Model factory function
const RecallCampaignModel = (connection = null) => {
    if (connection) {
        return connection.model('RecallCampaign', RecallCampaignSchema);
    }

    // Default connection
    const { getWarrantyConnection } = require('../../shared/database/warrantyConnection');
    const warrantyConnection = getWarrantyConnection();
    return warrantyConnection.model('RecallCampaign', RecallCampaignSchema);
};

module.exports = RecallCampaignModel;
