// shared/middleware/EnhancedRateLimitMiddleware.js
// Enhanced rate limiting using popular libraries

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const redisService = require('../services/RedisService');

/**
 * Redis store for express-rate-limit
 */
class RedisStore {
    constructor() {
        this.client = redisService.client;
    }

    async increment(key) {
        if (!redisService.isConnected) {
            throw new Error('Redis not connected');
        }

        const current = await this.client.incr(key);
        if (current === 1) {
            await this.client.expire(key, 900); // 15 minutes
        }
        
        const ttl = await this.client.ttl(key);
        return {
            totalHits: current,
            resetTime: new Date(Date.now() + ttl * 1000)
        };
    }

    async decrement(key) {
        if (!redisService.isConnected) return;
        await this.client.decr(key);
    }

    async resetKey(key) {
        if (!redisService.isConnected) return;
        await this.client.del(key);
    }
}

/**
 * Login rate limiting with progressive delays
 */
const loginRateLimit = rateLimit({
    store: new RedisStore(),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    keyGenerator: (req) => `login:${req.ip}:${req.body.email || 'unknown'}`,
    message: {
        success: false,
        message: 'Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau 15 phút',
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    onLimitReached: (req, res, options) => {
        console.warn(`🚨 Login rate limit exceeded for ${req.ip} - ${req.body.email}`);
    }
});

/**
 * Progressive delay for repeated login failures
 */
const loginSlowDown = slowDown({
    store: new RedisStore(),
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 2, // Start slowing down after 2 requests
    delayMs: 500, // Increase delay by 500ms for each request
    maxDelayMs: 20000, // Maximum delay of 20 seconds
    keyGenerator: (req) => `login_slow:${req.ip}:${req.body.email || 'unknown'}`,
    skipSuccessfulRequests: true,
    onLimitReached: (req, res, options) => {
        console.warn(`⏱️ Login slow down activated for ${req.ip} - ${req.body.email}`);
    }
});

/**
 * Registration rate limiting
 */
const registerRateLimit = rateLimit({
    store: new RedisStore(),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registrations per hour
    keyGenerator: (req) => `register:${req.ip}`,
    message: {
        success: false,
        message: 'Quá nhiều lần đăng ký từ IP này, vui lòng thử lại sau 1 giờ',
        retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    onLimitReached: (req, res, options) => {
        console.warn(`🚨 Registration rate limit exceeded for ${req.ip}`);
    }
});

/**
 * API rate limiting
 */
const apiRateLimit = rateLimit({
    store: new RedisStore(),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 minutes
    keyGenerator: (req) => {
        return req.user ? `api:user:${req.user.userId}` : `api:ip:${req.ip}`;
    },
    message: {
        success: false,
        message: 'Quá nhiều yêu cầu API, vui lòng thử lại sau',
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    onLimitReached: (req, res, options) => {
        const identifier = req.user ? `user:${req.user.userId}` : `ip:${req.ip}`;
        console.warn(`🚨 API rate limit exceeded for ${identifier}`);
    }
});

/**
 * Strict rate limiting for sensitive operations
 */
const strictRateLimit = rateLimit({
    store: new RedisStore(),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 requests per hour
    keyGenerator: (req) => {
        return req.user ? `strict:user:${req.user.userId}` : `strict:ip:${req.ip}`;
    },
    message: {
        success: false,
        message: 'Quá nhiều yêu cầu cho thao tác nhạy cảm, vui lòng thử lại sau',
        retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    onLimitReached: (req, res, options) => {
        const identifier = req.user ? `user:${req.user.userId}` : `ip:${req.ip}`;
        console.warn(`🚨 Strict rate limit exceeded for ${identifier}`);
    }
});

/**
 * Password reset rate limiting
 */
const passwordResetRateLimit = rateLimit({
    store: new RedisStore(),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 password reset attempts per hour
    keyGenerator: (req) => `password_reset:${req.ip}:${req.body.email || 'unknown'}`,
    message: {
        success: false,
        message: 'Quá nhiều yêu cầu đặt lại mật khẩu, vui lòng thử lại sau 1 giờ',
        retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    onLimitReached: (req, res, options) => {
        console.warn(`🚨 Password reset rate limit exceeded for ${req.ip} - ${req.body.email}`);
    }
});

/**
 * Global rate limiting for all requests
 */
const globalRateLimit = rateLimit({
    store: new RedisStore(),
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute per IP
    keyGenerator: (req) => `global:${req.ip}`,
    message: {
        success: false,
        message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/ping';
    },
    onLimitReached: (req, res, options) => {
        console.warn(`🚨 Global rate limit exceeded for ${req.ip} on ${req.path}`);
    }
});

/**
 * Create custom rate limiter
 */
function createCustomRateLimit(options) {
    return rateLimit({
        store: new RedisStore(),
        standardHeaders: true,
        legacyHeaders: false,
        ...options
    });
}

module.exports = {
    loginRateLimit,
    loginSlowDown,
    registerRateLimit,
    apiRateLimit,
    strictRateLimit,
    passwordResetRateLimit,
    globalRateLimit,
    createCustomRateLimit,
    RedisStore
};
