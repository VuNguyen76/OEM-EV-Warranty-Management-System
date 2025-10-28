import express from 'express';
import InventoryController from '../controllers/inventoryController.js';

const router = express.Router();

// GET /low-stock - Lấy danh sách tồn kho thấp (phải đặt trước /:part_id)
router.get('/low-stock', InventoryController.getLowStock);

// GET / - Lấy danh sách tồn kho
router.get('/', InventoryController.getInventory);

// PATCH /:part_id - Cập nhật tồn kho
router.patch('/:part_id', InventoryController.updateInventory);

export default router;