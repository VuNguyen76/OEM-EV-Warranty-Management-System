import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,

      default: "sc_staff",
    },
    center_id: {
      type: Schema.Types.ObjectId,
      ref: "ServiceCenter",
      required: true,
    },
    status: {
      type: String,

      default: "active",
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
