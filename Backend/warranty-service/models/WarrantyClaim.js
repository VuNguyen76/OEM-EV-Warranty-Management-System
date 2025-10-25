import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const warrantyClaimSchema = new Schema({
    claim_code: {
        type: String,
        required: true,
        trim: true
    },
    vin: {
        type: String,
        required: true,
        trim: true
    },
    part_serial: {
        type: String,
        required: true,
        trim: true
    },
    policy_id: {
        type: Schema.Types.ObjectId,
        ref: 'WarrantyPolicy'
    },
    issue_description: {
        type: String,
        required: true,
        trim: true
    },
    diagnostic_report_url: {
        type: String,
        trim: true
    },
    service_center_id: {
        type: Schema.Types.ObjectId,
        required: true
    },
    technician_id: {
        type: Schema.Types.ObjectId
    },
    submitted_by: {
        type: Schema.Types.ObjectId,
        required: true
    },
    submitted_at: {
        type: Date,
        required: true,
        default: Date.now
    },
    reviewed_by: {
        type: Schema.Types.ObjectId
    },
    reviewed_at: {
        type: Date
    },
    status: {
        type: String,
        enum: ['submitted', 'under_review', 'approved', 'rejected', 'completed'],
        default: 'submitted',
        required: true
    },
    resolution_comment: {
        type: String,
        trim: true
    },
    estimated_cost: {
        type: Number,
        default: 0
    },
    actual_cost: {
        type: Number,
        default: 0
    },
    repair_order_id: {
        type: Schema.Types.ObjectId
    },
    attachments: [{
        type: String
    }]
}, {
    timestamps: true
});

// Index cho tìm kiếm nhanh
warrantyClaimSchema.index({ claim_code: 1 }, { unique: true });
warrantyClaimSchema.index({ vin: 1 });
warrantyClaimSchema.index({ service_center_id: 1 });
warrantyClaimSchema.index({ status: 1 });

// Auto-generate claim_code trước khi validate
warrantyClaimSchema.pre('validate', function (next) {
    if (!this.claim_code) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.claim_code = `WC-${timestamp}-${random}`;
    }
    next();
});

const WarrantyClaim = model('WarrantyClaim', warrantyClaimSchema);

export default WarrantyClaim;