import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const warrantyPolicySchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    model_applicable: [{
        type: String,
        trim: true
    }],
    part_category: {
        type: String,
        required: true,
        enum: ['battery', 'motor', 'bms', 'charger', 'inverter', 'sensor']
    },
    duration_months: {
        type: Number,
        required: true,
        min: 1
    },
    max_mileage: {
        type: Number,
        min: 0
    },
    conditions: [{
        type: String,
        trim: true
    }],
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: 'active',
        required: true
    }
}, {
    timestamps: true
});

// Index cho tìm kiếm nhanh
warrantyPolicySchema.index({ part_category: 1 });
warrantyPolicySchema.index({ status: 1 });

const WarrantyPolicy = model('WarrantyPolicy', warrantyPolicySchema);

export default WarrantyPolicy;