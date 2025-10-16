const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import middleware
const { authenticateToken, authorizeRole } = require('../shared/middleware/AuthMiddleware');

// Import services and controllers
const redisService = require('../shared/services/RedisService');
const { connectToWarrantyDB } = require('../shared/database/warrantyConnection');
const WarrantyController = require('./Controller/WarrantyController');
const WarrantyActivationController = require('./Controller/WarrantyActivationController');
const PartsController = require('./Controller/PartsController');
const ServiceHistoryController = require('./Controller/ServiceHistoryController');
const RecallCampaignController = require('./Controller/RecallCampaignController');
const CostController = require('./Controller/CostController');

const app = express();
const PORT = process.env.PORT || process.env.WARRANTY_PORT || 3002;

// Giới hạn tốc độ
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 100, // giới hạn mỗi IP 100 requests mỗi windowMs
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

// Phục vụ file tĩnh cho uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Kiểm tra sức khỏe
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'Warranty Service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Quản lý bảo hành
app.post('/warranties/activate', authenticateToken, authorizeRole('admin', 'service_staff', 'technician'), WarrantyActivationController.activateWarranty);
app.get('/warranties/:vin', authenticateToken, WarrantyController.getWarrantyByVIN);
app.get('/warranties', authenticateToken, WarrantyController.getWarrantiesByServiceCenter);
app.get('/warranties/status/:vin', authenticateToken, WarrantyController.checkWarrantyStatus);

// Quản lý phụ tùng
app.post('/parts', authenticateToken, authorizeRole('admin', 'service_staff'), PartsController.createPart);
app.get('/parts', authenticateToken, PartsController.getAllParts);
app.get('/parts/low-stock', authenticateToken, PartsController.getLowStockParts);
app.get('/parts/:id', authenticateToken, PartsController.getPartById);
app.put('/parts/:id', authenticateToken, authorizeRole('admin', 'service_staff'), PartsController.updatePart);
app.delete('/parts/:id', authenticateToken, authorizeRole('admin', 'service_staff'), PartsController.deletePart);
const WarrantyClaimController = require('./Controller/WarrantyClaimController');
const { uploadMultipleFiles, handleMulterError } = require('../shared/middleware/MulterMiddleware');
// Import warranty results specific middleware
const {
    uploadMultipleResultPhotos,
    handleWarrantyResultsUploadError,
    validateResultPhotos
} = require('../shared/middleware/WarrantyResultsFileUpload');

// Gắn phụ tùng vào xe
app.post('/vehicle-parts', authenticateToken, authorizeRole('admin', 'service_staff', 'technician'), PartsController.addPartToVehicle);
app.get('/vehicle-parts/:vin', authenticateToken, PartsController.getVehicleParts);

// Lịch sử dịch vụ - with file upload support
app.post('/service-history',
    authenticateToken,
    authorizeRole('admin', 'service_staff', 'technician'),
    uploadMultipleFiles,
    handleMulterError,
    ServiceHistoryController.addServiceHistory
);
app.get('/service-history/statistics', authenticateToken, ServiceHistoryController.getServiceStatistics);
app.get('/service-history/:vin', authenticateToken, ServiceHistoryController.getServiceHistoryByVIN);
app.get('/service-history', authenticateToken, ServiceHistoryController.getAllServiceHistories);
app.put('/service-history/:id', authenticateToken, authorizeRole('admin', 'service_staff', 'technician'), ServiceHistoryController.updateServiceHistory);

// Phê Duyệt/Từ Chối Yêu Cầu (MUST be FIRST - before ANY other claims routes)
app.get('/claims/for-approval', authenticateToken, authorizeRole('service_staff', 'admin'), WarrantyClaimController.getClaimsForApproval);

// Tạo yêu cầu bảo hành
app.post('/claims', authenticateToken, authorizeRole('service_staff', 'technician', 'admin'), WarrantyClaimController.createWarrantyClaim);



