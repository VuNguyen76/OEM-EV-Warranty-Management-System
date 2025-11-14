import mongoose from "mongoose";
import PartCatalog from "./PartCatalog.js";

const { Schema, model } = mongoose;

const partInstanceSchema = new Schema(
  {
    serial_number: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    part_catalog_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartCatalog",
      required: true,
    },
    vehicle_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    install_date: { type: Date },
    warranty_end: { type: Date },
    status: {
      type: String,
      enum: ["active", "replaced", "defective"],
      default: "active",
    },
  },
  { timestamps: true }
);

partInstanceSchema.pre("validate", async function (next) {
  try {
    // Nếu chưa có ngày lắp đặt => dùng thời điểm hiện tại
    if (!this.install_date) {
      this.install_date = new Date();
    }

    // Nếu chưa có hạn bảo hành => cộng thêm 1 năm từ install_date
    if (!this.warranty_end) {
      const warrantyDate = new Date(this.install_date);
      warrantyDate.setFullYear(warrantyDate.getFullYear() + 1);
      this.warranty_end = warrantyDate;
    }

    // Nếu đã có serial_number thì bỏ qua bước tạo
    if (!this.serial_number) {
      const catalog = await mongoose
        .model("PartCatalog")
        .findById(this.part_catalog_id)
        .lean();
      if (!catalog) throw new Error("Không tìm thấy PartCatalog liên kết.");

      const prefixMap = {
        battery: "BAT",
        motor: "MOT",
        bms: "BMS",
        charger: "CHR",
        inverter: "INV",
        sensor: "SNS",
      };
      const prefix = prefixMap[catalog.category] || "GEN";

      const count = await mongoose
        .model("PartInstance")
        .countDocuments({ part_catalog_id: this.part_catalog_id });

      this.serial_number = `${prefix}-${(count + 1)
        .toString()
        .padStart(5, "0")}`;
    }

    next();
  } catch (err) {
    next(err);
  }
});

// Index nhanh theo serial_number
partInstanceSchema.index({ serial_number: 1 }, { unique: true });

const PartInstance = model("PartInstance", partInstanceSchema);
export default PartInstance;
