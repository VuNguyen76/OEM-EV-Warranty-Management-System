import serviceCenterModel from "../models/ServiceCenterModel.js";
import UserModel from "../models/UserModel.js";
import bcrypt from "bcryptjs";

class serviceCenterController {
  static async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const activeCenters = await serviceCenterModel
        .find()
        .populate("user_id", "email")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const inactiveCenters = await UserModel.find({
        role: "sc_staff",
        status: "inactive",
      }).select("email status createdAt");

      const allCenters = [
        ...activeCenters.map((c) => ({
          _id: c._id,
          user_id: c.user_id._id,
          name: c.name,
          phone: c.phone,
          address: c.address,
          email: c.user_id.email,
          claims: c.claims,
          staffs: c.staffs,
          status: "active",
          createdAt: c.createdAt,
        })),
        ...inactiveCenters.map((u) => ({
          _id: u._id,
          user_id: u._id,
          name: null,
          phone: null,
          address: null,
          email: u.email,
          claims: null,
          staffs: null,
          status: "inactive",
          createdAt: u.createdAt,
        })),
      ];

      allCenters.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.status(200).json({
        success: true,
        data: allCenters,
        message: "Lấy danh sách trung tâm thành công",
        total: allCenters.length,
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
        userRequest.role !== "evm_staff" &&
        (!userRequest.center_id ||
          userRequest.center_id.toString() !== id.toString())
      ) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền truy cập thông tin trung tâm khác!",
        });
      }

      const center = await serviceCenterModel
        .findById(id)
        .populate("user_id", "email");

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
      const { name, phone, address } = req.body;
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Trung tâm chưa được khởi tạo!" });
      }

      if (user.center_id) {
        return res
          .status(400)
          .json({ success: false, message: "Trung tâm đã tồn tại!" });
      }
      const center = await serviceCenterModel.create({
        user_id: user._id,
        name,
        phone,
        address,
      });
      await UserModel.findByIdAndUpdate(user._id, {
        center_id: center._id,
        status: "active",
      });

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
      const id = req.params.id;

      const center = await serviceCenterModel.findById(id);

      if (!center) {
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy trung tâm" });
      }

      if (center.user_id) {
        await UserModel.findByIdAndDelete(center.user_id);
      }

      await serviceCenterModel.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: "Xóa trung tâm và tài khoản liên kết thành công",
        data: { deletedCenterId: id, deletedUserId: center.user_id },
      });
    } catch (error) {
      console.error("Lỗi khi xóa trung tâm:", error.message);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default serviceCenterController;
