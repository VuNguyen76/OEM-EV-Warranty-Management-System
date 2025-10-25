import express from 'express';
import WarrantyCostsController from '../controllers/WarrantyCostsController.js';

const router = express.Router();

router.get('/costs', WarrantyCostsController.getCostsAnalytics);
router.get('/costs/by-part', WarrantyCostsController.getCostsByPart);

export default router;
