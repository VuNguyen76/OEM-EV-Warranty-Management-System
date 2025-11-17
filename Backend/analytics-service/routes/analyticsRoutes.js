import express from "express";
import {
  getFailureRate,
  analyzeRootCause,
  forecastCost
} from "../controllers/analytics.controller.js";

const router = express.Router();

router.get("/failure-rate", getFailureRate);
router.get("/root-cause", analyzeRootCause);
router.get("/forecast", forecastCost);

export default router;
