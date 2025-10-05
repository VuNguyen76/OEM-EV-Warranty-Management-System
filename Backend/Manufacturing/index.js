const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
// Swagger disabled for now
// const swaggerUi = require('swagger-ui-express');
// const swaggerJsdoc = require('swagger-jsdoc');

// Import middleware
const { authenticateToken, authorizeRole } = require('../shared/middleware/AuthMiddleware');

// Import controllers
const VehicleModelController = require('./Controller/VehicleModelController');
const ProductionController = require('./Controller/ProductionController');

const app = express();
const PORT = process.env.MANUFACTURING_PORT || 3003;

// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Manufacturing Service API',
            version: '1.0.0',
            description: 'API for vehicle manufacturing management'
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
                description: 'Manufacturing Service'
            }
        ]
    },
    apis: ['./Manufacturing/Service/*.js']
};

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

// API Documentation - disabled for now
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'Manufacturing Service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Initialize database connection
const { connectToManufacturingDB } = require('../shared/database/manufacturingConnection');

// Initialize database on startup
connectToManufacturingDB().catch(err => {
    process.exit(1);
});

// Initialize models
app.use((req, res, next) => {
    try {
        VehicleModelController.initializeModels();
        ProductionController.initializeModels();
        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khởi tạo hệ thống'
        });
    }
});

// Routes
// Vehicle Model Management
app.post('/models', authenticateToken, authorizeRole('admin', 'manufacturer_staff'), VehicleModelController.createVehicleModel);
app.get('/models', authenticateToken, VehicleModelController.getAllVehicleModels);
app.get('/models/:id', authenticateToken, VehicleModelController.getVehicleModelById);
app.put('/models/:id', authenticateToken, authorizeRole('admin', 'manufacturer_staff'), VehicleModelController.updateVehicleModel);
app.delete('/models/:id', authenticateToken, authorizeRole('admin', 'manufacturer_staff'), VehicleModelController.deleteVehicleModel);

// Vehicle Production
app.post('/production', authenticateToken, authorizeRole('admin', 'manufacturer_staff'), ProductionController.createVehicle);
app.get('/production', authenticateToken, ProductionController.getAllProducedVehicles);
app.get('/production/:vin', authenticateToken, ProductionController.getVehicleByVIN);
app.put('/production/:vin', authenticateToken, authorizeRole('admin', 'manufacturer_staff'), ProductionController.updateVehicle);

// Production Statistics
app.get('/statistics/production', authenticateToken, ProductionController.getProductionStatistics);
app.get('/statistics/models', authenticateToken, VehicleModelController.getModelStatistics);

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
    // Manufacturing service started
});

module.exports = app;
