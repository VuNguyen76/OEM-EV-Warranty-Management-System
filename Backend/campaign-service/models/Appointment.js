import mongoose from "mongoose";
const { Schema } = mongoose;

const AppointmentSchema = new Schema(
  {
    campaign_vehicle_id: {
      type: Schema.Types.ObjectId,
      ref: "CampaignVehicle",
      required: true,
    },
    service_center_id: {
      type: Schema.Types.ObjectId,
    },
    start_time: {
      type: Date,
    },
    end_time: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "cancelled"],
      default: "scheduled",
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const ServiceAppointment = mongoose.model(
  "ServiceAppointment",
  AppointmentSchema
);

export default ServiceAppointment;
