import Part from "../models/PartInstance.js";
import PartCatalog from "../models/PartCatalog.js";
import CreatePartDto from "../models/dto/request/CreatePartDto.js";
import PartResponseDto from "../models/dto/response/PartResponse.js";

class PartController {
  // POST /api/parts
  static async createPart(req, res) {
    try {
      const createDto = new CreatePartDto(req.body);
      const validation = createDto.validate();
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: validation.newErrors,
        });
      }

      // Kiểm tra catalog tồn tại
      const catalog = await PartCatalog.findById(createDto.part_catalog_id);
      if (!catalog) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy mẫu phụ tùng (PartCatalog)",
        });
      }

      // Tạo part thật
      const part = new Part(createDto.toModel());
      await part.save();

      const responseDto = new PartResponseDto(part);
      res.status(201).json({
        success: true,
        message: "Tạo phụ tùng thành công",
        data: responseDto,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi tạo phụ tùng",
        error: error.message,
      });
    }
  }

  // GET /api/parts
  static async getParts(req, res) {
    try {
      const { status, vehicle_id } = req.query;
      const filter = {};
      if (status) filter.status = status;
      if (vehicle_id) filter.vehicle_id = vehicle_id;

      const parts = await Part.find(filter)
        .populate("part_catalog_id", "name category manufacturer cost_price")
        .sort({ createdAt: -1 });

      const responseData = parts.map((p) => new PartResponseDto(p));
      res.json({
        success: true,
        data: responseData,
        count: responseData.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi lấy danh sách phụ tùng",
        error: error.message,
      });
    }
  }

  // GET /api/parts/:serial
  static async getPartBySerial(req, res) {
    try {
      const { serial } = req.params;
      console.log(serial);

      const part = await Part.findOne({ serial_number: serial }).populate(
        "part_catalog_id",
        "name manufacturer cost_price weight_kg"
      );
      console.log(part);

      if (!part)
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy phụ tùng" });

      res.json({ success: true, data: new PartResponseDto(part) });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi lấy thông tin phụ tùng",
        error: error.message,
      });
    }
  }
  static async getPartsByVehicle(req, res) {
    try {
      const { vehicle_id } = req.params;

      // Tìm toàn bộ phụ tùng theo vehicle_id
      const parts = await Part.find({ vehicle_id }).populate(
        "part_catalog_id",
        " name category manufacturer cost_price weight_kg"
      );

      // Map DTO
      const responseData = parts.map((p) => new PartResponseDto(p));

      res.json({
        success: true,
        count: responseData.length,
        data: responseData,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi lấy thông tin phụ tùng",
        error: error.message,
      });
    }
  }
}

export default PartController;
