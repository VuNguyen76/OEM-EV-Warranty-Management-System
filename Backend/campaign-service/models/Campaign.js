import mongoose from "mongoose";

const CampaignSchema = new mongoose.Schema(
  {
    campaign_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    affected_parts: {
      type: [String], // mã phụ tùng/lô phụ tùng bị lỗi
      default: [],
    },

    start_date: {
      type: Date,
      default: Date.now,
    },

    end_date: {
      type: Date,
      default: Date.now,
    },

    total_vehicles: {
      type: Number,
      default: 0, // tổng số xe bị ảnh hưởng
    },

    completed_vehicles: {
      type: Number,
      default: 0, // số xe đã hoàn thành chiến dịch
    },

    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
      index: true,
    },

    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

CampaignSchema.pre("validate", async function (next) {
  if (this.campaign_code) return next(); // nếu đã có sẵn thì bỏ qua

  try {
    const count = await mongoose.model("Campaign").countDocuments();
    const timestamp = Date.now().toString(36).toUpperCase();
    this.campaign_code = `RC-${timestamp}-${count}`;
    next();
  } catch (err) {
    next(err);
  }
});

const CampaignModel = mongoose.model("Campaign", CampaignSchema);
export default CampaignModel;
