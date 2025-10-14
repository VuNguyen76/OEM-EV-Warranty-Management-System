/**
 * System Constants - Centralized configuration values
 * FIXED: Replace hardcoded magic numbers with named constants
 */

// Performance & Timing Constants
const PERFORMANCE_CONSTANTS = {
    SLOW_REQUEST_THRESHOLD_MS: 5000,
    EMAIL_CONNECTION_POOL_SIZE: 5,
    EMAIL_MAX_MESSAGES: 100,
    REDIS_SCAN_MAX_ITERATIONS: 1000,
    REDIS_SCAN_COUNT: 100,
    DEFAULT_CACHE_TTL_SECONDS: 3600,
    UPCOMING_APPOINTMENTS_DAYS: 7
};

// Security Constants
const SECURITY_CONSTANTS = {
    MAX_LOGIN_ATTEMPTS: 5,
    ACCOUNT_LOCK_DURATION_MS: 2 * 60 * 60 * 1000, // 2 hours
    MAX_SEARCH_LENGTH: 100,
    MAX_THRESHOLD_VALUE: 1000,
    MIN_THRESHOLD_VALUE: 1
};

// Business Logic Constants
const BUSINESS_CONSTANTS = {
    DEFAULT_LOW_STOCK_THRESHOLD: 10,
    QUALITY_CHECK_TYPES: ['initial', 'final', 'safety', 'performance'],
    VALID_ISSUE_TYPES: ['parts_mismatch', 'additional_damage', 'parts_defective', 'other'],
    VALID_SEVERITIES: ['low', 'medium', 'high', 'critical'],
    APPOINTMENT_STATUSES: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled'],
    WARRANTY_STATUSES: ['active', 'expired', 'voided', 'pending']
};

// Database Connection Constants
const DB_CONSTANTS = {
    MAX_POOL_SIZE: 50,
    MIN_POOL_SIZE: 10,
    MAX_IDLE_TIME_MS: 30000,
    SERVER_SELECTION_TIMEOUT_MS: 5000,
    SOCKET_TIMEOUT_MS: 45000,
    CONNECT_TIMEOUT_MS: 30000,
    HEARTBEAT_FREQUENCY_MS: 10000
};

// Rate Limiting Constants
const RATE_LIMIT_CONSTANTS = {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS_PER_WINDOW: 100,
    MAX_REQUEST_SIZE: '10mb'
};

// Email Constants
const EMAIL_CONSTANTS = {
    DEFAULT_FROM_NAME: 'Hệ Thống Bảo Hành OEM EV',
    DEFAULT_FROM_EMAIL: 'warranty.system.oem@gmail.com',
    TEMPLATE_FILES: [
        'recall-notification.hbs',
        'warranty-claim-status.hbs',
        'vehicle-registration.hbs',
        'appointment-confirmation.hbs',
        'appointment-cancellation.hbs'
    ]
};

// Redis Connection Constants
const REDIS_CONSTANTS = {
    DEFAULT_URL: 'redis://localhost:6379',
    MAX_RECONNECT_ATTEMPTS: 10,
    RECONNECT_DELAY_BASE_MS: 100,
    RECONNECT_DELAY_MAX_MS: 3000,
    CONNECT_TIMEOUT_MS: 10000
};

module.exports = {
    PERFORMANCE_CONSTANTS,
    SECURITY_CONSTANTS,
    BUSINESS_CONSTANTS,
    DB_CONSTANTS,
    RATE_LIMIT_CONSTANTS,
    EMAIL_CONSTANTS,
    REDIS_CONSTANTS
};
