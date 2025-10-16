const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/AuthMiddleware');
const ServiceCenterController = require('../Controller/ServiceCenterController');

/**
 * Service Center Routes
 * Quản lý các trung tâm bảo hành/dịch vụ
 */

// Public/All authenticated routes
router.get(
    '/active/list',
    authenticateToken,
    ServiceCenterController.getActiveServiceCenters
);

// Admin & OEM Staff routes
router.get(
    '/statistics/overview',
    authenticateToken,
    authorizeRole('admin', 'oem_staff'),
    ServiceCenterController.getServiceCenterStatistics
);

router.get(
    '/',
    authenticateToken,
    authorizeRole('admin', 'oem_staff', 'service_staff'),
    ServiceCenterController.getAllServiceCenters
);

router.get(
    '/code/:code',
    authenticateToken,
    authorizeRole('admin', 'oem_staff', 'service_staff'),
    ServiceCenterController.getServiceCenterByCode
);

router.get(
    '/:id',
    authenticateToken,
    authorizeRole('admin', 'oem_staff', 'service_staff'),
    ServiceCenterController.getServiceCenterById
);

// Admin only routes
router.post(
    '/',
    authenticateToken,
    authorizeRole('admin'),
    ServiceCenterController.createServiceCenter
);

router.put(
    '/:id',
    authenticateToken,
    authorizeRole('admin'),
    ServiceCenterController.updateServiceCenter
);

router.put(
    '/:id/status',
    authenticateToken,
    authorizeRole('admin'),
    ServiceCenterController.updateServiceCenterStatus
);

router.delete(
    '/:id',
    authenticateToken,
    authorizeRole('admin'),
    ServiceCenterController.deleteServiceCenter
);

module.exports = router;
