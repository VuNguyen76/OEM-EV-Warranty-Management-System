import { mongoose } from "mongoose";

const serviceCenterSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    center_code: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
    },
    address: {
      type: String,
    },
    claims: {
      type: Number,
      default: 0,
    },
    staffs: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      required: true,
      default: "active",
    },
  },
  { timestamps: true }
);

// Mục tiêu: Tự động sinh center_code: SC0, SC1, SC2,...
// Hàm pre sẽ chạy trước khi model được lưu vào db
serviceCenterSchema.pre("validate", async function (next) {
  if (this.center_code) return next(); // nếu đã có sẵn thì bỏ qua

  try {
    const timestamp = Date.now().toString(36).toUpperCase();
    const count = await mongoose.model("ServiceCenter").countDocuments();
    this.center_code = `WC-${timestamp}-${count}`;

    next();
  } catch (err) {
    next(err);
  }
});

const serviceCenterModel =
  mongoose.models.serviceCenter ||
  mongoose.model("ServiceCenter", serviceCenterSchema);
export default serviceCenterModel;
