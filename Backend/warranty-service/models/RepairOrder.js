import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const repairOrderSchema = new Schema({
    order_code: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    claim_id: {
        type: Schema.Types.ObjectId,
        ref: 'WarrantyClaim',
        required: true
    },
    part_id: {
        type: String,
        ref: 'Parts'
    },
    repair_description: {
        type: String,
        trim: true
    },
    start_date: {
        type: Date,
        required: true,
        default: Date.now
    },
    end_date: {
        type: Date
    },
    status: {
        type: String,
        enum: ['waiting_parts', 'in_progress', 'completed', 'cancelled'],
        default: 'waiting_parts',
        required: true
    },
    completion_report: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Indexes
repairOrderSchema.index({ order_code: 1 }, { unique: true });
repairOrderSchema.index({ claim_id: 1 });
repairOrderSchema.index({ status: 1 });

// Auto-generate order_code
repairOrderSchema.pre('validate', function (next) {
    if (!this.order_code) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.order_code = `RO-${timestamp}-${random}`;
    }
    next();
});

const RepairOrder = model('RepairOrder', repairOrderSchema);

export default RepairOrder;
