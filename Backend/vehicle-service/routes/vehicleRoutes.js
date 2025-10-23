import express from 'express';
import VehicleController from '../controllers/VehicleController.js';

const router = express.Router();

router.get('/', VehicleController.getAllVehicles);
router.get('/search', VehicleController.searchVehicles);
router.post('/', VehicleController.createVehicle);
router.get('/:id', VehicleController.getVehicleById);
router.put('/:id', VehicleController.updateVehicle);
router.delete('/:id', VehicleController.deleteVehicle);

export default router;