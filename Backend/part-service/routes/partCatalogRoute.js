import express from 'express';
import PartCatalogController from '../controllers/partCatalogController.js';

const router = express.Router();

// POST / - Tạo mẫu phụ tùng
router.post('/', PartCatalogController.createCatalog);

// GET / - Lấy danh sách mẫu phụ tùng
router.get('/', PartCatalogController.getAll);

export default router;


