const jwt = require("jsonwebtoken");
const redisService = require("../services/RedisService");

// Middleware xác thực JWT token với Redis cache
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
        // Check if token is blacklisted first
        const isBlacklisted = await redisService.isTokenBlacklisted(token);
        if (isBlacklisted) {
            return res.status(401).json({
                success: false,
                message: "Token đã bị thu hồi, vui lòng đăng nhập lại"
            });
        }

        // Check Redis cache
        const cachedUser = await redisService.getJWT(token);
        if (cachedUser) {
            req.user = cachedUser;
            return next();
        }

        // If not in cache, verify JWT
        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    message: "Token không hợp lệ hoặc đã hết hạn"
                });
            }

            // Cache the decoded token for 30 minutes
            await redisService.cacheJWT(token, decoded, 1800);

            req.user = decoded;
            next();
        });
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: "Lỗi xác thực token"
        });
    }
};

// Middleware phân quyền
const authorizeRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Chưa xác thực người dùng"
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Không có quyền truy cập chức năng này",
                requiredRoles: allowedRoles,
                userRole: req.user.role
            });
        }

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

module.exports = {
    authenticateToken,
    authorizeRole,
    authorizeServiceCenter,
    authorizeUserModification
};
