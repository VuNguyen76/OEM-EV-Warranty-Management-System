// shared/middleware/SecurityMiddleware.js
// Middleware bảo mật để tăng cường bảo vệ

/**
 * Security headers middleware
 * Adds various security headers to responses
 */
const securityHeaders = (req, res, next) => {
    // Ngăn clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Ngăn MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Bật bảo vệ XSS
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Chính sách Referrer
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Chính sách Bảo mật Nội dung
    res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self'; " +
        "connect-src 'self'; " +
        "frame-ancestors 'none';"
    );
    
    // Strict Transport Security (chỉ HTTPS)
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    // Xóa thông tin server
    res.removeHeader('X-Powered-By');
    
    next();
};

/**
 * Request sanitization middleware
 * Sanitizes request data to prevent injection attacks
 */
const sanitizeRequest = (req, res, next) => {
    // Làm sạch query parameters
    if (req.query) {
        for (const key in req.query) {
            if (typeof req.query[key] === 'string') {
                req.query[key] = sanitizeString(req.query[key]);
            }
        }
    }
    
    // Làm sạch request body
    if (req.body && typeof req.body === 'object') {
        sanitizeObject(req.body);
    }
    
    next();
};

/**
 * Sanitize string input
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeString(str) {
    if (typeof str !== 'string') return str;
    
    // Xóa các ký tự có thể nguy hiểm
    return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Xóa script tags
        .replace(/javascript:/gi, '') // Xóa javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Xóa event handlers
        .replace(/[<>]/g, '') // Xóa ký tự < và >
        .trim();
}

/**
 * Recursively sanitize object properties
 * @param {Object} obj - Object to sanitize
 */
function sanitizeObject(obj) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (typeof obj[key] === 'string') {
                obj[key] = sanitizeString(obj[key]);
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitizeObject(obj[key]);
            }
        }
    }
}

/**
 * Request size limiter
 * Prevents large payload attacks
 */
const requestSizeLimiter = (maxSize = '10mb') => {
    return (req, res, next) => {
        const contentLength = req.headers['content-length'];
        
        if (contentLength) {
            const sizeInBytes = parseInt(contentLength);
            const maxSizeInBytes = parseSize(maxSize);
            
            if (sizeInBytes > maxSizeInBytes) {
                return res.status(413).json({
                    success: false,
                    message: 'Request payload too large',
                    maxSize: maxSize
                });
            }
        }
        
        next();
    };
};

/**
 * Parse size string to bytes
 * @param {string} size - Size string (e.g., '10mb', '1gb')
 * @returns {number} - Size in bytes
 */
function parseSize(size) {
    const units = {
        'b': 1,
        'kb': 1024,
        'mb': 1024 * 1024,
        'gb': 1024 * 1024 * 1024
    };
    
    const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2];
    
    return Math.floor(value * (units[unit] || 1));
}

/**
 * IP whitelist middleware
 * Only allow requests from whitelisted IPs
 */
const ipWhitelist = (allowedIPs = []) => {
    return (req, res, next) => {
        if (allowedIPs.length === 0) {
            return next(); // Không cấu hình whitelist, cho phép tất cả
        }
        
        const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
        
        if (!allowedIPs.includes(clientIP)) {
            console.warn(`🚫 Blocked request from unauthorized IP: ${clientIP}`);
            return res.status(403).json({
                success: false,
                message: 'Access denied from this IP address'
            });
        }
        
        next();
    };
};

/**
 * Request logging middleware for security monitoring
 */
const securityLogger = (req, res, next) => {
    const startTime = Date.now();
    
    // Ghi log các pattern đáng nghi
    const suspiciousPatterns = [
        /\.\.\//g, // Directory traversal
        /<script/gi, // Thử XSS
        /union\s+select/gi, // SQL injection (giữ nguyên thuật ngữ bảo mật)
        /javascript:/gi, // JavaScript injection
        /eval\(/gi, // Code injection
    ];
    
    const url = req.originalUrl || req.url;
    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers.referer || '';
    
    let isSuspicious = false;
    const suspiciousReasons = [];
    
    // Kiểm tra URL có pattern đáng nghi
    suspiciousPatterns.forEach(pattern => {
        if (pattern.test(url)) {
            isSuspicious = true;
            suspiciousReasons.push(`Suspicious URL pattern: ${pattern}`);
        }
    });
    
    // Kiểm tra user agents đáng nghi
    if (userAgent.toLowerCase().includes('bot') && !userAgent.toLowerCase().includes('googlebot')) {
        isSuspicious = true;
        suspiciousReasons.push('Suspicious user agent');
    }
    
    if (isSuspicious) {
        console.warn(`🚨 Suspicious request detected:`, {
            ip: req.ip,
            method: req.method,
            url: url,
            userAgent: userAgent,
            referer: referer,
            reasons: suspiciousReasons,
            timestamp: new Date().toISOString()
        });
    }
    
    // Ghi log thời gian phản hồi khi hoàn thành
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        if (duration > 5000) { // Ghi log requests chậm
            console.warn(`⏱️ Slow request: ${req.method} ${url} - ${duration}ms`);
        }
    });
    
    next();
};

module.exports = {
    securityHeaders,
    sanitizeRequest,
    requestSizeLimiter,
    ipWhitelist,
    securityLogger,
    sanitizeString,
    sanitizeObject
};
