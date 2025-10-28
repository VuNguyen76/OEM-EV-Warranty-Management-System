import express from 'express';
import PartController from '../controllers/partController.js';

const router = express.Router();

// GET /search - Tìm kiếm phụ tùng (phải đặt trước /:part_id)
router.get('/search', PartController.searchParts);

// POST / - Tạo phụ tùng mới
router.post('/', PartController.createPart);

// GET / - Lấy danh sách phụ tùng
router.get('/', PartController.getParts);

// GET /:part_id - Lấy chi tiết phụ tùng
router.get('/:part_id', PartController.getPartById);

// PATCH /:part_id - Cập nhật phụ tùng
router.patch('/:part_id', PartController.updatePart);

// DELETE /:part_id - Xóa phụ tùng
router.delete('/:part_id', PartController.deletePart);

export default router;