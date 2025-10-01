// api-gateway/services/AuthService.js
const JwtHelper = require('../../shared/utils/JwtHelper');
const jwtConfig = require('../../shared/config/jwt.config');

/**
 * Service xác thực người dùng qua JWT token
 */
class AuthService {
    constructor() {
        this.jwtHelper = JwtHelper;
    }

    /**
     * Middleware xác thực token
     */
    authenticate(req, res, next) {
        try {
            const authHeader = req.headers[jwtConfig.headerName.toLowerCase()];

            if (!authHeader) {
                return res.status(401).json({
                    success: false,
                    message: 'Không tìm thấy token xác thực'
                });
            }

            if (!authHeader.startsWith(jwtConfig.tokenPrefix + ' ')) {
                return res.status(401).json({
                    success: false,
                    message: 'Format token không đúng. Phải là: Bearer <token>'
                });
            }

            const token = authHeader.split(' ')[1];

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Token không được để trống'
                });
            }

            // Xác thực và giải mã token bằng HS256
            const decoded = this.jwtHelper.verifyToken(token);

            // Lưu thông tin user vào request
            req.user = decoded;
            req.token = token;

            console.log(`✓ Xác thực thành công - User: ${decoded.userId || decoded.id}`);

            next();

        } catch (error) {
            console.error('✗ Lỗi xác thực:', error.message);

            if (error.message.includes('hết hạn')) {
                return res.status(401).json({
                    success: false,
                    message: 'Token đã hết hạn'
                });
            } else {
                return res.status(401).json({
                    success: false,
                    message: 'Token không hợp lệ'
                });
            }
        }
    }
}

module.exports = AuthService;