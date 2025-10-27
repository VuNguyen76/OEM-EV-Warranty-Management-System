import serviceCenterModel from "../models/ServiceCenterModel.js";
import UserModel from "../models/UserModel.js";
import bcrypt from "bcryptjs";

class serviceCenterController {
  static async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const total = await serviceCenterModel.countDocuments();
      const totalPages = Math.ceil(total / limit);

      const centers = await serviceCenterModel
        .find()
        .populate("user_id", "name email password")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
      res.status(200).json({
        success: true,
        data: centers,
        message: "Lấy danh sách trung tâm thành công",
        pagination: {
          total,
          totalPages: totalPages,
          currentPage: page,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getById(req, res) {
    try {
      //Chỉ admin hoặc nhân viên của trung tâm đó mới có thể lấy được thông tin của trung tâm đó
      const id = req.params.id;
      const userRequest = req.user;
      if (
        userRequest.role !== "admin" &&
        userRequest.center_id.toString() !== id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền truy cập thông tin trung tâm khác!",
        });
      }

      const center = await serviceCenterModel
        .findById(id)
        .populate("user_id", "name email password");

      if (!center) {
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy trung tâm" });
      }

      res
        .status(200)
        .json({ success: true, data: center, message: "Tìm thấy trung tâm" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async create(req, res) {
    try {
      const { name, email, password } = req.body;
      const exists = await UserModel.findOne({ email });
      if (exists) {
        return res
          .status(409)
          .json({ success: false, message: "Trung tâm đã tồn tại!" });
      }
      const hashed = await bcrypt.hash(password, 10);

      const center = await UserModel.create({
        name,
        email,
        password: hashed,
        role: "sc_staff",
      });
      await serviceCenterModel.create({ user_id: center._id });
      res.status(201).json({
        success: true,
        data: center,
        message: "Tạo trung tâm thành công",
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async update(req, res) {
    try {
      const updated = await serviceCenterModel.findByIdAndUpdate(
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
          .json({ success: false, message: "Không tìm thấy trung tâm" });
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
      const deleted = await serviceCenterModel.findByIdAndDelete(req.params.id);
      await UserModel.findByIdAndDelete(deleted.user_id);
      
      if (!deleted) {
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy trung tâm" });
      }
      res.status(200).json({ success: true, message: "Xóa thành công" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default serviceCenterController;
