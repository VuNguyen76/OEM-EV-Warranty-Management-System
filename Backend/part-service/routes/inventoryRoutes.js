import express from 'express';
import InventoryController from '../controllers/inventoryController.js';

const router = express.Router();

// GET /low-stock - Lấy danh sách tồn kho thấp (phải đặt trước /:part_catalog_id)
router.get('/low-stock', InventoryController.getLowStock);

// GET / - Lấy danh sách tồn kho
router.get('/', InventoryController.getInventory);

// PATCH /:part_catalog_id - Cập nhật tồn kho
router.patch('/:part_catalog_id', InventoryController.updateInventory);

// POST / - Tạo tồn kho mới
router.post('/', InventoryController.craeteInventory);

// POST /allocate - Cấp phát tồn kho cho đơn hàng bảo hành
router.post('/allocate', InventoryController.allocate);

// DELETE /:part_catalog_id - Xóa tồn kho
router.delete('/:part_catalog_id', InventoryController.deleteInventory);

export default router;
