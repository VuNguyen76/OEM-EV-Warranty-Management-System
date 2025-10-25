import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const warrantyCostsSchema = new Schema({
    claim_id: {
        type: Schema.Types.ObjectId,
        ref: 'WarrantyClaim',
        required: true,
        unique: true
    },
    part_cost: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    labor_cost: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    transport_cost: {
        type: Number,
        default: 0,
        min: 0
    },
    other_costs: {
        type: Number,
        default: 0,
        min: 0
    },
    notes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Virtual field cho total_cost (tính toán, không lưu DB)
warrantyCostsSchema.virtual('total_cost').get(function () {
    return this.part_cost + this.labor_cost + this.transport_cost + this.other_costs;
});

// Đảm bảo virtual fields được include trong JSON
warrantyCostsSchema.set('toJSON', { virtuals: true });
warrantyCostsSchema.set('toObject', { virtuals: true });

// Index
warrantyCostsSchema.index({ claim_id: 1 }, { unique: true });

// Pre-save hook để tự động cập nhật claim.actual_cost
warrantyCostsSchema.pre('save', async function (next) {
    if (this.isModified('part_cost') || this.isModified('labor_cost') ||
        this.isModified('transport_cost') || this.isModified('other_costs')) {

        const total = this.part_cost + this.labor_cost + this.transport_cost + this.other_costs;

        // Cập nhật actual_cost của claim
        await model('WarrantyClaim').findByIdAndUpdate(
            this.claim_id,
            { actual_cost: total }
        );
    }
    next();
});

// Post-findOneAndUpdate hook để cập nhật claim khi dùng findOneAndUpdate
warrantyCostsSchema.post('findOneAndUpdate', async function (doc) {
    if (doc) {
        const total = doc.part_cost + doc.labor_cost + doc.transport_cost + doc.other_costs;
        await model('WarrantyClaim').findByIdAndUpdate(
            doc.claim_id,
            { actual_cost: total }
        );
    }
});

const WarrantyCosts = model('WarrantyCosts', warrantyCostsSchema);

export default WarrantyCosts;
