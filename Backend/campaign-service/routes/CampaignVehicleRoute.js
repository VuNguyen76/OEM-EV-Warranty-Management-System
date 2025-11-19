import express from "express";
import CampaignVehicleController from "../controllers/CampaignVehicleController.js";
import auth from "../../shared/middlewares/auth.js";

const router = express.Router();

router.use(auth);

router.get("/", CampaignVehicleController.getAllCampaignVehicles);
router.patch("/:id", CampaignVehicleController.updateCampaignStatus);

export default router;
