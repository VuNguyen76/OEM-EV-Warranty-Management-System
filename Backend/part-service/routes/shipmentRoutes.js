import express from "express";
import shipmentController from "../controllers/shipmentController.js";

const router = express.Router();

router.post("/", shipmentController.createShipment);

router.get("/", shipmentController.getShipments);

router.get("/:code", shipmentController.getShipmentByCode);

router.patch("/:code/status", shipmentController.updateShipmentStatus);

export default router;
