import mongoose from "mongoose";

const { Schema, model } = mongoose;

const customerSchema = new Schema(
  {
    full_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9]{10,11}$/, "Số điện thoại không hợp lệ"],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Email không hợp lệ",
      ],
    },
    address: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    person_id: {
      type: String,
      trim: true,
      match: [/^[0-9]{9,12}$/, "Số CCCD/CMND không hợp lệ"],
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      lowercase: true,
    },
    vehicles: [String],
  },
  {
    timestamps: true,
  }
);

// Index cho tìm kiếm nhanh
customerSchema.index({ phone: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ person_id: 1 });

const Customer = model("Customer", customerSchema);

export default Customer;
