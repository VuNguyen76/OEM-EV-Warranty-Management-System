import express from 'express';
import RepairOrderController from '../controllers/RepairOrderController.js';

const router = express.Router();

router.post('/', RepairOrderController.createRepairOrder);
router.get('/', RepairOrderController.getAllRepairOrders);
router.get('/:id', RepairOrderController.getRepairOrderById);
router.patch('/:id', RepairOrderController.updateRepairOrder);

export default router;

// test