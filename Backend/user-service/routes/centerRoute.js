import express from "express";
import ServiceCenterController from "../controllers/serviceCenterController.js";
import authorize from "../../shared/middlewares/authorize.js";
import auth from "../../shared/middlewares/auth.js";

const router = express.Router();

router.use(auth);

router.get(
  "/",
  authorize(["admin", "evm_staff"]),
  ServiceCenterController.getAll
);
router.get(
  "/:id",
  authorize(["admin", "evm_staff", "sc_staff"]),
  ServiceCenterController.getById
);
router.delete(
  "/:id",
  authorize(["admin", "evm_staff"]),
  ServiceCenterController.delete
);

router.post("/", authorize(["sc_staff"]), ServiceCenterController.create);
router.put(
  "/:id",
  authorize(["sc_staff", "admin", "evm_staff"]),
  ServiceCenterController.update
);

export default router;
