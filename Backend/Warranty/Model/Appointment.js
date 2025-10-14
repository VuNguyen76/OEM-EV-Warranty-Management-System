const mongoose = require('mongoose');
const { getWarrantyConnection } = require('../../shared/database/warrantyConnection');

/**
 * UC15: Appointment Model
 * Quản lý lịch hẹn cho các chiến dịch recall
 */
const appointmentSchema = new mongoose.Schema({
    // Liên kết với recall campaign
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RecallCampaign',
        required: true,
        index: true
    },
    campaignCode: {
        type: String,
        required: true,
        trim: true
    },
    campaignName: {
        type: String,
        required: true,
        trim: true
    },

    // Thông tin xe và khách hàng
    vin: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^[A-HJ-NPR-Z0-9]{17}$/.test(v);
            },
            message: 'VIN phải có 17 ký tự hợp lệ'
        },
        index: true
    },
    vehicleModel: String,
    customerName: {
        type: String,
        required: true,
        trim: true
    },
    customerPhone: {
        type: String,
        required: true,
        trim: true
    },
    customerEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    customerAddress: String,

    // Thông tin lịch hẹn
    appointmentDate: {
        type: Date,
        required: true,
        index: true
    },
    timeSlot: {
        startTime: {
            type: String,
            required: true,
            validate: {
                validator: function (v) {
                    return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
                },
                message: 'Thời gian phải có định dạng HH:MM'
            }
        },
        endTime: {
            type: String,
            required: true,
            validate: {
                validator: function (v) {
                    return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
                },
                message: 'Thời gian phải có định dạng HH:MM'
            }
        },
        duration: {
            type: Number,
            required: true,
            min: 30,
            max: 480 // 8 hours max
        }
    },

    // Thông tin service center
    serviceCenterId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    serviceCenterName: {
        type: String,
        required: true,
        trim: true
    },
    serviceCenterCode: String,

    // Thông tin kỹ thuật viên
    assignedTechnician: {
        technicianId: String,
        technicianName: String,
        technicianEmail: String,
        technicianPhone: String
    },

    // Trạng thái
    status: {
        type: String,
        enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'],
        default: 'scheduled',
        index: true
    },

    // Ghi chú
    notes: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    customerNotes: {
        type: String,
        trim: true,
        maxlength: 500
    },
    internalNotes: {
        type: String,
        trim: true,
        maxlength: 1000
    },

    // Thông tin xác nhận
    confirmedAt: Date,
    confirmedBy: String,

    // Thông tin hoàn thành
    completedAt: Date,
    completedBy: String,

    // Thông tin hủy/đổi lịch
    cancelledAt: Date,
    cancelledBy: String,
    cancellationReason: String,
    rescheduledFrom: {
        originalDate: Date,
        originalTimeSlot: {
            startTime: String,
            endTime: String
        },
        reason: String
    },

    // Thông tin nhắc nhở
    reminderSent: {
        type: Boolean,
        default: false
    },
    reminderSentAt: Date,

    // Audit trail
    createdBy: {
        type: String,
        required: true,
        trim: true
    },
    createdByRole: {
        type: String,
        required: true,
        enum: ['service_staff', 'admin', 'technician']
    },
    updatedBy: String

}, {
    timestamps: true,
    collection: 'appointments'
});

// Indexes cho performance
appointmentSchema.index({ serviceCenterId: 1, appointmentDate: 1 });
appointmentSchema.index({ campaignId: 1, status: 1 });
appointmentSchema.index({ customerEmail: 1 });
appointmentSchema.index({ 'assignedTechnician.technicianId': 1 });
appointmentSchema.index({ createdAt: -1 });

// Virtual fields
appointmentSchema.virtual('isUpcoming').get(function () {
    return this.appointmentDate > new Date() && ['scheduled', 'confirmed'].includes(this.status);
});

appointmentSchema.virtual('isPast').get(function () {
    return this.appointmentDate < new Date();
});

appointmentSchema.virtual('duration').get(function () {
    return this.timeSlot.duration;
});

// Instance methods
appointmentSchema.methods.canBeCancelled = function () {
    return ['scheduled', 'confirmed'].includes(this.status) && this.appointmentDate > new Date();
};

appointmentSchema.methods.canBeRescheduled = function () {
    return ['scheduled', 'confirmed'].includes(this.status) && this.appointmentDate > new Date();
};

appointmentSchema.methods.markAsConfirmed = function (confirmedBy) {
    this.status = 'confirmed';
    this.confirmedAt = new Date();
    this.confirmedBy = confirmedBy;
    this.updatedBy = confirmedBy;
};

appointmentSchema.methods.markAsCompleted = function (completedBy) {
    this.status = 'completed';
    this.completedAt = new Date();
    this.completedBy = completedBy;
    this.updatedBy = completedBy;
};

appointmentSchema.methods.cancel = function (cancelledBy, reason) {
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.cancelledBy = cancelledBy;
    this.cancellationReason = reason;
    this.updatedBy = cancelledBy;
};

// Static methods
appointmentSchema.statics.findByServiceCenter = function (serviceCenterId, options = {}) {
    const query = { serviceCenterId };

    if (options.status) {
        query.status = options.status;
    }

    if (options.date) {
        const startOfDay = new Date(options.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(options.date);
        endOfDay.setHours(23, 59, 59, 999);

        query.appointmentDate = {
            $gte: startOfDay,
            $lte: endOfDay
        };
    }

    return this.find(query).sort({ appointmentDate: 1, 'timeSlot.startTime': 1 });
};

appointmentSchema.statics.findByCampaign = function (campaignId, options = {}) {
    const query = { campaignId };

    if (options.status) {
        query.status = options.status;
    }

    // FIXED: Add .lean() for better performance
    return this.find(query)
        .sort({ appointmentDate: 1, 'timeSlot.startTime': 1 })
        .lean();
};

appointmentSchema.statics.findUpcoming = function (serviceCenterId, days = 7) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    // FIXED: Add .lean() for better performance
    return this.find({
        serviceCenterId,
        appointmentDate: { $gte: now, $lte: futureDate },
        status: { $in: ['scheduled', 'confirmed'] }
    })
        .sort({ appointmentDate: 1, 'timeSlot.startTime': 1 })
        .lean();
};

// Pre-save middleware
appointmentSchema.pre('save', function (next) {
    // Validate time slot logic
    if (this.timeSlot.startTime && this.timeSlot.endTime) {
        const [startHour, startMin] = this.timeSlot.startTime.split(':').map(Number);
        const [endHour, endMin] = this.timeSlot.endTime.split(':').map(Number);

        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        if (startMinutes >= endMinutes) {
            return next(new Error('Thời gian bắt đầu phải trước thời gian kết thúc'));
        }

        const calculatedDuration = endMinutes - startMinutes;
        if (Math.abs(this.timeSlot.duration - calculatedDuration) > 5) {
            this.timeSlot.duration = calculatedDuration;
        }
    }

    // Validate appointment date is in the future for new appointments
    if (this.isNew && this.appointmentDate <= new Date()) {
        return next(new Error('Ngày hẹn phải trong tương lai'));
    }

    next();
});

// Sử dụng pattern Model Factory
const { createModelFactory } = require('../../shared/Base/ModelFactory');

module.exports = createModelFactory(
    getWarrantyConnection,
    'Appointment',
    appointmentSchema,
    {
        addServiceCenterIndexes: true
    }
);
