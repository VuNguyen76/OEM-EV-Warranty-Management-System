import WarrantyPolicy from "../models/WarrantyPolicy.js";
import CreateWarrantyPolicyDto from "../models/dto/request/CreateWarrantyPolicyDto.js";
import UpdateWarrantyPolicyDto from "../models/dto/request/UpdateWarrantyPolicyDto.js";
import WarrantyPolicyResponseDto from "../models/dto/response/WarrantyPolicyResponse.js";

class WarrantyPolicyController {
  // POST /api/policies - Tạo chính sách bảo hành mới
  static async createPolicy(req, res) {
    try {
      const createDto = new CreateWarrantyPolicyDto(req.body);
      const validation = createDto.validate();

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: validation.newErrors,
        });
      }

      const policy = new WarrantyPolicy(createDto.toModel());
      await policy.save();

      const responseDto = new WarrantyPolicyResponseDto(policy);
      res.status(201).json({
        success: true,
        message: "Tạo chính sách bảo hành thành công",
        data: responseDto,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Lỗi tạo chính sách bảo hành",
        error: error.message,
      });
    }
  }

  // GET /api/policies - Lấy danh sách chính sách
  static async getAllPolicies(req, res) {
    try {
      const { status, part_category } = req.query;
      const query = {};

      if (status) query.status = status;
      if (part_category) query.part_category = part_category;

      const policies = await WarrantyPolicy.find(query).sort({ createdAt: -1 });
      const responseData = policies.map(
        (policy) => new WarrantyPolicyResponseDto(policy)
      );

      res.json({
        success: true,
        data: responseData,
        count: responseData.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi lấy danh sách chính sách",
        error: error.message,
      });
    }
  }

  // GET /api/policies/:id - Lấy chi tiết chính sách
  static async getPolicyById(req, res) {
    try {
      const { id } = req.params;
      const policy = await WarrantyPolicy.findById(id);

      if (!policy) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy chính sách",
        });
      }

      const responseDto = new WarrantyPolicyResponseDto(policy);
      res.json({
        success: true,
        data: responseDto,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi lấy thông tin chính sách",
        error: error.message,
      });
    }
  }

  // PATCH /api/policies/:id - Cập nhật chính sách
  static async updatePolicy(req, res) {
    try {
      const { id } = req.params;
      const updateDto = new UpdateWarrantyPolicyDto(req.body);
      const validation = updateDto.validate();

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: validation.newErrors,
        });
      }

      const policy = await WarrantyPolicy.findByIdAndUpdate(
        id,
        updateDto.toModel(),
        { new: true, runValidators: true }
      );

      if (!policy) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy chính sách",
        });
      }

      const responseDto = new WarrantyPolicyResponseDto(policy);
      res.json({
        success: true,
        message: "Cập nhật chính sách thành công",
        data: responseDto,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Lỗi cập nhật chính sách",
        error: error.message,
      });
    }
  }
  // DELETE /api/policies/:id - Xóa chính sách
  static async deletePolicy(req, res) {
    try {
      const { id } = req.params;
      await WarrantyPolicy.findByIdAndDelete(id);
      res.json({ success: true, message: "Xóa chính sách thành công" });
    } catch (error) {
      res.status(400).json({ success: false, message: "Lỗi xóa chính sách", error: error.message });
    }
  }
  

  static evaluateWarrantyForParts = async (parts, vehicle, claimDate) => {

    const evaluatedParts = [];

    for (const part of parts) {
      let result = { ...part };
      result.is_eligible = false;
      result.warranty_type = "customer_pay";
      result.reason = "";

      try {
        // Tìm policy phù hợp theo category
        const policy = await WarrantyPolicy.findOne({
          part_category: part.part_category,
          status: "active",
        });
        

        if (!policy) {
          result.reason = "Không tìm thấy chính sách bảo hành phù hợp";
          evaluatedParts.push(result);
          continue;
        }

        // Kiểm tra model xe
        if (!policy.model_applicable.includes(vehicle.model)) {
          result.reason = "Model xe không nằm trong phạm vi bảo hành";
          evaluatedParts.push(result);
          continue;
        }

        // Kiểm tra thời gian
        const claimTime = new Date(claimDate);
        const warrantyEnd = new Date(vehicle.warranty_end);
        if (claimTime > warrantyEnd) {
          result.reason = "Quá thời gian bảo hành";
          evaluatedParts.push(result);
          continue;
        }

        // Kiểm tra quãng đường
        if (policy.max_mileage && vehicle.kilometer > policy.max_mileage) {
          result.reason = "Xe đã vượt quá số km bảo hành";
          evaluatedParts.push(result);
          continue;
        }

        // Nếu đạt tất cả điều kiện
        result.is_eligible = true;
        result.warranty_type = "warranty";
        result.reason = "Hợp lệ theo chính sách bảo hành";
      } catch (error) {
        result.reason = "Lỗi xử lý chính sách bảo hành";
      }
      evaluatedParts.push(result);
    }

    return evaluatedParts;
  };
}

export default WarrantyPolicyController;
