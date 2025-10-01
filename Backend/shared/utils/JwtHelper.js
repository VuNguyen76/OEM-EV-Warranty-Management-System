// shared/utils/JwtHelper.js
// Helper class để xử lý JWT token - DÙNG CHUNG CHO TẤT CẢ SERVICE

const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt.config');

/**
 * Class helper để tạo và xác thực JWT token
 * Sử dụng thuật toán HS256 (HMAC SHA-256)
 */
class JwtHelper {
    /**
     * Tạo access token mới
     * @param {Object} payload - Dữ liệu cần mã hóa vào token
     * @returns {String} - JWT token đã được mã hóa
     */
    static generateAccessToken(payload) {
        try {
            const token = jwt.sign(
                payload,
                jwtConfig.secret,
                {
                    algorithm: jwtConfig.algorithm,
                    expiresIn: jwtConfig.expiresIn,
                    issuer: jwtConfig.issuer,
                    audience: jwtConfig.audience,
                }
            );
            return token;
        } catch (error) {
            console.error('Lỗi khi tạo access token:', error.message);
            throw new Error('Không thể tạo access token');
        }
    }

    /**
     * Tạo refresh token mới
     * @param {Object} payload - Dữ liệu cần mã hóa
     * @returns {String} - Refresh token đã được mã hóa
     */
    static generateRefreshToken(payload) {
        try {
            const token = jwt.sign(
                payload,
                jwtConfig.secret,
                {
                    algorithm: jwtConfig.algorithm,
                    expiresIn: jwtConfig.refreshExpiresIn,
                    issuer: jwtConfig.issuer,
                    audience: jwtConfig.audience,
                }
            );
            return token;
        } catch (error) {
            console.error('Lỗi khi tạo refresh token:', error.message);
            throw new Error('Không thể tạo refresh token');
        }
    }

    /**
     * Xác thực và giải mã token
     * @param {String} token - JWT token cần xác thực
     * @returns {Object} - Dữ liệu đã được giải mã từ token
     */
    static verifyToken(token) {
        try {
            const decoded = jwt.verify(token, jwtConfig.secret, {
                algorithms: [jwtConfig.algorithm],
                issuer: jwtConfig.issuer,
                audience: jwtConfig.audience,
            });
            return decoded;
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token đã hết hạn');
            } else if (error.name === 'JsonWebTokenError') {
                throw new Error('Token không hợp lệ');
            } else if (error.name === 'NotBeforeError') {
                throw new Error('Token chưa có hiệu lực');
            } else {
                throw new Error('Lỗi xác thực token: ' + error.message);
            }
        }
    }

    /**
     * Giải mã token KHÔNG xác thực (chỉ đọc thông tin)
     * @param {String} token - JWT token cần giải mã
     * @returns {Object} - Dữ liệu đã được giải mã
     */
    static decodeToken(token) {
        try {
            const decoded = jwt.decode(token, { complete: true });
            if (!decoded) {
                throw new Error('Không thể giải mã token');
            }
            return decoded;
        } catch (error) {
            console.error('Lỗi khi giải mã token:', error.message);
            throw new Error('Token không hợp lệ');
        }
    }

    /**
     * Kiểm tra token có hết hạn chưa
     * @param {String} token - JWT token
     * @returns {Boolean} - true nếu token đã hết hạn
     */
    static isTokenExpired(token) {
        try {
            const decoded = jwt.decode(token);
            if (!decoded || !decoded.exp) {
                return true;
            }
            const currentTime = Math.floor(Date.now() / 1000);
            return decoded.exp < currentTime;
        } catch (error) {
            return true;
        }
    }

    /**
     * Lấy thời gian còn lại của token (giây)
     * @param {String} token - JWT token
     * @returns {Number} - Số giây còn lại
     */
    static getTokenRemainingTime(token) {
        try {
            const decoded = jwt.decode(token);
            if (!decoded || !decoded.exp) {
                return 0;
            }
            const currentTime = Math.floor(Date.now() / 1000);
            const remainingTime = decoded.exp - currentTime;
            return remainingTime > 0 ? remainingTime : 0;
        } catch (error) {
            return 0;
        }
    }
}

module.exports = JwtHelper;

