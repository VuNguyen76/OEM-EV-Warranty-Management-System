const jwt = require("jsonwebtoken");
const redisService = require('../services/RedisService');

// Middleware xác thực JWT access token (đơn giản)
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Không tìm thấy token xác thực"
        });
    }

    try {
        // Verify access token with proper claims validation
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            issuer: 'warranty-system',
            audience: 'warranty-users'
        });

        // Validate required claims
        if (!decoded.sub) {
            return res.status(401).json({
                success: false,
                message: "Token thiếu thông tin user ID"
            });
        }

        if (!decoded.role) {
            return res.status(401).json({
                success: false,
                message: "Token thiếu thông tin role"
            });
        }

        // Check if token is blacklisted
        const isBlacklisted = await redisService.get(`blacklist:${token}`);
        if (isBlacklisted) {
            return res.status(401).json({
                success: false,
                message: "Token đã bị vô hiệu hóa"
            });
        }

        // Add userId alias for backward compatibility
        req.user = {
            ...decoded,
            userId: decoded.sub
        };
        next();
    } catch (error) {
        console.error('❌ Auth middleware error:', {
            error: error.message,
            token: token?.substring(0, 20) + '...',
            timestamp: new Date().toISOString()
        });

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: "Token đã hết hạn"
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: "Token không hợp lệ"
            });
        }

        return res.status(401).json({
            success: false,
            message: "Lỗi xác thực token"
        });
    }
};

// Middleware phân quyền với database validation
const authorizeRole = (...allowedRoles) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Chưa xác thực người dùng"
            });
        }

        // Check token role first (fast check)
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Không có quyền truy cập chức năng này",
                requiredRoles: allowedRoles,
                userRole: req.user.role
            });
        }

        // TODO: Add database role validation for sensitive operations
        // For now, rely on token role to avoid startup issues

        next();
    };
};

// Middleware kiểm tra quyền truy cập service center
const authorizeServiceCenter = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Chưa xác thực người dùng"
        });
    }

    // Admin có thể truy cập tất cả service center
    if (req.user.role === 'admin') {
        return next();
    }

    // Service staff chỉ có thể truy cập service center của mình
    if (req.user.role === 'service_staff') {
        const requestedCenter = req.params.centerName || req.body.serviceCenter;
        if (requestedCenter && requestedCenter !== req.user.serviceCenter) {
            return res.status(403).json({
                success: false,
                message: "Không có quyền truy cập service center này",
                userServiceCenter: req.user.serviceCenter,
                requestedServiceCenter: requestedCenter
            });
        }
    }

    next();
};

// Middleware kiểm tra quyền sửa đổi user
const authorizeUserModification = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Chưa xác thực người dùng"
        });
    }

    const targetUserId = req.params.id || req.params.userId;

    // Admin có thể sửa đổi tất cả user
    if (req.user.role === 'admin') {
        return next();
    }

    // User chỉ có thể sửa đổi thông tin của chính mình
    if (req.user.userId === targetUserId) {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: "Không có quyền sửa đổi thông tin user này"
    });
};

// Middleware kiểm tra user còn active không
const checkUserStatus = async (req, res, next) => {
    try {
        const userId = req.user.sub || req.user.userId;
        if (!req.user || !userId) {
            return res.status(401).json({
                success: false,
                message: "Token không hợp lệ"
            });
        }

        // Import User model dynamically to avoid circular dependency
        const User = require("../../User/Model/User");

        const user = await User.findById(userId);
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
    authorizeServiceCenter,
    authorizeUserModification,
    checkUserStatus
};
