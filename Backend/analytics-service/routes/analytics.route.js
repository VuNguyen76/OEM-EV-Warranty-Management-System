import express from "express";
import { triggerAnalysis, getAnalyticsByPeriod } from "../controllers/analytics.controller.js";
import auth from "../../shared/middlewares/auth.js";

const router = express.Router();
router.use(auth)

// Trigger phân tích mới và lưu DB
router.get("/trigger", triggerAnalysis);

// Lấy dữ liệu phân tích theo period
router.get("/", getAnalyticsByPeriod);

export default router;
