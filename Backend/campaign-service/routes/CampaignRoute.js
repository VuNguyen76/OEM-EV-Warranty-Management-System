import express from "express";
import CampaignController from "../controllers/CampaignController.js";
import CampaignVehicleController from "../controllers/CampaignVehicleController.js";
import auth from "../../shared/middlewares/auth.js";

const router = express.Router();

router.use(auth);




export default router;
