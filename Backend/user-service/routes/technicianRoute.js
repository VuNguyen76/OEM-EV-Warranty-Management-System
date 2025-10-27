import express from "express";
import TechnicianController from "../controllers/technicianController.js";
import authorize from "../../shared/middlewares/authorize.js";
import auth from "../../shared/middlewares/auth.js";

const router = express.Router();

//Route kiểm tra toàn bộ route đã đăng nhập
router.use(auth);

router
  .route("/")
  .get(authorize(["admin","sc-staff"]), TechnicianController.getAll)
  .post(authorize(["admin","sc-staff"]), TechnicianController.create);

router
  .route("/:id")
  .get(TechnicianController.getById)
  .put(authorize(["admin", "sc-staff"]), TechnicianController.update)
  .delete(authorize(["admin", "sc-staff"]), TechnicianController.delete);

export default router;
