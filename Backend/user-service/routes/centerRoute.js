import express from "express";
import ServiceCenterController from "../controllers/serviceCenterController.js";
import authorize from "../../shared/middlewares/authorize.js";
import auth from "../../shared/middlewares/auth.js";

const router = express.Router();

//Route kiểm tra toàn bộ route đã đăng nhập
router.use(auth);
router.use(authorize(["admin", "evm_staff"]));

router
  .route("/")
  .get(ServiceCenterController.getAll)
  .post(ServiceCenterController.create);

router
  .route("/:id")
  .get(ServiceCenterController.getById)
  .put(ServiceCenterController.update)
  .delete(ServiceCenterController.delete);

export default router;
