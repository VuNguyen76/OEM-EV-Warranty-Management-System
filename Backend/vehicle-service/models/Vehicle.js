// Vehicle.js
import mongoose from "mongoose";
import "../../user-service/models/UserModel.js";
import "../../user-service/models/ServiceCenterModel.js";
import "../../user-service/models/TechnicianModel.js";
import "../models/Vin.js";
const VehicleSchema = new mongoose.Schema(
  {
    vin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vin",
      required: true,
      unique: true,
    },
    // Liên kết đến bảng Vin — mỗi xe ứng với một VIN duy nhất

    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    // Khách hàng sở hữu xe này (có thể null nếu chưa đăng ký)

    center_id: {
      type: String,
      default: null,
    },
    // Trung tâm bảo hành quản lý xe (gán khi xe được đăng ký)

    registration_number: {
      type: String,
      trim: true,
    },
    // Biển số xe (có thể cập nhật sau khi khách hàng đăng ký xe)

    model: { type: String },
    color: { type: String },

    warranty_start: {
      type: Date,
      default: () => new Date(), // luôn lấy thời điểm thực tế
    },
    warranty_end: {
      type: Date,
      default: function () {
        const start = this.warranty_start
          ? new Date(this.warranty_start)
          : new Date();
        const end = new Date(start);
        end.setFullYear(end.getFullYear() + 1);
        return end;
      },
    },
    // Khoảng thời gian bảo hành

    current_mileage: { type: Number, default: 0 },
    // Số km đã đi (cập nhật trong các lần bảo hành)

    kilometer: { type: Number, default: 0 },
    // Số km hiện tại (cập nhật khi khách hàng báo cáo)
    service_history: [
      {
        service_date: Date,
        description: String,
        cost: Number,
      },
    ],
    // Lịch sử bảo hành / sửa chữa (nếu có)
    parts: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ["active", "inactive", "warranty_expired"],
      default: "active",
    },
  },
  { timestamps: true }
);

const VehicleModel =
  mongoose.models.Vehicle || mongoose.model("Vehicle", VehicleSchema);

export default VehicleModel;
