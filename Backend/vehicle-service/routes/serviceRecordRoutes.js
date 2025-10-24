import express from 'express';
import ServiceRecordController from '../controllers/ServiceRecordController.js';

const router = express.Router();

// POST /vehicles/:vin/service-records - Tạo lịch sử bảo dưỡng
router.post('/vehicles/:vin/service-records', ServiceRecordController.createServiceRecord);

// GET /vehicles/:vin/service-records - Lấy lịch sử bảo dưỡng của xe
router.get('/vehicles/:vin/service-records', ServiceRecordController.getVehicleServiceRecords);

// PATCH /service-records/:id - Cập nhật lịch sử bảo dưỡng
router.patch('/service-records/:id', ServiceRecordController.updateServiceRecord);

// GET /service-records/:id - Lấy chi tiết lịch sử bảo dưỡng
router.get('/service-records/:id', ServiceRecordController.getServiceRecordById);

export default router;