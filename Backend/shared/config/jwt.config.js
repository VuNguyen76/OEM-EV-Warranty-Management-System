// shared/config/jwt.config.js
// File cấu hình JWT dùng chung cho tất cả các service

/**
 * Cấu hình JWT cho hệ thống
 * - Algorithm: HS256 (HMAC SHA-256)
 * - Secret key: Lấy từ biến môi trường
 */
const dotenv = require("dotenv");
const path = require("path");
dotenv.config(path.resolve(__dirname, "../../.env"));
const jwtConfig = {
    // Secret key để mã hóa/giải mã JWT (phải giống nhau ở tất cả service)
    secret: process.env.JWT_SECRET,

    // Thuật toán mã hóa (HS256 = HMAC SHA-256)
    algorithm: 'HS256',

    // Thời gian hết hạn của token
    expiresIn: '24h', // Token hết hạn sau 24 giờ

    // Thời gian hết hạn của refresh token
    refreshExpiresIn: '7d', // Refresh token hết hạn sau 7 ngày

    // Issuer - Tên hệ thống phát hành token
    issuer: 'OEM-EV-Warranty-System',

    // Audience - Đối tượng sử dụng token
    audience: 'warranty-api',

    // Header name cho token
    headerName: 'Authorization',

    // Prefix cho token trong header (Bearer <token>)
    tokenPrefix: 'Bearer',
};

module.exports = jwtConfig;

