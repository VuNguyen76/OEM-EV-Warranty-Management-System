import technician from "../models/TechnicianModel.js";
import technicianModel from "../models/TechnicianModel.js";
import UserModel from "../models/UserModel.js";
import axios from "axios";

class technicianController {
  static async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const activeTechnicians = await technicianModel
        .find()
        .populate("user_id", "email status")
        .populate("center_id", "name address email")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const inactiveUsers = await UserModel.find({
        role: "sc_technician",
        status: "inactive",
      }).select("email status createdAt");

      const activeDto = activeTechnicians.map((t) => ({
        _id: t._id,
        user_id: t.user_id?._id,
        center_id: t.center_id?._id,
        center_name: t.center_id?.name || null,
        center_address: t.center_id?.address || null,
        center_email: t.center_id?.email || null,
        name: t.name,
        phone: t.phone,
        totalClaims: t.workload || 0,
        email: t.user_id?.email || null,
        status: t.status || "active",
        createdAt: t.createdAt,
      }));

      const inactiveDto = inactiveUsers.map((u) => ({
        _id: u._id,
        user_id: u._id,
        center_id: null,
        center_name: null,
        center_address: null,
        center_email: null,
        name: null,
        phone: null,
        totalClaims: 0,
        email: u.email,
        status: u.status, // inactive
        createdAt: u.createdAt,
      }));

      const allTechnicians = [...activeDto, ...inactiveDto].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      const total = activeDto.length + inactiveDto.length;
      const totalPages = Math.ceil(total / limit);

      res.status(200).json({
        success: true,
        data: allTechnicians,
        message: "Lấy danh sách kỹ thuật viên thành công",
        pagination: {
          total,
          totalPages,
          currentPage: page,
        },
      });
    } catch (error) {
      console.error("Lỗi getAll technicians:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async getById(req, res) {
    try {
      //Chỉ admin hoặc nhân viên của nhân viên đó mới có thể lấy được thông tin của nhân viên đó
      const id = req.params.id;
      const userRequest = req.user;
      if (
        userRequest.role !== "admin" &&
        userRequest.user_id.toString() !== id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền truy cập thông tin nhân viên khác!",
        });
      }

      const technician = await technicianModel
        .findById(id)
        .populate("user_id")
        .populate("center_id");

      if (!technician) {
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy nhân viên" });
      }

      res.status(200).json({
        success: true,
        data: technician,
        message: "Tìm thấy nhân viên",
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async create(req, res) {
    try {
      const { name, phone } = req.body;
      const user = await UserModel.findById(req.user.id);

      if (user.status === "active") {
        return res.status(403).json({
          success: false,
          message: "Nhân viên đã tồn tại!",
        });
      }


      const technician = await technicianModel.create({
        name,
        phone,
        center_id: user.center_id,
        user_id: user._id,
      });
      await UserModel.findByIdAndUpdate(user.id, {
        center_id: user.center_id,
        status: "active",
      });
      res.status(201).json({
        success: true,
        data: technician,
        message: "Tạo nhân viên thành công",
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async update(req, res) {
    try {
      const updated = await technicianModel.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true,
        }
      );
      if (!updated) {
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy nhân viên" });
      }
      res
        .status(200)
        .json({ success: true, data: updated, message: "Cập nhật thành công" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const deleted = await UserModel.findByIdAndDelete(req.params.id);
      await technicianModel.findOneAndDelete({ user_id: req.params.id });
      if (!deleted) {
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy nhân viên" });
      }
      res
        .status(200)
        .json({ success: true, message: "Xóa nhân viên thành công" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async assignTechnician(req, res) {
    try {
      const { technician_id, claim_id } = req.body;

      const token = req.token;      
      const response = await axios.post(
        `${process.env.WARRANTY_SERVICE_URL}/claims/${claim_id}/assign`,
        { technician_id },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
   
      if (!response.data.success) {
        return res
          .status(400)
          .json({ success: false, message: response.data.message });
      }

      await technicianModel.findByIdAndUpdate(technician_id, {
        $inc: { workload: 1 },
      });
      res
        .status(200)
        .json({
          success: true,
          data: response.data,
          message: "Phân công thành công",
        });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getTechnicianByUserId(req, res) {
    try {
      const { user_id } = req.params;
      const technician = await technicianModel.findOne({ user_id });
      if (!technician) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy technician với user_id này"
        });
      }

      res.status(200).json({
        success: true,
        data: technician
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }
}

export default technicianController;
