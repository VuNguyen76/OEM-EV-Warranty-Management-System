const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import middleware
const { authenticateToken, authorizeRole } = require('../shared/middleware/AuthMiddleware');

// Import services and controllers
const redisService = require('../shared/services/RedisService');
const connectToUserDatabase = require('../shared/database/userConnection');
const ServiceCenterController = require('../shared/Controller/ServiceCenterController');

const app = express();
const PORT = process.env.PORT || process.env.SERVICE_CENTER_PORT || 3004;

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
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

// Set default charset to UTF-8
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'Service Center Service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Service Center Management Routes

// Public/All authenticated routes
app.get('/service-centers/active/list', 
    authenticateToken, 
    ServiceCenterController.getActiveServiceCenters
);

// Statistics
app.get('/service-centers/statistics/overview',
    authenticateToken,
    authorizeRole('admin', 'oem_staff'),
    ServiceCenterController.getServiceCenterStatistics
);

// CRUD operations
app.post('/service-centers',
    authenticateToken,
    authorizeRole('admin'),
    ServiceCenterController.createServiceCenter
);

app.get('/service-centers',
    authenticateToken,
    authorizeRole('admin', 'oem_staff', 'service_staff'),
    ServiceCenterController.getAllServiceCenters
);

app.get('/service-centers/code/:code',
    authenticateToken,
    authorizeRole('admin', 'oem_staff', 'service_staff'),
    ServiceCenterController.getServiceCenterByCode
);

app.get('/service-centers/:id',
    authenticateToken,
    authorizeRole('admin', 'oem_staff', 'service_staff'),
    ServiceCenterController.getServiceCenterById
);

app.put('/service-centers/:id',
    authenticateToken,
    authorizeRole('admin'),
    ServiceCenterController.updateServiceCenter
);

app.put('/service-centers/:id/status',
    authenticateToken,
    authorizeRole('admin'),
    ServiceCenterController.updateServiceCenterStatus
);

app.delete('/service-centers/:id',
    authenticateToken,
    authorizeRole('admin'),
    ServiceCenterController.deleteServiceCenter
);

// Error handling middleware
app.use((err, req, res, next) => {
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
        message: 'Endpoint không tồn tại'
    });
});

// Initialize services
const initializeServices = async () => {
    try {
        process.stderr.write('🔄 Starting Service Center service initialization...\n');
        console.log('🔄 Starting Service Center service initialization...');

        process.stderr.write('Connecting to database...\n');
        await connectToUserDatabase();
        process.stderr.write('✅ Database connected\n');
        console.log('✅ Database connected');

        process.stderr.write('Connecting to Redis...\n');
        await redisService.connect();
        process.stderr.write('✅ Redis connected\n');
        console.log('✅ Redis connected');

        process.stderr.write('✅ Service Center service initialized successfully\n');
        console.log('✅ Service Center service initialized successfully');
    } catch (error) {
        process.stderr.write(`❌ Failed to initialize Service Center service: ${error.message}\n`);
        process.stderr.write(`Stack: ${error.stack}\n`);
        console.error('❌ Failed to initialize Service Center service:', error);
        process.exit(1);
    }
};

// Start server
initializeServices().then(() => {
    const server = app.listen(PORT, () => {
        console.log(`🚀 Service Center Service running on port ${PORT}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
        console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

        server.close(async () => {
            try {
                await redisService.disconnect();
                console.log('✅ Redis disconnected');

                const mongoose = require('mongoose');
                await mongoose.connection.close();
                console.log('✅ MongoDB disconnected');

                console.log('✅ Service Center Service shutdown complete');
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
