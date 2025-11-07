import express from "express";
import PartController from "../controllers/partController.js";

const router = express.Router();

// POST / - Tạo phụ tùng mới
router.post("/", PartController.createPart);

// GET / - Lấy danh sách phụ tùng
router.get("/", PartController.getParts);

// GET /:part_id - Lấy chi tiết phụ tùng
router.get("/:serial", PartController.getPartBySerial);

// GET /vehicle/:vehicle_id - Lấy danh sách phụ tùng theo xe
router.get("/vehicle/:vehicle_id", PartController.getPartsByVehicle);

// PATCH /:part_id - Cập nhật phụ tùng
router.patch("/:id", PartController.updatePart);

// DELETE /:part_id - Xóa phụ tùng
router.delete("/:id", PartController.deletePart);

export default router;
