const express = require("express");
const { authenticateToken, authorizeRole } = require("../../shared/middleware/AuthMiddleware");

// Import Controllers
const UserController = require("../Controller/UserController");

const router = express.Router();

// User Routes
router.get("/", authenticateToken, authorizeRole("admin"), UserController.getAllUsers);
router.get("/technicians/available", authenticateToken, authorizeRole("admin", "service_staff"), UserController.getAvailableTechnicians);
router.get("/:id", authenticateToken, UserController.getUserById);
router.put("/:id", authenticateToken, UserController.updateUser);
router.delete("/:id", authenticateToken, authorizeRole("admin"), UserController.deleteUser);

// Export router
module.exports = router;
