const express = require('express');
const { connectToVehicleDatabase } = require('../shared/database/vehicleConnection');
const redisService = require('../shared/services/RedisService');
const { authenticateToken, authorizeRole } = require('../shared/middleware/AuthMiddleware');
const { setupCommonMiddleware } = require('../shared/middleware/common');

const VehicleController = require('./Controller/VehicleController');

const app = express();
const port = process.env.PORT || process.env.VEHICLE_SERVICE_PORT || 3004;

setupCommonMiddleware(app);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Vehicle Service đang hoạt động',
        timestamp: new Date().toISOString(),
        service: 'Vehicle Service',
        port: port
    });
});

const initializeServices = async () => {
    try {
        await connectToVehicleDatabase();
        await redisService.connect();
        VehicleController.initializeModels();
    } catch (error) {
        process.exit(1);
    }
};

// Quản lý Xe (đường dẫn gốc để tương thích API Gateway)
app.get('/search', authenticateToken, authorizeRole('service_staff', 'admin', 'technician'), VehicleController.searchVehicles);
app.get('/statistics', authenticateToken, authorizeRole('service_staff', 'admin'), VehicleController.getVehicleStatistics);

// Route gốc cho getAllVehicles
app.get('/', authenticateToken, authorizeRole('service_staff', 'admin'), VehicleController.getAllVehicles);

// Route chuẩn cho getAllVehicles (for consistency)
app.get('/vehicles', authenticateToken, authorizeRole('service_staff', 'admin'), VehicleController.getAllVehicles);

// Routes có tham số CUỐI CÙNG
app.get('/vin/:vin', authenticateToken, authorizeRole('service_staff', 'admin', 'technician'), VehicleController.getVehicleByVIN);

// Routes POST/PUT
app.post('/register', authenticateToken, authorizeRole('service_staff', 'admin'), VehicleController.registerVehicle);
app.put('/:id', authenticateToken, authorizeRole('service_staff', 'admin'), VehicleController.updateVehicle);

const startServer = async () => {
    await initializeServices();

    const server = app.listen(port, () => {
        console.log(`🚀 Vehicle Service running on port ${port}`);
    });

    // Tắt server một cách nhẹ nhàng
    const gracefulShutdown = async (signal) => {
        console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

        server.close(async () => {
            try {
                const redisService = require('../shared/services/RedisService');
                await redisService.disconnect();
                console.log('✅ Redis disconnected');

                const mongoose = require('mongoose');
                await mongoose.connection.close();
                console.log('✅ MongoDB disconnected');

                console.log('✅ Vehicle Service shutdown complete');
                process.exit(0);
            } catch (error) {
                console.error('❌ Error during shutdown:', error);
                process.exit(1);
            }
        });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

startServer().catch((error) => {
    console.error('❌ Failed to start Vehicle service:', error);
    process.exit(1);
});
