import express from "express";
import VinController from "../controllers/VinController.js";

const router = express.Router();

router.get("/", VinController.getAll);
router.get("/:id", VinController.getById);
router.post("/", VinController.create);
router.put("/:id", VinController.update);
router.delete("/:id", VinController.delete);

export default router;
