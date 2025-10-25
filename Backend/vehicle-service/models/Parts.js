import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const partsSchema = new Schema({
    part_id: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    part_name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    category: {
        type: String,
        enum: ['battery', 'motor', 'bms', 'charger', 'inverter', 'other'],
        required: true
    },
    manufacturer: {
        type: String,
        trim: true,
        maxlength: 100
    },
    model_number: {
        type: String,
        trim: true,
        maxlength: 100
    },
    specifications: {
        type: Schema.Types.Mixed
    },
    unit_price: {
        type: Number,
        default: 0
    },
    warranty_duration_months: {
        type: Number,
        default: 12
    },
    description: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['active', 'discontinued', 'out_of_stock'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Index cho tìm kiếm nhanh
partsSchema.index({ part_id: 1 }, { unique: true });
partsSchema.index({ category: 1 });
partsSchema.index({ manufacturer: 1 });
partsSchema.index({ status: 1 });

const Parts = model('Parts', partsSchema);

export default Parts;
