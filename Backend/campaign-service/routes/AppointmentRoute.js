import express from "express";
import AppointmentController from "../controllers/AppointmentController.js";
import auth from "../../shared/middlewares/auth.js";

const router = express.Router();

router.use(auth);


export default router;
