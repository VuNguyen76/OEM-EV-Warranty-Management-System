import mongoose from "mongoose";

const technicianSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    center_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceCenter",
      required: true,
    },
    status: {
      type: String,
      required: true,
      default: "active",
    },
    workload: Number,
    skills: [String],
    name: String,
    phone: String,
  },
  { timestamps: true }
);

const technician =
  mongoose.models.Technician || mongoose.model("Technician", technicianSchema);

export default technician;
