import mongoose from "mongoose";
import technicianModel from "../models/TechnicianModel.js";
import UserModel from "../models/UserModel.js";
import bcrypt from "bcryptjs";
import serviceCenterModel from "../models/ServiceCenterModel.js";

class technicianController {
  static async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const total = await technicianModel.countDocuments();
      const totalPages = Math.ceil(total / limit);

      const technicians = await technicianModel
        .find()
        .populate("user_id")
        .populate("center_id")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
      res.status(200).json({
        success: true,
        data: technicians,
        message: "Lấy danh sách nhân viên thành công",
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
}

export default technicianController;
