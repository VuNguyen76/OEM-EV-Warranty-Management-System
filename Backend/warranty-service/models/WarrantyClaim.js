import mongoose from "mongoose";

const { Schema, model } = mongoose;

const warrantyClaimSchema = new Schema(
  {
    claim_code: {
      type: String,
      required: true,
      trim: true,
    },
    vehicle: {
      type: Object,
      default: null,
    },
    vin: {
      type: String,
      required: true,
      trim: true,
      minlength: 17,
      maxlength: 17,
    },
    parts: [
      {
        part_id: {
          type: String,
          required: true,
          trim: true,
        },
        part_serial: {
          type: String,
          required: true,
          trim: true,
        },
        part_name: {
          type: String,
          trim: true,
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
      },
    ],
    policy_id: {
      type: Schema.Types.ObjectId,
      ref: "WarrantyPolicy",
    },
    issue_description: {
      type: String,
      required: true,
      trim: true,
    },
    images: [
      {
        filename: {
          type: String,
          required: true,
        },
        path: {
          type: String,
          required: true,
        },
        uploaded_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    service_center_id: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    technician_id: {
      type: Schema.Types.ObjectId,
    },
    submitted_by: {
      type: Schema.Types.ObjectId,
    },
   
    status: {
      type: String,
      enum: ["submitted", "under_review", "approved", "rejected", "completed"],
      default: "submitted",
      required: true,
    },
    resolution_comment: {
      type: String,
      trim: true,
    },
    estimated_cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    actual_cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    repair_order_id: {
      type: Schema.Types.ObjectId,
      ref: "RepairOrder",
    },
    reviewed_by: {
      type: Schema.Types.ObjectId,
    },
    reviewed_at: {
      type: Date,
    },
    submitted_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index cho tìm kiếm nhanh
warrantyClaimSchema.index({ claim_code: 1 }, { unique: true });
warrantyClaimSchema.index({ vin: 1 });
warrantyClaimSchema.index({ service_center_id: 1 });
warrantyClaimSchema.index({ status: 1 });

// Auto-generate claim_code trước khi validate
warrantyClaimSchema.pre("validate", function (next) {
  if (!this.claim_code) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.claim_code = `WC-${timestamp}-${random}`;
  }
  next();
});

const WarrantyClaim = model("WarrantyClaim", warrantyClaimSchema);

export default WarrantyClaim;
