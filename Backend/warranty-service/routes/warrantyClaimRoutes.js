import express from 'express';
import WarrantyClaimController from '../controllers/WarrantyClaimController.js';

const router = express.Router();

// POST / - Tạo yêu cầu bảo hành mới
router.post('/', WarrantyClaimController.createClaim);

// GET / - Danh sách claim
router.get('/', WarrantyClaimController.getAllClaims);

// GET /:code - Lấy chi tiết claim
router.get('/:code', WarrantyClaimController.getClaimByCode);

// PATCH /:code/status - Cập nhật trạng thái
router.patch('/:code/status', WarrantyClaimController.updateClaimStatus);

export default router;