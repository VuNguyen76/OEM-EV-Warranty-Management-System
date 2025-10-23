import { mongoose } from "mongoose";

const serviceCenterSchema = new mongoose.Schema(
  {
    center_id: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Email không hợp lệ",
      ],
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "inactive"],
    },
  },
  { timestamps: true }
);

const serviceCenterModel =
  mongoose.models.serviceCenter ||
  mongoose.model("ServiceCenter", serviceCenterSchema);
export default serviceCenterModel;
