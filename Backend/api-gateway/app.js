// api-gateway/app.js
// File khởi tạo Express app cho API Gateway

const express = require("express");
const { setupCommonMiddleware } = require("../shared/middleware/common");
const GatewayService = require("./services/GatewayService");
const redisService = require("../shared/services/RedisService");
const {
    apiRateLimit,
    loginRateLimit,
    registerRateLimit,
    strictRateLimit
} = require("../shared/middleware/RateLimitMiddleware");

/**
 * Class App - Khởi tạo và cấu hình API Gateway
 */
class App {
    constructor() {
        // Khởi tạo Express app
        this.app = express();

        // Cấu hình middleware chung
        setupCommonMiddleware(this.app);

        // Thêm body parser
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Production ready - no debug logging

        // ===== SECURITY MIDDLEWARE =====
        // General API rate limiting - Apply to all requests
        this.app.use(apiRateLimit);

        // Specific rate limiting for auth endpoints
        this.app.use('/api/auth/login', loginRateLimit);
        this.app.use('/api/auth/register', registerRateLimit);

        // Strict rate limiting for sensitive operations
        this.app.use('/api/users/delete', strictRateLimit);
        this.app.use('/api/users/update-role', strictRateLimit);

        // Gateway
        this.gatewayService = new GatewayService(this.app);
    }

    async start(port) {
        // Khởi tạo Redis connection
        try {
            await redisService.connect();
            console.log('✅ Redis connected for rate limiting');
        } catch (error) {
            console.warn('⚠️ Redis connection failed, rate limiting will be disabled:', error.message);
        }

        // Khởi tạo routes
        this.gatewayService.initRoutes();

        // Bắt đầu lắng nghe
        this.app.listen(port, () => {
            console.log('API GATEWAY RUNNING');
            console.log(`URL: http://localhost:${port}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Started at: ${new Date().toLocaleString('vi-VN')}`);
        });
    }
}

module.exports = App;

