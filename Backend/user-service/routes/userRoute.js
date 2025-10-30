import express from "express";
import UserController from "../controllers/userController.js";
import authorize from "../../shared/middlewares/authorize.js";
import auth from "../../shared/middlewares/auth.js";

const router = express.Router();

//Route kiểm tra toàn bộ route đã đăng nhập
router.use(auth);

router.route("/").get(UserController.getAll);

router
  .route("/:id")
  .get(UserController.getById)
  .put(authorize(["admin", "evm_staff"]), UserController.update)
  .delete(authorize(["admin", "evm_staff"]), UserController.delete);

export default router;
