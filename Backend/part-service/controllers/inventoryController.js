import Inventory from "../models/Inventory.js";
import CreateInventoryDto from "../models/dto/request/CreateInventoryDto.js";
import UpdateInventoryDto from "../models/dto/request/UpdateInventoryDto.js";
import InventoryResponseDto from "../models/dto/response/InventoryResponse.js";

class InventoryController {
  // GET /api/inventory - Xem tồn kho toàn hệ thống
  static async getInventory(req, res) {
    try {
      const inventory = await Inventory.find()
        .populate("part_catalog_id", "name category")
        .sort({ last_updated: 1 });
      const responseData = inventory.map(
        (item) => new InventoryResponseDto(item)
      );

      res.json({
        success: true,
        data: responseData,
        count: responseData.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi lấy thông tin tồn kho",
        error: error.message,
      });
    }
  }

  // PATCH /api/inventory/:part_catalog_id - Cập nhật số lượng tồn
  static async updateInventory(req, res) {
    try {
      const { part_catalog_id } = req.params;
      const updateDto = new UpdateInventoryDto(req.body);
      const validation = updateDto.validate();

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: validation.newErrors,
        });
      }

      const inventory = await Inventory.findOneAndUpdate(
        { part_catalog_id },
        updateDto.toModel(),
        { new: true, runValidators: true }
      );

      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy phụ tùng trong kho",
        });
      }

      const responseDto = new InventoryResponseDto(inventory);
      res.json({
        success: true,
        message: "Cập nhật tồn kho thành công",
        data: responseDto,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Lỗi cập nhật tồn kho",
        error: error.message,
      });
    }
  }

  static async craeteInventory(req, res) {
    try {
      const createDto = new CreateInventoryDto(req.body);
      const validation = createDto.validate();
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: validation.newErrors,
        });
      }

      const inventory = new Inventory(createDto.toModel());
      await inventory.save();

      const responseDto = new InventoryResponseDto(inventory);
      res.status(201).json({
        success: true,
        message: "Tạo tồn kho thành công",
        data: responseDto,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Lỗi tạo tồn kho",
        error: error.message,
      });
    }
  }

  // GET /api/inventory/low-stock - Lấy danh sách phụ tùng sắp hết hàng
  static async getLowStock(req, res) {
    try {
      const lowStockItems = await Inventory.find({
        $expr: { $lte: ["$quantity", "$threshold"] },
      }).sort({ quantity: 1 });

      const responseData = lowStockItems.map(
        (item) => new InventoryResponseDto(item)
      );

      res.json({
        success: true,
        data: responseData,
        count: responseData.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi lấy danh sách tồn kho thấp",
        error: error.message,
      });
    }
  }
}

export default InventoryController;
