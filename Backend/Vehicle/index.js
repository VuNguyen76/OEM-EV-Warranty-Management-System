const express = require('express');
const { connectToVehicleDatabase } = require('../shared/database/vehicleConnection');
const redisService = require('../shared/services/RedisService');
const { authenticateToken, authorizeRole } = require('../shared/middleware/AuthMiddleware');
const { setupCommonMiddleware } = require('../shared/middleware/common');

const VehicleController = require('./Controller/VehicleController');

const app = express();
const port = process.env.VEHICLE_SERVICE_PORT || 3004;

// Setup common middleware
setupCommonMiddleware(app);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Vehicle Service đang hoạt động',
        timestamp: new Date().toISOString(),
        service: 'Vehicle Service',
        port: port
    });
});

// Initialize services
const initializeServices = async () => {
    try {
        // Connect to Vehicle database
        await connectToVehicleDatabase();

        // Connect to Redis
        await redisService.connect();

        // Initialize models in controllers
        VehicleController.initializeModels();
    } catch (error) {
        process.exit(1);
    }
};

// Vehicle Management Routes (UC1: Đăng Ký Xe Theo VIN)
app.post('/vehicles/register', authenticateToken, authorizeRole('service_staff', 'admin'), VehicleController.registerVehicle);
app.get('/vehicles/vin/:vin', authenticateToken, authorizeRole('service_staff', 'admin', 'technician'), VehicleController.getVehicleByVIN);
app.get('/vehicles', authenticateToken, authorizeRole('service_staff', 'admin'), VehicleController.getAllVehicles);
app.put('/vehicles/:id', authenticateToken, authorizeRole('service_staff', 'admin'), VehicleController.updateVehicle);
app.get('/vehicles/search', authenticateToken, authorizeRole('service_staff', 'admin', 'technician'), VehicleController.searchVehicles);
app.get('/statistics/vehicles', authenticateToken, authorizeRole('service_staff', 'admin'), VehicleController.getVehicleStatistics);

// Start server
const startServer = async () => {
    await initializeServices();

    app.listen(port, () => {
        // Vehicle service started
    });
};

startServer().catch(() => {
    process.exit(1);
});
