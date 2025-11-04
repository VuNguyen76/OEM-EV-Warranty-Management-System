import PartCatalog from "../models/PartCatalog.js";
import CreatePartCatalogDto from "../models/dto/request/CreatePartCatalogDto.js";
import UpdatePartCatalogDto from "../models/dto/request/UpdatePartCatalogDto.js";
import PartCatalogResponseDto from "../models/dto/response/PartCatalogResponse.js";

class PartCatalogController {
  static async createCatalog(req, res) {
    try {
      const createDto = new CreatePartCatalogDto(req.body);
      const validation = createDto.validate();
      if (!validation.isValid)
        return res
          .status(400)
          .json({ success: false, message: "Dữ liệu không hợp lệ" });

      const catalog = new PartCatalog(createDto.toModel());
      await catalog.save();
      res.status(201).json({
        success: true,
        message: "Tạo mẫu phụ tùng thành công",
        data: new PartCatalogResponseDto(catalog),
      });
    } catch (error) {
      res
        .status(500)
        .json({
          success: false,
          message: "Lỗi tạo mẫu phụ tùng",
          error: error.message,
        });
    }
  }

  static async getAll(req, res) {
    try {
      const { category } = req.query;
      const filter = {};
      if (category) filter.category = category;

      const catalogs = await PartCatalog.find(filter).sort({ name: 1 });
      res.json({ success: true, data: catalogs });
    } catch (error) {
      res
        .status(500)
        .json({
          success: false,
          message: "Lỗi lấy danh sách mẫu phụ tùng",
          error: error.message,
        });
    }
  }
}

export default PartCatalogController;
