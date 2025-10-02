const express = require("express");
const { authenticateToken, authorizeRole } = require("../../shared/middleware/AuthMiddleware");

// Import Controllers
const VehicleController = require("../Controller/VehicleController");
const PartsController = require("../Controller/PartsController");
const ServiceHistoryController = require("../Controller/ServiceHistoryController");

const router = express.Router();

// Vehicle Routes
router.post("/register", authenticateToken, authorizeRole("admin", "service_staff"), VehicleController.registerVehicle);
router.get("/vin/:vin", authenticateToken, VehicleController.getVehicleByVIN);
router.get("/service-center/:centerName", authenticateToken, authorizeRole("admin", "service_staff"), VehicleController.getVehiclesByServiceCenter);
router.get("/search", authenticateToken, VehicleController.searchVehicles);
router.put("/:id", authenticateToken, authorizeRole("admin", "service_staff"), VehicleController.updateVehicle);

// Statistics Routes
router.get("/stats/parts", authenticateToken, authorizeRole("admin", "service_staff"), PartsController.getPartsStatistics);
router.get("/stats/overview", authenticateToken, authorizeRole("admin", "service_staff"), VehicleController.getVehicleOverviewStats);

// Parts Routes
router.post("/:vehicleId/parts", authenticateToken, PartsController.addPartToVehicle);
router.get("/:vehicleId/parts", authenticateToken, PartsController.getVehicleParts);
router.put("/:vehicleId/parts/:partId", authenticateToken, PartsController.updatePartStatus);
router.get("/parts/serial/:serialNumber", authenticateToken, PartsController.searchPartBySerial);

// Service History Routes
router.post("/:vehicleId/service-history", authenticateToken, ServiceHistoryController.addServiceHistory);
router.get("/:vehicleId/service-history", authenticateToken, ServiceHistoryController.getServiceHistory);
router.put("/:vehicleId/service-history/:recordId", authenticateToken, ServiceHistoryController.updateServiceHistory);
router.get("/service-center/:centerName/history", authenticateToken, authorizeRole("admin", "service_staff"), ServiceHistoryController.getServiceCenterHistory);

// Initialize Vehicle model
function initializeVehicleModel() {
    VehicleController.initializeVehicleModel();
    PartsController.initializeVehicleModel();
    ServiceHistoryController.initializeVehicleModel();
}

// Export router and initialization function
module.exports = router;
module.exports.initializeVehicleModel = initializeVehicleModel;
