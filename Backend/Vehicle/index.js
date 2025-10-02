// Load biến môi trường từ file .env ở thư mục Backend (root) - chỉ khi không chạy trong Docker
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
}

const express = require("express");
const VehicleService = require("./Service/VehicleService");
const { setupCommonMiddleware } = require("../shared/middleware/common");
const { connectToVehicleDatabase } = require("../shared/database/vehicleConnection");
const redisService = require("../shared/services/RedisService");

const app = express();
const port = process.env.VEHICLE_SERVICE_PORT || 3002;

// Cấu hình middleware
setupCommonMiddleware(app);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/vehicles", VehicleService);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Vehicle service đang hoạt động',
        timestamp: new Date().toISOString(),
        services: {
            database: 'connected',
            redis: redisService.isConnected ? 'connected' : 'disconnected'
        }
    });
});

// API documentation endpoint
app.get('/api-docs', (req, res) => {
    res.json({
        success: true,
        message: 'Vehicle Service API Documentation',
        endpoints: {
            vehicles: {
                'POST /vehicles/register': 'Đăng ký xe mới theo VIN',
                'GET /vehicles/vin/:vin': 'Lấy thông tin xe theo VIN',
                'GET /vehicles/service-center/:centerName': 'Lấy danh sách xe theo trung tâm dịch vụ',
                'GET /vehicles/search': 'Tìm kiếm xe',
                'PUT /vehicles/:id': 'Cập nhật thông tin xe'
            },
            parts: {
                'POST /vehicles/:vehicleId/parts': 'Gắn phụ tùng vào xe',
                'GET /vehicles/:vehicleId/parts': 'Lấy danh sách phụ tùng của xe',
                'PUT /vehicles/:vehicleId/parts/:partId': 'Cập nhật trạng thái phụ tùng',
                'GET /vehicles/search/:serialNumber': 'Tìm kiếm phụ tùng theo số seri',
                'GET /vehicles/stats/overview': 'Thống kê phụ tùng'
            },
            serviceHistory: {
                'POST /vehicles/:vehicleId/service-history': 'Thêm lịch sử dịch vụ',
                'GET /vehicles/:vehicleId/service-history': 'Lấy lịch sử dịch vụ của xe',
                'PUT /vehicles/:vehicleId/service-history/:recordId': 'Cập nhật lịch sử dịch vụ',
                'GET /vehicles/service-center/:centerName/history': 'Lấy lịch sử dịch vụ theo trung tâm'
            }
        },
        authentication: {
            required: true,
            method: 'Bearer Token',
            roles: ['admin', 'service_staff', 'technician']
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Vehicle Service Error:', err);

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: Object.values(err.errors).map(e => e.message)
        });
    }

    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: 'ID không hợp lệ'
        });
    }

    if (err.code === 11000) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu đã tồn tại trong hệ thống'
        });
    }

    res.status(500).json({
        success: false,
        message: 'Lỗi server nội bộ',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint không tồn tại',
        availableEndpoints: '/api-docs'
    });
});

// Hàm khởi động server
const startServer = async () => {
    try {
        // Kết nối database trước
        await connectToVehicleDatabase();

        // Kết nối Redis
        await redisService.connect();

        // Sau đó khởi động server
        app.listen(port, () => {
            console.log('🚗 VEHICLE SERVICE RUNNING');
            console.log(`URL: http://localhost:${port}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`API Docs: http://localhost:${port}/api-docs`);
            console.log(`Started at: ${new Date().toLocaleTimeString()} ${new Date().toLocaleDateString()}\n`);
        });
    } catch (error) {
        console.error('❌ Failed to start Vehicle Service:', error.message);
        process.exit(1);
    }
};

startServer();

module.exports = app;