// Đính kèm báo cáo kiểm tra (với file upload)
app.post('/claims/:claimId/attachments',
    authenticateToken,
    authorizeRole('service_staff', 'technician', 'admin'),
    uploadMultipleFiles,
    handleMulterError,
    WarrantyClaimController.addClaimAttachment
);

// Theo Dõi Trạng Thái Yêu Cầu (MUST be before /claims/:claimId)
app.get('/claims/:claimId/status-history', authenticateToken, WarrantyClaimController.getClaimStatusHistory);

// Phê Duyệt/Từ Chối Yêu Cầu (specific claim actions)
app.put('/claims/:claimId/approve', authenticateToken, authorizeRole('service_staff', 'admin'), WarrantyClaimController.approveWarrantyClaim);
app.put('/claims/:claimId/reject', authenticateToken, authorizeRole('service_staff', 'admin'), WarrantyClaimController.rejectWarrantyClaim);
// app.put('/claims/:claimId/status', authenticateToken, authorizeRole('service_staff', 'admin'), WarrantyClaimController.updateClaimStatus);
app.post('/claims/:claimId/notes', authenticateToken, authorizeRole('service_staff', 'admin'), WarrantyClaimController.addApprovalNotes);

// Quản Lý Kho Linh Kiện (Parts Management)
app.post('/claims/:claimId/parts/ship', authenticateToken, authorizeRole('service_staff', 'admin'), WarrantyClaimController.shipParts);
app.post('/claims/:claimId/parts/receive', authenticateToken, authorizeRole('technician', 'service_staff', 'admin'), WarrantyClaimController.receiveParts);
app.get('/claims/:claimId/parts/shipment', authenticateToken, authorizeRole('technician', 'service_staff', 'admin'), WarrantyClaimController.getPartsShipmentStatus);

// Quản lý Tiến độ Sửa chữa
app.post('/claims/:claimId/repair/start', authenticateToken, authorizeRole('technician', 'service_staff', 'admin'), WarrantyClaimController.startRepair);
app.post('/claims/:claimId/repair/progress', authenticateToken, authorizeRole('technician', 'service_staff', 'admin'), WarrantyClaimController.updateProgressStep);
app.post('/claims/:claimId/repair/issue', authenticateToken, authorizeRole('technician', 'service_staff', 'admin'), WarrantyClaimController.reportIssue);
app.post('/claims/:claimId/repair/issue/:issueId/resolve', authenticateToken, authorizeRole('technician', 'service_staff', 'admin'), WarrantyClaimController.resolveIssue);
app.post('/claims/:claimId/repair/quality-check', authenticateToken, authorizeRole('technician', 'service_staff', 'admin'), WarrantyClaimController.performQualityCheck);
app.post('/claims/:claimId/repair/complete', authenticateToken, authorizeRole('technician', 'service_staff', 'admin'), WarrantyClaimController.completeRepair);
app.get('/claims/:claimId/repair/progress', authenticateToken, authorizeRole('technician', 'service_staff', 'admin', 'oem_staff'), WarrantyClaimController.getRepairProgress);
app.get('/claims/:claimId/repair/history', authenticateToken, authorizeRole('technician', 'service_staff', 'admin', 'oem_staff'), WarrantyClaimController.getRepairHistory);

// Quản lý Kết quả Bảo hành
app.post('/claims/:claimId/results/photos',
    authenticateToken,
    authorizeRole('technician', 'service_staff', 'admin'),
    uploadMultipleResultPhotos,
    handleWarrantyResultsUploadError,
    validateResultPhotos,
    WarrantyClaimController.uploadResultPhotos
);

app.post('/claims/:claimId/results/completion',
    authenticateToken,
    authorizeRole('technician', 'service_staff', 'admin'),
    WarrantyClaimController.updateCompletionInfo
);

app.post('/claims/:claimId/results/handover',
    authenticateToken,
    authorizeRole('technician', 'service_staff', 'admin'),
    WarrantyClaimController.recordHandover
);

