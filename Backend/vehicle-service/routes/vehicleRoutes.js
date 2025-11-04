import express from "express";
import VehicleController from "../controllers/VehicleController.js";
import auth from "../../shared/middlewares/auth.js";
import authorize from "../../shared/middlewares/authorize.js";
const router = express.Router();

router.get("/search", VehicleController.searchVehicles);
router.use(auth);

router.get("/", VehicleController.getAllVehicles);
router.get("/:vin/warranty-status", VehicleController.getWarrantyStatus);
router.post(
  "/",
  authorize(["admin", "sc_staff"]),
  VehicleController.createVehicle
);
router.get("/:id", VehicleController.getVehicleById);
router.put("/:id", VehicleController.updateVehicle);
router.delete("/:id", VehicleController.deleteVehicle);

export default router;
