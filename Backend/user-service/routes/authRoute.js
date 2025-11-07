import express from "express";
import authController from "../controllers/authController.js";
import auth from "../../shared/middlewares/auth.js";

const router = express.Router();
router.post("/login", authController.login);
router.post("/register", auth, authController.register);
export default router;
