import express from 'express';
import WarrantyCostsController from '../controllers/WarrantyCostsController.js';

const router = express.Router();

router.post('/', WarrantyCostsController.createWarrantyCosts);
router.get('/claim/:claim_id', WarrantyCostsController.getCostsByClaim);
router.put('/claim/:claim_id', WarrantyCostsController.updateWarrantyCosts);

export default router;