app.post('/claims/:claimId/results/close',
    authenticateToken,
    authorizeRole('service_staff', 'admin'),
    WarrantyClaimController.closeWarrantyCase
);

app.get('/claims/:claimId/results',
    authenticateToken,
    authorizeRole('technician', 'service_staff', 'admin', 'oem_staff'),
    WarrantyClaimController.getWarrantyResults
);

// UC12: Quản lý Chiến dịch Recall
app.post('/recalls/campaigns', authenticateToken, authorizeRole('oem_staff', 'admin'), RecallCampaignController.createCampaign);
app.post('/recalls/campaigns/:campaignId/find-affected-vehicles', authenticateToken, authorizeRole('oem_staff', 'admin'), RecallCampaignController.findAffectedVehicles);
app.post('/recalls/campaigns/:campaignId/publish', authenticateToken, authorizeRole('oem_staff', 'admin'), RecallCampaignController.publishCampaign);
app.put('/recalls/campaigns/:campaignId', authenticateToken, authorizeRole('oem_staff', 'admin'), RecallCampaignController.updateCampaign);
app.post('/recalls/campaigns/:campaignId/cancel', authenticateToken, authorizeRole('oem_staff', 'admin'), RecallCampaignController.cancelCampaign);
app.get('/recalls/campaigns', authenticateToken, authorizeRole('oem_staff', 'admin', 'service_staff'), RecallCampaignController.getCampaigns);

// UC13: Service Center Recall Management (specific routes BEFORE parameterized routes)
app.get('/recalls/campaigns/my-center', authenticateToken, authorizeRole('service_staff', 'admin'), RecallCampaignController.getMyCampaigns);
app.get('/recalls/campaigns/active', authenticateToken, authorizeRole('service_staff', 'admin', 'oem_staff'), RecallCampaignController.getActiveCampaigns);

app.get('/recalls/campaigns/:campaignId', authenticateToken, authorizeRole('oem_staff', 'admin', 'service_staff'), RecallCampaignController.getCampaignById);
app.get('/recalls/campaigns/:campaignId/affected-vehicles/my-center', authenticateToken, authorizeRole('service_staff', 'admin'), RecallCampaignController.getAffectedVehiclesByServiceCenter);
app.put('/recalls/campaigns/:campaignId/vehicles/:vin/status', authenticateToken, authorizeRole('service_staff', 'admin'), RecallCampaignController.updateVehicleStatus);
app.get('/recalls/campaigns/:campaignId/statistics', authenticateToken, authorizeRole('oem_staff', 'admin'), RecallCampaignController.getCampaignStatistics);
app.post('/recalls/campaigns/:campaignId/acknowledge', authenticateToken, authorizeRole('service_staff', 'admin'), RecallCampaignController.acknowledgeCampaign);
app.get('/recalls/campaigns/:campaignId/vehicles/:vin', authenticateToken, authorizeRole('service_staff', 'admin'), RecallCampaignController.getVehicleDetail);

// UC15: Appointment Management
const AppointmentController = require('./Controller/AppointmentController');

app.post('/appointments', authenticateToken, authorizeRole('service_staff', 'admin'), AppointmentController.createAppointment);
app.get('/appointments', authenticateToken, authorizeRole('service_staff', 'admin'), AppointmentController.getAppointmentsByServiceCenter);
app.get('/appointments/calendar/:date', authenticateToken, authorizeRole('service_staff', 'admin'), AppointmentController.getAppointmentsByDate);
app.put('/appointments/:appointmentId/status', authenticateToken, authorizeRole('service_staff', 'admin'), AppointmentController.updateAppointmentStatus);
app.delete('/appointments/:appointmentId', authenticateToken, authorizeRole('service_staff', 'admin'), AppointmentController.cancelAppointment);

// UC15: Campaign-Appointment Integration
app.post('/recalls/campaigns/:campaignId/appointments', authenticateToken, authorizeRole('service_staff', 'admin'), RecallCampaignController.scheduleAppointment);
app.get('/recalls/campaigns/:campaignId/appointments', authenticateToken, authorizeRole('service_staff', 'admin'), RecallCampaignController.getAppointmentsByCampaign);

