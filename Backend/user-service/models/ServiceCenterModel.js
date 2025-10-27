import { mongoose } from "mongoose";

const serviceCenterSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    center_id: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
    },
    address: {
      type: String,
    },
    status: {
      type: String,
      required: true,
      default: "active",
    },
  },
  { timestamps: true }
);

// Mục tiêu: Tự động sinh center_id: SC0, SC1, SC2,...
// Hàm pre sẽ chạy trước khi model được lưu vào db
serviceCenterSchema.pre("validate", async function (next) {
  if (this.center_id) return next(); // nếu đã có sẵn thì bỏ qua

  try {
    const count = await mongoose.model("ServiceCenter").countDocuments();
    this.center_id = `SC${count}`;
    next();
  } catch (err) {
    next(err);
  }
});

const serviceCenterModel =
  mongoose.models.serviceCenter ||
  mongoose.model("ServiceCenter", serviceCenterSchema);
export default serviceCenterModel;
