import mongoose from "mongoose";const { Schema } = mongoose;

const CampaignVehicleSchema = new Schema(
  {
    campaign_id: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },

    vin: {
      type: String,
      required: true,
      index: true,
    },

    model: {
      type: String,
      required: true,
    },

    affected_parts: {
      type: [String], // mã phụ tùng/lô phụ tùng bị lỗi
      default: [],
    },

    customer_id: {
      type: Schema.Types.ObjectId,
      
    },

    service_center_id: {
      type: Schema.Types.ObjectId,
    },

    status: {
      type: String,
      enum: [
        "created", // đã tạo nhưng chưa thông báo
        "notified", // đã gửi thông báo đến khách
        "in_progress", // sedang xử lý tại SC
        "completed", // đã hoàn tất xử lý recall/service
        "cancelled", // huỷ
      ],
      default: "created",
      index: true,
    },

    notified_at: {
      type: Date,
    },

    scheduled_date: {
      type: Date,
    },

    completed_at: {
      type: Date,
    },

    updated_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const CampaignVehicle = mongoose.model("CampaignVehicle", CampaignVehicleSchema);
export default CampaignVehicle;