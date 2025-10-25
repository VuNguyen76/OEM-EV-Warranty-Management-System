import express from 'express';
import WarrantyPolicyController from '../controllers/WarrantyPolicyController.js';

const router = express.Router();

// POST / - Tạo chính sách bảo hành mới
router.post('/', WarrantyPolicyController.createPolicy);

// GET / - Lấy danh sách chính sách
router.get('/', WarrantyPolicyController.getAllPolicies);

// GET /:id - Lấy chi tiết chính sách
router.get('/:id', WarrantyPolicyController.getPolicyById);

// PATCH /:id - Cập nhật chính sách
router.patch('/:id', WarrantyPolicyController.updatePolicy);

export default router;