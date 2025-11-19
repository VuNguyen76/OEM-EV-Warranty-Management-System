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
        part_catalog_id: {
          type: Schema.Types.ObjectId,
          ref: "PartCatalog",
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
        is_eligible: {
          type: Boolean,
        },
        cost: {
          type: Number,
          default: 0,
        },
        reason: {
          type: String,
          trim: true,
        },
        warranty_type: {
          type: String,
          enum: ["warranty", "customer_pay"],
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
    center_id: {
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
      enum: [
        "submitted",
        "waiting_customer",
        "confirmed",
        "rejected",
        "in_repair",
        "completed",
      ],
      default: "submitted",
      required: true,
    },
    customer_confirmation: {
      confirmed: { type: Boolean, default: null }, 
      responded_at: { type: Date },
    },
    resolution_comment: {
      type: String,
      trim: true,
    },

    summary: {
      total_warranty_amount: { type: Number, default: 0 },
      total_customer_amount: { type: Number, default: 0 },
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
warrantyClaimSchema.pre("validate", async function (next) {
  if (!this.claim_code) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const count = await mongoose.model("WarrantyClaim").countDocuments();
    this.claim_code = `WC-${timestamp}-${count}`;
  }
  next();
});

const WarrantyClaim = model("WarrantyClaim", warrantyClaimSchema);

export default WarrantyClaim;
