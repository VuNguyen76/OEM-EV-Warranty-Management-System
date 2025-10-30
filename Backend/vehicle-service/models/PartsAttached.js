import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const partsAttachedSchema = new Schema({
    vin: {
        type: String,
        required: true,
        ref: 'Vehicle'
    },
    part_id: {
        type: String,
        required: true
        // Reference to Part Service (cross-service, no populate)
    },
    serial_number: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    install_date: {
        type: Date,
        required: true
    },
    remove_date: {
        type: Date
    },
    status: {
        type: String,
        enum: ['active', 'replaced', 'faulty'],
        default: 'active',
        required: true
    },
    warranty_policy_id: {
        type: Schema.Types.ObjectId,
        ref: 'WarrantyPolicy'
    },
    failure_reason: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Custom validator cho date range
partsAttachedSchema.pre('validate', function (next) {
    if (this.remove_date && this.install_date && this.remove_date <= this.install_date) {
        next(new Error('remove_date phải sau install_date'));
    }
    next();
});

// Index cho tìm kiếm nhanh (serial_number đã có unique index)
partsAttachedSchema.index({ vin: 1 });
partsAttachedSchema.index({ part_id: 1 });

const PartsAttached = model('PartsAttached', partsAttachedSchema);

export default PartsAttached;