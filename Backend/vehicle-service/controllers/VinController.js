import VinModel from "../models/Vin.js";

const isValidVIN = (vin) => {
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
  return vinRegex.test(vin);
};

class VinController {
  // [GET] /api/vins
  static async getAll(req, res) {
    try {
      const vins = await VinModel.find({ status: "inactive" }).sort({
        createdAt: -1,
      });
      res.status(200).json({
        success: true,
        message: "Lấy danh sách VIN thành công",
        data: vins,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // [GET] /api/vins/:id
  static async getById(req, res) {
    try {
      const vin = await VinModel.findById(req.params.id);
      if (!vin)
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy VIN" });

      res.status(200).json({ success: true, data: vin });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // [POST] /api/vins
  static async create(req, res) {
    try {
      const {
        vin,
        wmi,
        vds,
        checkDigit,
        modelYearCode,
        plantCode,
        serialNumber,
        manufacturer,
        country,
        modelYear,
      } = req.body;

      // --- Validate VIN ---
      if (!vin || !isValidVIN(vin)) {
        return res.status(400).json({
          success: false,
          message: "VIN không hợp lệ (phải đủ 17 ký tự, không chứa I/O/Q)",
        });
      }

      // --- Kiểm tra trùng VIN ---
      const exists = await VinModel.findOne({ vin });
      if (exists)
        return res
          .status(409)
          .json({ success: false, message: "VIN đã tồn tại trong hệ thống" });

      // --- Tạo mới ---
      const newVin = await VinModel.create({
        vin,
        wmi,
        vds,
        checkDigit,
        modelYearCode,
        plantCode,
        serialNumber,
        manufacturer,
        country,
        modelYear,
      });

      res.status(201).json({
        success: true,
        message: "Tạo VIN thành công",
        data: newVin,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // [PUT] /api/vins/:id
  static async update(req, res) {
    try {
      const vin = await VinModel.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!vin)
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy VIN để cập nhật" });

      res
        .status(200)
        .json({ success: true, message: "Cập nhật thành công", data: vin });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // [DELETE] /api/vins/:id
  static async delete(req, res) {
    try {
      const vin = await VinModel.findByIdAndDelete(req.params.id);
      if (!vin)
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy VIN để xóa" });

      res
        .status(200)
        .json({ success: true, message: "Xóa VIN thành công", data: vin });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default VinController;
