const express = require("express");
const { authenticateToken, authorizeRole } = require("../../shared/middleware/AuthMiddleware");

// Import Controllers
const VehicleController = require("../Controller/VehicleController");
const PartsController = require("../Controller/PartsController");
const ServiceHistoryController = require("../Controller/ServiceHistoryController");

const router = express.Router();

// ===========================================
// MANUFACTURER ROUTES (Hãng sản xuất)
// ===========================================

// Vehicle Model Management
router.post("/models", authenticateToken, authorizeRole("admin", "manufacturer_staff"), VehicleController.createVehicleModel);
router.get("/models", authenticateToken, VehicleController.getAllVehicleModels);

// Vehicle Production
router.post("/production", authenticateToken, authorizeRole("admin", "manufacturer_staff"), VehicleController.createVehicle);

// ===========================================
// SERVICE CENTER ROUTES (Trung tâm bảo hành)
// ===========================================

// Vehicle Registration for Warranty
router.post("/warranty/register", authenticateToken, authorizeRole("admin", "service_staff"), VehicleController.registerVehicleWarranty);

// Vehicle Information
router.get("/vin/:vin", authenticateToken, VehicleController.getVehicleByVIN);
router.get("/", authenticateToken, VehicleController.getAllVehicles);

// Statistics Routes
router.get("/stats/parts", authenticateToken, authorizeRole("admin", "service_staff"), PartsController.getPartsStatistics);

// Parts Management Routes (UC19)
router.post("/parts", authenticateToken, authorizeRole("admin", "service_staff"), PartsController.createPart);
router.get("/parts", authenticateToken, PartsController.getAllParts);
router.get("/parts/low-stock", authenticateToken, authorizeRole("admin", "service_staff"), PartsController.getLowStockParts);

// Vehicle Parts Routes (UC2)
router.post("/:vehicleId/parts", authenticateToken, PartsController.addPartToVehicle);
router.get("/:vehicleId/parts", authenticateToken, PartsController.getVehicleParts);
router.put("/:vehicleId/parts/:partId", authenticateToken, PartsController.updatePartStatus);
router.get("/parts/serial/:serialNumber", authenticateToken, PartsController.searchPartBySerial);

// Service History Routes (UC3)
router.post("/:vehicleId/service-history", authenticateToken, ServiceHistoryController.addServiceHistory);
router.get("/:vehicleId/service-history", authenticateToken, ServiceHistoryController.getServiceHistory);
router.put("/:vehicleId/service-history/:recordId", authenticateToken, ServiceHistoryController.updateServiceHistory);
router.put("/:vehicleId/service-history/:recordId/complete", authenticateToken, ServiceHistoryController.completeService);

// Service Center Operations
router.get("/service-center/:centerName/history", authenticateToken, authorizeRole("admin", "service_staff"), ServiceHistoryController.getServiceCenterHistory);

// Service Statistics and Reports
router.get("/service-stats", authenticateToken, authorizeRole("admin", "service_staff"), ServiceHistoryController.getServiceStatistics);
router.get("/upcoming-services", authenticateToken, authorizeRole("admin", "service_staff"), ServiceHistoryController.getUpcomingServices);

// Initialize all models
function initializeModels() {
    VehicleController.initializeModels();
    PartsController.initializeModels();
    ServiceHistoryController.initializeModels();
}

// Export router and initialization function
module.exports = router;
module.exports.initializeModels = initializeModels;
