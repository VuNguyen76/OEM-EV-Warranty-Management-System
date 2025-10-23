import UserModel from "../models/UserModel.js";
import jwt from "jsonwebtoken";

const createToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
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
    res.status(200).json({ success: true, data: { user, token } });
  }
  static async logout(req, res) {}

  static async register(req, res) {
    const { name, email, password } = req.body;
    const user = await UserModel.findOne({ email });
    if (user) {
      return res
        .status(401)
        .json({ success: false, message: "Người dùng đã tồn tại!" });
    }
    if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      return res
        .status(401)
        .json({ success: false, message: "Email không hợp lệ!" });
    }
    
  }
}

export default AuthController;
