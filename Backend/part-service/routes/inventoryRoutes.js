import express from "express";
import inventoryController from "../controllers/inventoryController.js";

import inventoryValidates from "../validates/inventoryValidate.js";

const router = express.Router();

router.get("/", inventoryController.getInventory);

router.patch(
  "/update",
  inventoryValidates.inventoryChange,
  inventoryController.updateInventory
);

router.get("/low-stock", inventoryController.getLowStock);

export default router;
