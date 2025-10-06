const express = require("express");
const { authenticateToken, authorizeRole } = require("../../shared/middleware/AuthMiddleware");
const UserController = require("../Controller/UserController");

const router = express.Router();

router.get("/", authenticateToken, authorizeRole("admin"), UserController.getAllUsers);
router.get("/technicians/available", authenticateToken, authorizeRole("admin", "service_staff"), UserController.getAvailableTechnicians);
router.get("/:id", authenticateToken, UserController.getUserById);
router.put("/:id", authenticateToken, UserController.updateUser);
router.put("/:id/password", authenticateToken, UserController.changePassword);
router.delete("/:id", authenticateToken, authorizeRole("admin"), UserController.deleteUser);

module.exports = router;
