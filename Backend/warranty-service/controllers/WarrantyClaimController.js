import WarrantyClaim from "../models/WarrantyClaim.js";
import CreateWarrantyClaimDto from "../models/dto/request/CreateWarrantyClaimDto.js";
import UpdateClaimStatusDto from "../models/dto/request/UpdateClaimStatusDto.js";
import WarrantyClaimResponseDto from "../models/dto/response/WarrantyClaimResponse.js";
import VehicleServiceClient from "../utils/VehicleServiceClient.js";
import WarrantyPolicyController from "./WarrantyPolicyController.js";
import sendEmail from "../utils/emailService.js";
import axios from "axios";
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
      const { status, service_center_id, vin, from, to, period } = req.query;
  
      let query = {};
  
      // -------------------------------
      // 1. Giữ nguyên filter cũ
      // -------------------------------
      if (status) query.status = status;
      if (service_center_id) query.service_center_id = service_center_id;
      if (vin) query.vin = vin;
  
      // -------------------------------
      // 2. Xử lý lọc theo ngày
      // -------------------------------
      let dateFilter = {};
  
      // Truyền period = "2025-11"
      if (period) {
        const start = new Date(`${period}-01T00:00:00.000Z`);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
  
        dateFilter.$gte = start;
        dateFilter.$lte = end;
      }
  
      // Nếu truyền trực tiếp from / to
      if (from) {
        dateFilter.$gte = new Date(from);
      }
      if (to) {
        dateFilter.$lte = new Date(to);
      }
  
      // Nếu có bất kỳ lọc thời gian → apply vào submitted_at
      if (Object.keys(dateFilter).length > 0) {
        query.submitted_at = dateFilter;
      }
  
      // -------------------------------
      // 3. Query DB
      // -------------------------------
      const claims = await WarrantyClaim.find(query).sort({ submitted_at: -1 });
  
      return res.json({
        success: true,
        data: claims,
        count: claims.length,
      });
  
    } catch (error) {
      return res.status(500).json({
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
        { technician_id, status: "in_repair" },
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
        status: "in_repair",
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

      const response = await axios.post(
        `${process.env.PART_SERVICE_URL}/api/inventory/allocate`,
        {
          items: claim.parts.map((p) => ({
            part_name: p.part_name,
            part_catalog_id: p.part_catalog_id,
            quantity: p.quantity,
          })),
        }
      );
      console.log("response: ", response.data);

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
      claim.status = "confirmed";
      await claim.save();

      return res.json({
        success: true,
        message: "Yêu cầu đã duyệt thành công.",
        data: {
          claim_code: claim.claim_code,
          status: claim.status,
        },
      });
    } catch (error) {
      if (error.response) {
        return res.status(error.response.status).json({
          success: false,
          message: error.response.data.message,
          error: error.response.data, // body lỗi từ allocate
        });
      }

      // Lỗi hệ thống khác (network, timeout...)
      return res.status(500).json({
        success: false,
        message: "Lỗi xử lý duyệt yêu cầu bảo hành",
        error: error.message,
      });
    }
  }

  static async confirmWarrantyCost(req, res) {
    try {
      const { code } = req.params;
      console.log("code", code);

      const claim = await WarrantyClaim.findOne({ claim_code: code });
      if (!claim)
        return res
          .status(404)
          .json({ success: false, message: "Claim không tồn tại" });

      if (!claim.vehicle?.customer_email)
        return res
          .status(400)
          .json({ success: false, message: "Không có email khách hàng" });

      // Tạo link xác nhận
      const baseUrl = process.env.FRONTEND_URL;
      const confirmUrl = `${baseUrl}/claim-confirm/${claim.claim_code}?action=confirm`;
      const rejectUrl = `${baseUrl}/claim-confirm/${claim.claim_code}?action=reject`;

      // Gửi email
      const partsHtml = claim.parts
        .filter((p) => !p.is_eligible) // chỉ những part khách phải trả
        .map(
          (p) => `
      <tr>
        <td style="padding:4px 8px; border:1px solid #ccc;">${p.part_name}</td>
        <td style="padding:4px 8px; border:1px solid #ccc;">${p.quantity}</td>
        <td style="padding:4px 8px; border:1px solid #ccc;">${(
          p.cost || 0
        ).toLocaleString("vi-VN")} VND</td>
      </tr>
    `
        )
        .join("");

      const totalCustomerCost = claim.summary?.total_customer_amount || 0;

      await sendEmail({
        to: claim.vehicle.customer_email,
        subject: `Xác nhận chi phí bảo hành cho Claim ${claim.claim_code}`,
        html: `
    <p>Xin chào ${claim.vehicle.customer_name},</p>
    <p>Yêu cầu bảo hành <b>#${
      claim.claim_code
    }</b> của bạn có phát sinh chi phí khách hàng như sau:</p>
    
    <table style="border-collapse:collapse; width:100%; margin-bottom:12px;">
      <thead>
        <tr>
          <th style="padding:4px 8px; border:1px solid #ccc;">Tên phụ tùng</th>
          <th style="padding:4px 8px; border:1px solid #ccc;">Số lượng</th>
          <th style="padding:4px 8px; border:1px solid #ccc;">Chi phí</th>
        </tr>
      </thead>
      <tbody>
        ${partsHtml}
        <tr>
          <td colspan="2" style="padding:4px 8px; border:1px solid #ccc; font-weight:bold;">Tổng</td>
          <td style="padding:4px 8px; border:1px solid #ccc; font-weight:bold;">${totalCustomerCost.toLocaleString(
            "vi-VN"
          )} VND</td>
        </tr>
      </tbody>
    </table>

    <p>Vui lòng xác nhận nếu bạn đồng ý sửa chữa:</p>
    <a href="${confirmUrl}" style="padding:8px 12px; background:green; color:white; text-decoration:none; border-radius:4px;">Xác nhận</a>
    <a href="${rejectUrl}" style="padding:8px 12px; background:red; color:white; text-decoration:none; border-radius:4px; margin-left:10px;">Từ chối</a>

    <p>Nếu bạn không phản hồi, yêu cầu sẽ tạm dừng.</p>
  `,
      });

      res.json({ success: true, message: "Email xác nhận đã được gửi" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async handleCustomerResponse(req, res) {
    try {
      const { code } = req.params;
      const { action } = req.query; // confirm hoặc reject

      if (!["confirm", "reject"].includes(action))
        return res.status(400).send("Action không hợp lệ");

      const claim = await WarrantyClaim.findOne({ claim_code: code });
      if (!claim) return res.status(404).send("Claim không tồn tại");

      claim.customer_confirmation = {
        confirmed: action === "confirm",
        responded_at: new Date(),
        reason: action === "reject" ? "Khách hàng từ chối sửa chữa" : null,
      };

      // Nếu khách xác nhận, update status
      if (action === "confirm") claim.status = "confirmed";
      else if (action === "reject") claim.status = "rejected";

      await claim.save();

      res.send(
        `<p>Cảm ơn bạn đã phản hồi. Yêu cầu của bạn đã được ghi nhận: ${action}</p>`
      );
    } catch (error) {
      res.status(500).send("Lỗi xử lý phản hồi");
    }
  }
}

export default WarrantyClaimController;
