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
    },
    serial_number: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    part_name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: ['battery', 'motor', 'bms', 'charger', 'inverter'],
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
        type: String,
        trim: true
    },
    failure_reason: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Index cho tìm kiếm nhanh (serial_number đã có unique index)
partsAttachedSchema.index({ vin: 1 });
partsAttachedSchema.index({ part_id: 1 });

const PartsAttached = model('PartsAttached', partsAttachedSchema);

export default PartsAttached;