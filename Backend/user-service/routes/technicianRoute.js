import express from "express";
import TechnicianController from "../controllers/technicianController.js";
import authorize from "../../shared/middlewares/authorize.js";
import auth from "../../shared/middlewares/auth.js";

const router = express.Router();

//Route kiểm tra toàn bộ route đã đăng nhập
router.use(auth);
router.use(authorize(["admin", "sc_staff"]));

router
  .route("/")
  .get(TechnicianController.getAll)
  .post(TechnicianController.create);

router
  .route("/:id")
  .get(TechnicianController.getById)
  .put(TechnicianController.update)
  .delete(TechnicianController.delete);

export default router;
