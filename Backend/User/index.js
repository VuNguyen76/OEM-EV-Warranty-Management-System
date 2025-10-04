// User/index.js
// File khởi động User Service

// Load biến môi trường từ file .env ở thư mục Backend (root) - chỉ khi không chạy trong Docker
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
}

const express = require("express");
const cookieParser = require("cookie-parser");
const UserService = require("./Service/UserService");
const AuthController = require("./Controller/AuthController");
const { setupCommonMiddleware } = require("../shared/middleware/common");
const connectToUserDatabase = require("../shared/database/userConnection");
const redisService = require("../shared/services/RedisService");

const app = express();
const port = process.env.PORT || process.env.USER_SERVICE_PORT || 3001;

// Cấu hình middleware
setupCommonMiddleware(app);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Add cookie parser middleware

// Routes
app.use("/users", UserService);
app.use("/auth", AuthController); // Auth routes

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'User service đang hoạt động',
        timestamp: new Date().toISOString()
    });
});

// Khởi động server và kết nối database
const startServer = async () => {
    try {
        // Kết nối database trước
        await connectToUserDatabase();

        // Kết nối Redis
        await redisService.connect();

        // Sau đó khởi động server
        app.listen(port, () => {
            console.log('USER SERVICE RUNNING');
            console.log(`URL: http://localhost:${port}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Started at: ${new Date().toLocaleString('vi-VN')}`);
        });
    } catch (error) {
        console.error('❌ Failed to start User Service:', error.message);
        process.exit(1);
    }
};

// Bắt đầu server
startServer();