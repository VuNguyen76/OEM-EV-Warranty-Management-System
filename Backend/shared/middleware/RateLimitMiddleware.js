// shared/middleware/RateLimitMiddleware.js
// Rate limiting middleware using Redis

const redisService = require('../services/RedisService');

/**
 * Create rate limiting middleware
 * @param {Object} options - Rate limiting options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum number of requests per window
 * @param {string} options.keyGenerator - Function to generate rate limit key
 * @param {string} options.message - Error message when rate limit exceeded
 * @param {number} options.statusCode - HTTP status code when rate limit exceeded
 * @returns {Function} - Express middleware function
 */
function createRateLimit(options = {}) {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes
        max = 100, // 100 requests per window
        keyGenerator = (req) => req.ip,
        message = 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau',
        statusCode = 429,
        skipSuccessfulRequests = false,
        skipFailedRequests = false
    } = options;

    return async (req, res, next) => {
        if (!redisService.isConnected) {
            // If Redis is not connected, allow the request
            console.warn('⚠️ Rate limiting disabled - Redis not connected');
            return next();
        }

        try {
            const key = `rate_limit:${keyGenerator(req)}`;
            const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
            const windowKey = `${key}:${windowStart}`;

            // Get current count
            const current = await redisService.client.get(windowKey);
            const count = current ? parseInt(current) : 0;

            // Set headers
            res.set({
                'X-RateLimit-Limit': max,
                'X-RateLimit-Remaining': Math.max(0, max - count - 1),
                'X-RateLimit-Reset': new Date(windowStart + windowMs).toISOString()
            });

            if (count >= max) {
                return res.status(statusCode).json({
                    success: false,
                    message,
                    retryAfter: Math.ceil((windowStart + windowMs - Date.now()) / 1000)
                });
            }

            // Increment counter
            const pipeline = redisService.client.multi();
            pipeline.incr(windowKey);
            pipeline.expire(windowKey, Math.ceil(windowMs / 1000));
            await pipeline.exec();

            // Add response handler to track success/failure
            const originalSend = res.send;
            res.send = function (data) {
                const shouldSkip = (
                    (skipSuccessfulRequests && res.statusCode < 400) ||
                    (skipFailedRequests && res.statusCode >= 400)
                );

                if (shouldSkip) {
                    // Decrement counter if we should skip this request
                    redisService.client.decr(windowKey).catch(err => {
                        console.error('Failed to decrement rate limit counter:', err);
                    });
                }

                return originalSend.call(this, data);
            };

            next();
        } catch (error) {
            console.error('Rate limiting error:', error);
            // On error, allow the request to proceed
            next();
        }
    };
}

/**
 * Rate limit for login attempts
 */
const loginRateLimit = createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
    keyGenerator: (req) => `login:${req.ip}:${req.body.email || 'unknown'}`,
    message: 'Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau 15 phút',
    skipSuccessfulRequests: true // Don't count successful logins
});

/**
 * Rate limit for registration
 */
const registerRateLimit = createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 registrations per hour per IP (increased for testing)
    keyGenerator: (req) => `register:${req.ip}`,
    message: 'Quá nhiều lần đăng ký từ IP này, vui lòng thử lại sau 1 giờ'
});

/**
 * Rate limit for API calls
 */
const apiRateLimit = createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 minutes
    keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise IP
        return req.user ? `api:user:${req.user.userId}` : `api:ip:${req.ip}`;
    },
    message: 'Quá nhiều yêu cầu API, vui lòng thử lại sau'
});

/**
 * Rate limit for password reset
 */
const passwordResetRateLimit = createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 password reset attempts per hour
    keyGenerator: (req) => `password_reset:${req.ip}:${req.body.email || 'unknown'}`,
    message: 'Quá nhiều yêu cầu đặt lại mật khẩu, vui lòng thử lại sau 1 giờ'
});

/**
 * Strict rate limit for sensitive operations
 */
const strictRateLimit = createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 requests per hour
    keyGenerator: (req) => {
        return req.user ? `strict:user:${req.user.userId}` : `strict:ip:${req.ip}`;
    },
    message: 'Quá nhiều yêu cầu cho thao tác nhạy cảm, vui lòng thử lại sau'
});

module.exports = {
    createRateLimit,
    loginRateLimit,
    registerRateLimit,
    apiRateLimit,
    passwordResetRateLimit,
    strictRateLimit
};
