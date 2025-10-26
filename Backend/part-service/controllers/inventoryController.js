import Inventory from '../models/Inventory.js';


class InventoryController {
  // Xem tồn kho toàn hệ thống
  async getInventory(req, res) {
    try {
      const part_id = req.query.part_id;
      const location_type = req.query.location_type;

      const filter = {};
      if (part_id) filter.part_id = part_id;
      if (location_type) filter.location_type = location_type;

      const inventory = await Inventory.find(filter).select('-_id part_id quantity');

      res.json({
        success: true,
        data: inventory
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Cập nhật số lượng tồn
  async updateInventory(req, res) {
    try {
      const part_id = req.body.part_id;
      const location_id = req.body.location_id;
      const quantity = parseInt(req.body.quantity);

      if (quantity < 0) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu tồn kho không hợp lệ'
        });
      }

      const inventory = await Inventory.findOne({ part_id });

      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phụ tùng cập nhật'
        });
      }

      await Inventory.updateOne(
        {
          part_id: part_id
        }, {
        quantity: quantity,
        last_restocked_at: new Date()
      }
      );

      res.json({
        success: true,
        message: "Cập nhật tồn kho thành công"
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Lấy danh sách phụ tùng sắp hết hàng
  async getLowStock(req, res) {
    try {
      const lowStockItems = await Inventory.find({
        $expr: { $lte: ['$quantity', '$threshold'] }
      }).select('part_id quantity threshold -_id')

      res.json({
        success: true,
        data: lowStockItems
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new InventoryController();