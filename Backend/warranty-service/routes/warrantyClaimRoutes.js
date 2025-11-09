import express from "express";
import WarrantyClaimController from "../controllers/WarrantyClaimController.js";
import { uploadImages } from "../middlewares/upload.js";
import auth from "../../shared/middlewares/auth.js";

const router = express.Router();
router.use(auth);

// POST / - Tạo yêu cầu bảo hành mới (với upload hình ảnh)
router.post("/", uploadImages, WarrantyClaimController.createClaim);

// GET / - Danh sách claim
router.get("/", WarrantyClaimController.getAllClaims);

// GET /:code - Lấy chi tiết claim
router.get("/:code", WarrantyClaimController.getClaimByCode);

// PATCH /:code/status - Cập nhật trạng thái
router.patch("/:code/status", WarrantyClaimController.updateClaimStatus);

// POST /:claim_id/assign - Phân công kỹ thuật viên
router.post("/:claim_id/assign", WarrantyClaimController.assignTechnician);

// GET /technician/:technician_id - Lấy danh sách yêu cầu của kỹ thuật viên
router.get("/technician/:technician_id", WarrantyClaimController.getClaimByTechnician);

// PATCH /:code/approve - Duyệt yêu cầu bảo hành
router.patch("/:code/approve", WarrantyClaimController.approveClaim);

export default router;
