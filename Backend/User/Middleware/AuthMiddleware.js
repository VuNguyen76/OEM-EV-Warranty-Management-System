const jwt = require("jsonwebtoken");
const User = require("../Model/User");

// Middleware xác thực JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Không tìm thấy token xác thực"
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: "Token không hợp lệ hoặc đã hết hạn"
            });
        }
        req.user = decoded;
        next();
    });
};

// Middleware kiểm tra role
const authorizeRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Chưa xác thực"
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Không có quyền truy cập"
            });
        }

        next();
    };
};

// Middleware kiểm tra user còn active không
const checkUserStatus = async (req, res, next) => {
    try {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({
                success: false,
                message: "Token không hợp lệ"
            });
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User không tồn tại"
            });
        }

        if (user.status !== "active") {
            return res.status(403).json({
                success: false,
                message: "Tài khoản đã bị vô hiệu hóa"
            });
        }

        req.currentUser = user;
        next();
    } catch (err) {
        console.error("Check user status error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi kiểm tra trạng thái user",
            error: err.message
        });
    }
};

module.exports = {
    authenticateToken,
    authorizeRole,
    checkUserStatus
};