// UC8: Cost Management
app.get('/costs/statistics', authenticateToken, authorizeRole('oem_staff', 'admin', 'service_staff'), CostController.getCostStatistics);
app.get('/costs/by-category', authenticateToken, authorizeRole('oem_staff', 'admin', 'service_staff'), CostController.getCostsByCategory);
app.get('/costs/by-service-center', authenticateToken, authorizeRole('oem_staff', 'admin'), CostController.getCostsByServiceCenter);
app.get('/costs/trends', authenticateToken, authorizeRole('oem_staff', 'admin'), CostController.getCostTrends);
app.get('/costs/claim/:claimId', authenticateToken, authorizeRole('oem_staff', 'admin', 'service_staff'), CostController.getClaimCostDetails);

// Lấy claims - routes cụ thể trước
app.get('/claims/vin/:vin', authenticateToken, WarrantyClaimController.getClaimsByVIN);
app.get('/claims/:claimId', authenticateToken, WarrantyClaimController.getClaimById);
app.get('/claims', authenticateToken, WarrantyClaimController.getClaimsByServiceCenter);

// Xử lý lỗi middleware
app.use((err, req, res, next) => {
    // Kiểm tra response đã được gửi chưa
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

// Xử lý 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint không tồn tại',
        availableEndpoints: '/api-docs'
    });
});

// Khởi tạo services
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

        // Khởi tạo controllers
        process.stderr.write('Initializing controllers...\n');

        // Initialize PartsController
        await PartsController.initializeModels();
        console.log('✅ PartsController initialized');

        process.stderr.write('✅ Controllers initialized\n');

        // Khởi tạo job hết hạn bảo hành
        process.stderr.write('Initializing jobs...\n');
        const { initializeWarrantyExpirationJob } = require('../shared/jobs/WarrantyExpirationJob');
        const { initializeReservationReleaseJob } = require('../shared/jobs/ReservationReleaseJob');
        const WarrantyVehicle = require('./Model/WarrantyVehicle')();
        const WarrantyActivation = require('./Model/WarrantyActivation')();
        const Reservation = require('./Model/Reservation')();

        const warrantyJob = initializeWarrantyExpirationJob(WarrantyVehicle);
        const reservationJob = initializeReservationReleaseJob(Reservation);

        // Lưu trữ jobs để tắt nhẹ nhàng
        process.warrantyExpirationJob = warrantyJob;
        process.reservationReleaseJob = reservationJob;
        process.stderr.write('✅ Jobs initialized\n');

        // Khởi tạo Email Service
        process.stderr.write('Initializing Email Service...\n');
        try {
            const EmailService = require('../shared/services/EmailService');
            await EmailService.initialize();
            process.stderr.write('✅ Email Service initialized\n');
            console.log('✅ Email Service initialized');
        } catch (emailError) {
            process.stderr.write(`⚠️ Email Service initialization failed: ${emailError.message}\n`);
            console.warn('⚠️ Email Service initialization failed:', emailError.message);
            // Continue without email service - it's not critical for core functionality
        }

        process.stderr.write('✅ Warranty service initialized successfully\n');
        console.log('✅ Warranty service initialized successfully');
    } catch (error) {
        process.stderr.write(`❌ Failed to initialize Warranty service: ${error.message}\n`);
        process.stderr.write(`Stack: ${error.stack}\n`);
        console.error('❌ Failed to initialize Warranty service:', error);
        process.exit(1);
    }
};

// Khởi động server
initializeServices().then(() => {
    const server = app.listen(PORT, () => {
        console.log(`🚀 Warranty Service running on port ${PORT}`);
    });

    // Tắt server một cách nhẹ nhàng
    const gracefulShutdown = async (signal) => {
        console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

        server.close(async () => {
            try {
                // Dừng các jobs đã lên lịch
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
