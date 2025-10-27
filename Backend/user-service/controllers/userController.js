import UserModel from "../models/UserModel.js";

class UserController {
  static async getAll(req, res) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;

      const skip = (page - 1) * limit;
      const total = await UserModel.countDocuments();
      const totalPages = Math.ceil(total / limit);

      const users = await UserModel.find()
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }); //Sắp xếp từ mới đến cũ

      res.status(200).json({
        success: true,
        message: "Danh sách người dùng",
        data: users,
        total,
        totalPages,
        currentPage: page,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getById(req, res) {
    try {
      const id = req.params.id;
      const userRequest = req.user;

      if (
        userRequest.role !== "admin" &&
        userRequest.role !== "sc-staff" &&
        userRequest.id !== id
      ) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền truy cập thông tin người khác!",
        });
      }

      const user = await UserModel.findById(id);

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy người dùng" });
      }
      res.status(200).json({
        success: true,
        data: user,
        message: "Lấy thông tin người dùng thành công",
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async update(req, res) {
    try {
      const id = req.params.id;
      const user = await UserModel.findByIdAndUpdate(id, req.body, {
        new: true,
      });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy người dùng" });
      }
      res.status(200).json({
        success: true,
        data: user,
        message: "Cập nhật người dùng thành công",
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async delete(req, res) {
    try {
      const id = req.params.id;
      const user = await UserModel.findByIdAndDelete(id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy người dùng" });
      }
      res
        .status(200)
        .json({
          success: true,
          data: user,
          message: "Xóa người dùng thành công",
        });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default UserController;
