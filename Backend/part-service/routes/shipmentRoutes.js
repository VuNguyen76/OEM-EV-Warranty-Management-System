import express from 'express';
import ShipmentController from '../controllers/shipmentController.js';

const router = express.Router();

// POST / - Tạo đơn giao hàng
router.post('/', ShipmentController.createShipment);

// GET / - Lấy danh sách đơn giao hàng
router.get('/', ShipmentController.getShipments);

// GET /:code - Lấy chi tiết đơn giao hàng
router.get('/:code', ShipmentController.getShipmentByCode);

// PATCH /:code - Cập nhật trạng thái đơn giao hàng
router.patch('/:code', ShipmentController.updateShipmentStatus);

export default router;