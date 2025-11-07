import UserModel from "../models/UserModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
      centerId: user.center_id,
      status: user.status,
    },
    process.env.JWT_SECRET
  );
};

class AuthController {
  static async login(req, res) {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Người dùng không tồn tại!" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Vui lòng kiểm tra lại mật khẩu!" });
    }

    const token = createToken(user);
    res.status(200).json({ success: true, data: { token } });
  }
  static async register(req, res) {
    try {
      const { email, password, role } = req.body;
      const userRequest = req.user;

      if (!email || !password || !role)
        return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });

      const exists = await UserModel.findOne({ email });
      if (exists)
        return res.status(409).json({ message: "Người dùng đã tồn tại" });

      const hashed = await bcrypt.hash(password, 10);

      const user = await UserModel.create({
        email,
        password: hashed,
        role,
        center_id: userRequest?.centerId,
        status: "inactive",
      });

      const token = createToken(user);

      return res.status(201).json({
        success: true,
        message: "Tạo tài khoản thành công!",
        data: { token },
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}

export default AuthController;
