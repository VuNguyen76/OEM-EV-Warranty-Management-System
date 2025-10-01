// api-gateway/app.js
// File khởi tạo Express app cho API Gateway

const express = require("express");
const { setupCommonMiddleware } = require("../shared/middleware/common");
const GatewayService = require("./services/GatewayService");

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

        // Gateway
        this.gatewayService = new GatewayService(this.app);
    }

    start(port) {
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

