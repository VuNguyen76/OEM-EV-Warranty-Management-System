import express from "express";
import ServiceCenterController from "../controllers/serviceCenterController.js";
import authorize from "../../shared/middlewares/authorize.js";
import auth from "../../shared/middlewares/auth.js";

const router = express.Router();

//Route kiểm tra toàn bộ route đã đăng nhập
router.use(auth);

router
  .route("/")
  .get(authorize(["admin"]), ServiceCenterController.getAll)
  .post(authorize(["admin", "evm-staff"]), ServiceCenterController.create);

router
  .route("/:id")
  .get(ServiceCenterController.getById)
  .put(authorize(["admin", "sc-staff"]), ServiceCenterController.update)
  .delete(authorize(["admin"]), ServiceCenterController.delete);

export default router;
