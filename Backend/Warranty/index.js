const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import middleware
const { authenticateToken, authorizeRole } = require('../shared/middleware/AuthMiddleware');

// Import services and controllers
const redisService = require('../shared/services/RedisService');
const { connectToWarrantyDB } = require('../shared/database/warrantyConnection');
const WarrantyController = require('./Controller/WarrantyController');
const PartsController = require('./Controller/PartsController');
const ServiceHistoryController = require('./Controller/ServiceHistoryController');

const app = express();
const PORT = process.env.PORT || process.env.WARRANTY_PORT || 3002;


// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Quá nhiều requests từ IP này, vui lòng thử lại sau.'
});

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(','),
    credentials: true
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'Warranty Service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Routes
// Warranty Management (root paths for API Gateway compatibility)
app.post('/register', authenticateToken, authorizeRole('admin', 'service_staff'), WarrantyController.registerWarranty);
app.get('/warranties/:vin', authenticateToken, WarrantyController.getWarrantyByVIN);
app.get('/warranties', authenticateToken, WarrantyController.getAllWarranties);
app.put('/warranties/:vin', authenticateToken, authorizeRole('admin', 'service_staff'), WarrantyController.updateWarranty);
app.post('/warranties/:vin/activate', authenticateToken, authorizeRole('admin', 'service_staff'), WarrantyController.activateWarranty);
app.post('/warranties/:vin/void', authenticateToken, authorizeRole('admin', 'service_staff'), WarrantyController.voidWarranty);

// Parts Management (fix route order - specific routes before parameterized routes)
app.post('/parts', authenticateToken, authorizeRole('admin', 'service_staff'), PartsController.createPart);
app.get('/parts', authenticateToken, PartsController.getAllParts);
app.get('/parts/low-stock', authenticateToken, PartsController.getLowStockParts); // MOVED BEFORE :id
app.get('/parts/:id', authenticateToken, PartsController.getPartById);
app.put('/parts/:id', authenticateToken, authorizeRole('admin', 'service_staff'), PartsController.updatePart);
app.delete('/parts/:id', authenticateToken, authorizeRole('admin', 'service_staff'), PartsController.deletePart);

// Vehicle Parts (Installation/Replacement)
app.post('/vehicle-parts', authenticateToken, authorizeRole('admin', 'service_staff', 'technician'), PartsController.addPartToVehicle);
app.get('/vehicle-parts/:vin', authenticateToken, PartsController.getVehicleParts);

// Service History
app.post('/service-history', authenticateToken, authorizeRole('admin', 'service_staff', 'technician'), ServiceHistoryController.addServiceHistory);
app.get('/service-history/statistics', authenticateToken, ServiceHistoryController.getServiceStatistics);
app.get('/service-history/:vin', authenticateToken, ServiceHistoryController.getServiceHistoryByVIN);
app.get('/service-history', authenticateToken, ServiceHistoryController.getAllServiceHistories);
app.put('/service-history/:id', authenticateToken, authorizeRole('admin', 'service_staff', 'technician'), ServiceHistoryController.updateServiceHistory);

// Error handling middleware
app.use((err, req, res, next) => {
    // Check if response already sent
    if (res.headersSent) {
        return next(err);
    }

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

// Initialize services
const initializeServices = async () => {
    try {
        process.stderr.write('🔄 Starting Warranty service initialization...\n');
        console.log('🔄 Starting Warranty service initialization...');

        process.stderr.write('Connecting to database...\n');
        await connectToWarrantyDB();
        process.stderr.write('✅ Database connected\n');
        console.log('✅ Database connected');

        process.stderr.write('Connecting to Redis...\n');
        await redisService.connect();
        process.stderr.write('✅ Redis connected\n');
        console.log('✅ Redis connected');

        // Initialize controllers
        process.stderr.write('Initializing controllers...\n');
        WarrantyController.initializeModels();
        PartsController.initializeModels();
        ServiceHistoryController.initializeModels();
        process.stderr.write('✅ Controllers initialized\n');

        // Initialize warranty expiration job
        process.stderr.write('Initializing jobs...\n');
        const { initializeWarrantyExpirationJob } = require('../shared/jobs/WarrantyExpirationJob');
        const { initializeReservationReleaseJob } = require('../shared/jobs/ReservationReleaseJob');
        const warrantyConnection = require('../shared/database/warrantyConnection');
        const WarrantyVehicle = require('./Model/WarrantyVehicle')(warrantyConnection);
        const Reservation = require('./Model/Reservation')();

        const warrantyJob = initializeWarrantyExpirationJob(WarrantyVehicle);
        const reservationJob = initializeReservationReleaseJob(Reservation);

        // Store jobs for graceful shutdown
        process.warrantyExpirationJob = warrantyJob;
        process.reservationReleaseJob = reservationJob;
        process.stderr.write('✅ Jobs initialized\n');

        process.stderr.write('✅ Warranty service initialized successfully\n');
        console.log('✅ Warranty service initialized successfully');
    } catch (error) {
        process.stderr.write(`❌ Failed to initialize Warranty service: ${error.message}\n`);
        process.stderr.write(`Stack: ${error.stack}\n`);
        console.error('❌ Failed to initialize Warranty service:', error);
        process.exit(1);
    }
};

// Start server
initializeServices().then(() => {
    const server = app.listen(PORT, () => {
        console.log(`🚀 Warranty Service running on port ${PORT}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
        console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

        server.close(async () => {
            try {
                // Stop scheduled jobs
                if (process.warrantyExpirationJob) {
                    const { stopWarrantyExpirationJob } = require('../shared/jobs/WarrantyExpirationJob');
                    stopWarrantyExpirationJob(process.warrantyExpirationJob);
                }

                if (process.reservationReleaseJob) {
                    const { stopReservationReleaseJob } = require('../shared/jobs/ReservationReleaseJob');
                    stopReservationReleaseJob(process.reservationReleaseJob);
                }

                await redisService.disconnect();
                console.log('✅ Redis disconnected');

                const mongoose = require('mongoose');
                await mongoose.connection.close();
                console.log('✅ MongoDB disconnected');

                console.log('✅ Warranty Service shutdown complete');
                process.exit(0);
            } catch (error) {
                console.error('❌ Error during shutdown:', error);
                process.exit(1);
            }
        });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
});

module.exports = app;
