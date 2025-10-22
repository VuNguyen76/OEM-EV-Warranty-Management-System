import express from 'express';
import CustomerController from '../controllers/CustomerController.js';

const router = express.Router();

// GET /customers - Lấy tất cả khách hàng
router.get('/', CustomerController.getAllCustomers);

// GET /customers/search?q=keyword - Tìm kiếm khách hàng
router.get('/search', CustomerController.searchCustomers);

// GET /customers/:id - Lấy khách hàng theo ID
router.get('/:id', CustomerController.getCustomerById);

// POST /customers - Tạo khách hàng mới
router.post('/', CustomerController.createCustomer);

// PUT /customers/:id - Cập nhật khách hàng
router.put('/:id', CustomerController.updateCustomer);

// DELETE /customers/:id - Xóa khách hàng
router.delete('/:id', CustomerController.deleteCustomer);

export default router;