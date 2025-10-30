import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    center_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceCenter",
      default: null,
    },
    role: {
      type: String,
      required: true,
      default: "sc_staff",
    },
    status: {
      type: String,
      default: "inactive",
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
