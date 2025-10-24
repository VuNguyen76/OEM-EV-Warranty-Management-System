import express from 'express';
import PartsAttachedController from '../controllers/PartsAttachedController.js';

const router = express.Router();

// POST /vehicles/:vin/parts - Gắn phụ tùng vào xe
router.post('/vehicles/:vin/parts', PartsAttachedController.attachPartToVehicle);

// GET /vehicles/:vin/parts - Lấy danh sách phụ tùng của xe
router.get('/vehicles/:vin/parts', PartsAttachedController.getVehicleParts);

// PATCH /parts/:serial_number - Cập nhật trạng thái phụ tùng
router.patch('/parts/:serial_number', PartsAttachedController.updatePartStatus);

// GET /parts/:serial_number - Lấy thông tin phụ tùng theo serial
router.get('/parts/:serial_number', PartsAttachedController.getPartBySerial);

export default router;