import mongoose from "mongoose";

const VinSchema = new mongoose.Schema(
  {
    vin: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    }, // Mã số VIN đầy đủ (17 ký tự), định danh duy nhất của xe

    wmi: { type: String },
    // World Manufacturer Identifier (3 ký tự đầu)
    // Xác định quốc gia và nhà sản xuất. Ví dụ: "1HG" = Honda (Mỹ)

    vds: { type: String },
    // Vehicle Descriptor Section (ký tự 4–8)
    // Mô tả đặc điểm xe: kiểu thân, loại động cơ, hệ thống phanh, v.v.

    checkDigit: { type: String },
    // Ký tự kiểm tra (vị trí 9)
    // Dùng để xác minh tính hợp lệ của VIN theo chuẩn ISO (ở đây chỉ lưu)

    modelYearCode: { type: String },
    // Mã năm sản xuất (vị trí 10)
    // Ví dụ: "A" = 1980/2010, "B" = 1981/2011 (chu kỳ 30 năm)

    plantCode: { type: String },
    // Mã nhà máy lắp ráp (vị trí 11)
    // Cho biết xe được lắp ráp tại nhà máy nào

    serialNumber: { type: String },
    // Số thứ tự sản xuất (vị trí 12–17)
    // Mỗi xe có một số duy nhất trong dây chuyền sản xuất

    manufacturer: { type: String },
    // Tên hãng sản xuất, ví dụ: Toyota, Honda, Ford

    country: { type: String },
    // Quốc gia sản xuất, ví dụ: Japan, USA, Germany

    modelYear: { type: Number },
    // Năm sản xuất thực tế (giải mã từ modelYearCode hoặc nhập thủ công)
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  status: { type: String, enum: ["unregistered","registered","in_service"], default: "unregistered" },
  },
  {
    timestamps: true,
    // Tự động thêm createdAt và updatedAt
  }
);

const VinModel = mongoose.model("Vin", VinSchema);
export default VinModel;
