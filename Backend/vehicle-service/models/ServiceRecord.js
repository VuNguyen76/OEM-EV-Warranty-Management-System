import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const serviceRecordSchema = new Schema({
    vin: {
        type: String,
        required: true,
        ref: 'Vehicle'
    },
    service_center_id: {
        type: Schema.Types.ObjectId,
        required: true
    },
    technician_id: {
        type: Schema.Types.ObjectId
    },
    service_type: {
        type: String,
        enum: ['warranty', 'maintenance', 'recall', 'repair'],
        required: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    date_in: {
        type: Date,
        required: true
    },
    date_out: {
        type: Date,
        required: true
    },
    duration_days: {
        type: Number
    },
    cost: {
        type: Number,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'cancelled'],
        default: 'pending',
        required: true
    },
    attachments: [{
        type: String
    }]
}, {
    timestamps: true
});

// Custom validator cho date range
serviceRecordSchema.pre('validate', function (next) {
    if (this.date_out && this.date_in && this.date_out <= this.date_in) {
        next(new Error('date_out phải sau date_in'));
    }
    next();
});

// Index cho tìm kiếm nhanh
serviceRecordSchema.index({ vin: 1 });
serviceRecordSchema.index({ service_center_id: 1 });
serviceRecordSchema.index({ status: 1 });

const ServiceRecord = model('ServiceRecord', serviceRecordSchema);

export default ServiceRecord;