import { log } from "console";
import WarrantyClaim from "../models/WarrantyClaim.js";
import CreateWarrantyClaimDto from "../models/dto/request/CreateWarrantyClaimDto.js";
import UpdateClaimStatusDto from "../models/dto/request/UpdateClaimStatusDto.js";
import WarrantyClaimResponseDto from "../models/dto/response/WarrantyClaimResponse.js";
import VehicleServiceClient from "../utils/VehicleServiceClient.js";
import path from "path";

class WarrantyClaimController {
  // POST /api/claims - Tạo yêu cầu bảo hành mới
  static async createClaim(req, res) {
    try {
      const user = req.user;
      // Lấy dữ liệu từ body và files
      const bodyData = {
        ...req.body,
        center_id: user.centerId,
        // Parse parts nếu là string
        parts: req.body.parts
          ? typeof req.body.parts === "string"
            ? JSON.parse(req.body.parts)
            : req.body.parts
          : [],
      };

      const createDto = new CreateWarrantyClaimDto(bodyData);
      const validation = createDto.validate();

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: validation.newErrors,
        });
      }

      // Validate VIN với Vehicle Service
      const vinValidation = await VehicleServiceClient.validateVIN(
        createDto.vin
      );
      if (!vinValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: "VIN không tồn tại trong hệ thống",
          errors: "VIN không hợp lệ hoặc chưa được đăng ký",
        });
      }

      // Lưu thông tin vehicle nếu có
      const modelData = createDto.toModel();
      if (vinValidation.vehicle) {
        modelData.vehicle = vinValidation.vehicle;
      }

      // Xử lý hình ảnh nếu có
      if (req.files && req.files.length > 0) {
        modelData.images = req.files.map((file) => ({
          filename: file.filename,
          path: file.path,
          uploaded_at: new Date(),
        }));
      }
      console.log("body ", bodyData);

      console.log(modelData);

      const claim = new WarrantyClaim(modelData);
      await claim.save();

      res.status(201).json({
        success: true,
        claim_code: claim.claim_code,
        message: "Tạo yêu cầu bảo hành thành công",
        images_uploaded: req.files ? req.files.length : 0,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Lỗi tạo yêu cầu bảo hành",
        error: error.message,
      });
    }
  }

  // GET /api/claims - Danh sách claim
  static async getAllClaims(req, res) {
    try {
      const { status, service_center_id, vin } = req.query;
      const query = {};

      if (status) query.status = status;
      if (service_center_id) query.service_center_id = service_center_id;
      if (vin) query.vin = vin;

      const claims = await WarrantyClaim.find(query).sort({ submitted_at: -1 });
      const responseData = claims.map((claim) => ({
        claim_code: claim.claim_code,
        vin: claim.vin,
        parts: claim.parts,
        status: claim.status,
        submitted_at: claim.submitted_at,
        service_center_id: claim.service_center_id,
        images_count: claim.images ? claim.images.length : 0,
      }));

      res.json({
        success: true,
        data: responseData,
        count: responseData.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi lấy danh sách yêu cầu",
        error: error.message,
      });
    }
  }

  // GET /api/claims/:code - Lấy chi tiết claim
  static async getClaimByCode(req, res) {
    try {
      const { code } = req.params;
      const claim = await WarrantyClaim.findOne({ claim_code: code });

      if (!claim) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy yêu cầu bảo hành",
        });
      }

      const responseDto = new WarrantyClaimResponseDto(claim);
      res.json({
        success: true,
        claim: responseDto.toJSON(),
        repair_order: claim.repair_order_id,
        costs: {
          estimated: claim.estimated_cost,
          actual: claim.actual_cost,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi lấy thông tin yêu cầu",
        error: error.message,
      });
    }
  }

  // PATCH /api/claims/:code/status - Cập nhật trạng thái
  static async updateClaimStatus(req, res) {
    try {
      const { code } = req.params;
      const updateDto = new UpdateClaimStatusDto(req.body);
      const validation = updateDto.validate();

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: validation.newErrors,
        });
      }

      const claim = await WarrantyClaim.findOneAndUpdate(
        { claim_code: code },
        updateDto.toModel(),
        { new: true, runValidators: true }
      );

      if (!claim) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy yêu cầu bảo hành",
        });
      }

      res.json({
        success: true,
        message: "Cập nhật trạng thái thành công",
        data: {
          claim_code: claim.claim_code,
          status: claim.status,
          reviewed_at: claim.reviewed_at,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Lỗi cập nhật trạng thái",
        error: error.message,
      });
    }
  }
}

export default WarrantyClaimController;
