import express from "express";
import { getReports } from "../controllers/analyticsController.js";

const router = express.Router();

router.get("/reports", getReports);

export default router;

