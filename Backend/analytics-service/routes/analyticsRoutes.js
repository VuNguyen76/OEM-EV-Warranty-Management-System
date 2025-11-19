const express = require('express');
const router = express.Router();
const controller = require('../controllers/analyticsController');

// Định nghĩa routes con
// URL thực tế sẽ là: /api/analytics/failures, /api/analytics/root-cause...
router.get('/failures', controller.getFailureRate);
router.get('/root-cause', controller.getRootCause);
router.get('/forecast', controller.getForecast);

module.exports = router;
