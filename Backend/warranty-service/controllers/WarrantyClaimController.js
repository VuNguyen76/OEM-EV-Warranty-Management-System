import WarrantyClaim from "../models/WarrantyClaim.js";
import CreateWarrantyClaimDto from "../models/dto/request/CreateWarrantyClaimDto.js";
import UpdateClaimStatusDto from "../models/dto/request/UpdateClaimStatusDto.js";
import WarrantyClaimResponseDto from "../models/dto/response/WarrantyClaimResponse.js";
import VehicleServiceClient from "../utils/VehicleServiceClient.js";
import WarrantyPolicyController from "./WarrantyPolicyController.js";
import RepairOrder from "../models/RepairOrder.js";
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
      console.log("bodyData", bodyData);

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

      // Kiểm tra bảo hành cho từng part
      const evaluatedParts =
        await WarrantyPolicyController.evaluateWarrantyForParts(
          createDto.parts,
          modelData.vehicle,
          new Date()
        );

      // Tính toán tổng chi phí
      let totalWarranty = 0;
      let totalCustomer = 0;

      for (const part of evaluatedParts) {
        const price = part.cost || 0;

        if (part.is_eligible) totalWarranty += price * (part.quantity || 1);
        else totalCustomer += price * (part.quantity || 1);
      }

      modelData.parts = evaluatedParts;
      modelData.summary = {
        total_warranty_amount: totalWarranty,
        total_customer_amount: totalCustomer,
      };

      // Xử lý hình ảnh nếu có
      if (req.files && req.files.length > 0) {
        modelData.images = req.files.map((file) => ({
          filename: file.filename,
          path: file.path,
          uploaded_at: new Date(),
        }));
      }

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

      res.json({
        success: true,
        data: claims,
        count: claims.length,
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
      console.log("claim", claim);
      console.log("code", code);

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

  static async assignTechnician(req, res) {
    try {
      const { claim_id } = req.params;
      const { technician_id } = req.body;

      const claim = await WarrantyClaim.findByIdAndUpdate(
        claim_id,
        { technician_id },
        { new: true, runValidators: true }
      );
      if (!claim) {
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy yêu cầu" });
      }
      res
        .status(200)
        .json({ success: true, data: claim, message: "Phân công thành công" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getClaimByTechnician(req, res) {
    const token = req.token;
    try {
      const { technician_id } = req.params;

      // Tìm technician_id thực tế từ user_id
      let actualTechnicianId = technician_id;

      try {
        const response = await fetch(
          `${process.env.USER_SERVICE_URL}/api/technicians/by-user/${technician_id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const technicianData = await response.json();

        if (technicianData.success) {
          actualTechnicianId = technicianData.data._id;
        }
      } catch (error) {
        console.log("Không tìm thấy technician, sử dụng ID gốc");
      }

      const claims = await WarrantyClaim.find({
        technician_id: actualTechnicianId,
      }).sort({ submitted_at: -1 });

      res.json({
        success: true,
        data: claims,
        count: claims.length,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  // PATCH /api/claims/:code/approve
  static async approveClaim(req, res) {
    try {
      const { code } = req.params;
      const reviewer = req.user.id;

      //  Tìm claim
      const claim = await WarrantyClaim.findOne({ claim_code: code });
      if (!claim) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy yêu cầu bảo hành",
        });
      }

      //  Kiểm tra trạng thái hợp lệ
      if (claim.status !== "submitted") {
        return res.status(400).json({
          success: false,
          message: `Không thể duyệt yêu cầu ở trạng thái hiện tại (${claim.status})`,
        });
      }

      //  Cập nhật người duyệt và thời gian duyệt
      claim.reviewed_by = reviewer || null;
      claim.reviewed_at = new Date();

      //  Kiểm tra chi phí khách hàng
      const hasCustomerCost = claim.summary?.total_customer_amount > 0;

      //  Nếu có chi phí KH → chờ xác nhận KH
      if (hasCustomerCost) {
        claim.status = "waiting_customer";
        await claim.save();

        return res.json({
          success: true,
          message: "Yêu cầu đã duyệt, chờ khách hàng xác nhận chi phí.",
          data: {
            claim_code: claim.claim_code,
            status: claim.status,
          },
        });
      }

      //  Nếu không có chi phí KH → duyệt và tạo RepairOrder tự động
      claim.status = "confirmed";

      const eligibleParts = claim.parts.filter((p) => p.is_eligible);
      let repairOrder = null;

      if (eligibleParts.length > 0) {
        repairOrder = await RepairOrder.create({
          claim_id: claim._id,
          parts: eligibleParts,
          repair_description: "Tự động tạo sau khi EVM duyệt yêu cầu bảo hành",
          status: "waiting_parts",
          start_date: new Date(),
        });

        claim.repair_order_id = repairOrder._id;
      }

      await claim.save();

      return res.json({
        success: true,
        message: "Yêu cầu đã duyệt và tạo Repair Order thành công.",
        data: {
          claim_code: claim.claim_code,
          status: claim.status,
          repair_order: repairOrder
            ? {
                order_code: repairOrder.order_code,
                status: repairOrder.status,
                parts_count: repairOrder.parts.length,
              }
            : null,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi xử lý duyệt yêu cầu bảo hành",
        error: error.message,
      });
    }
  }
}

export default WarrantyClaimController;
