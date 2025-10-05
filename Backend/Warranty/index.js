const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
// const swaggerUi = require('swagger-ui-express');
// const swaggerJsdoc = require('swagger-jsdoc');

// Import middleware
const { authenticateToken, authorizeRole } = require('../shared/middleware/AuthMiddleware');

// Import controllers
const WarrantyController = require('./Controller/WarrantyController');
const PartsController = require('./Controller/PartsController');
const ServiceHistoryController = require('./Controller/ServiceHistoryController');

const app = express();
const PORT = process.env.WARRANTY_PORT || 3002;

// Swagger configuration - DISABLED
// const swaggerOptions = {
//     definition: {
//         openapi: '3.0.0',
//         info: {
//             title: 'Warranty Service API',
//             version: '1.0.0',
//             description: 'API for warranty management and service center operations'
//         },
//         servers: [
//             {
//                 url: `http://localhost:${PORT}`,
//                 description: 'Warranty Service'
//             }
//         ]
//     },
//     apis: ['./Warranty/Service/*.js']
// };

// const specs = swaggerJsdoc(swaggerOptions);

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Quá nhiều requests từ IP này, vui lòng thử lại sau.'
});

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Documentation - DISABLED
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'Warranty Service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Initialize database connection
const { connectToWarrantyDB } = require('../shared/database/warrantyConnection');

// Initialize database on startup
connectToWarrantyDB().catch(err => {
    process.exit(1);
});

// Initialize models once on startup
try {
    WarrantyController.initializeModels();
    PartsController.initializeModels();
    ServiceHistoryController.initializeModels();
} catch (error) {
    process.exit(1);
}

// Routes
// Warranty Management
app.post('/warranty/register', authenticateToken, authorizeRole('admin', 'service_staff'), WarrantyController.registerWarranty);
app.get('/warranty/:vin', authenticateToken, WarrantyController.getWarrantyByVIN);
app.get('/warranty', authenticateToken, WarrantyController.getAllWarranties);
app.put('/warranty/:vin', authenticateToken, authorizeRole('admin', 'service_staff'), WarrantyController.updateWarranty);
app.post('/warranty/:vin/activate', authenticateToken, authorizeRole('admin', 'service_staff'), WarrantyController.activateWarranty);
app.post('/warranty/:vin/void', authenticateToken, authorizeRole('admin', 'service_staff'), WarrantyController.voidWarranty);

// Parts Management
app.post('/parts', authenticateToken, authorizeRole('admin', 'service_staff'), PartsController.createPart);
app.get('/parts', authenticateToken, PartsController.getAllParts);
app.get('/parts/:id', authenticateToken, PartsController.getPartById);
app.put('/parts/:id', authenticateToken, authorizeRole('admin', 'service_staff'), PartsController.updatePart);
app.delete('/parts/:id', authenticateToken, authorizeRole('admin', 'service_staff'), PartsController.deletePart);
app.get('/parts/low-stock', authenticateToken, PartsController.getLowStockParts);

// Vehicle Parts (Installation/Replacement)
app.post('/vehicle-parts', authenticateToken, authorizeRole('admin', 'service_staff', 'technician'), PartsController.addPartToVehicle);
app.get('/vehicle-parts/:vin', authenticateToken, PartsController.getVehicleParts);

// Service History
app.post('/service-history', authenticateToken, authorizeRole('admin', 'service_staff', 'technician'), ServiceHistoryController.addServiceHistory);
app.get('/service-history/:vin', authenticateToken, ServiceHistoryController.getServiceHistoryByVIN);
app.get('/service-history', authenticateToken, ServiceHistoryController.getAllServiceHistories);
app.put('/service-history/:id', authenticateToken, authorizeRole('admin', 'service_staff', 'technician'), ServiceHistoryController.updateServiceHistory);
app.get('/service-history/statistics', authenticateToken, ServiceHistoryController.getServiceStatistics);

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

// Start server
app.listen(PORT, () => {
    // Warranty service started
});

module.exports = app;
