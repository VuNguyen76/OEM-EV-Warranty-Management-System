// shared/middleware/SecurityMiddleware.js
// Security middleware for enhanced protection

/**
 * Security headers middleware
 * Adds various security headers to responses
 */
const securityHeaders = (req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy
    res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self'; " +
        "connect-src 'self'; " +
        "frame-ancestors 'none';"
    );
    
    // Strict Transport Security (HTTPS only)
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    // Remove server information
    res.removeHeader('X-Powered-By');
    
    next();
};

/**
 * Request sanitization middleware
 * Sanitizes request data to prevent injection attacks
 */
const sanitizeRequest = (req, res, next) => {
    // Sanitize query parameters
    if (req.query) {
        for (const key in req.query) {
            if (typeof req.query[key] === 'string') {
                req.query[key] = sanitizeString(req.query[key]);
            }
        }
    }
    
    // Sanitize request body
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
    
    // Remove potentially dangerous characters
    return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .replace(/[<>]/g, '') // Remove < and > characters
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
            return next(); // No whitelist configured, allow all
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
    
    // Log suspicious patterns
    const suspiciousPatterns = [
        /\.\.\//g, // Directory traversal
        /<script/gi, // XSS attempts
        /union\s+select/gi, // SQL injection
        /javascript:/gi, // JavaScript injection
        /eval\(/gi, // Code injection
    ];
    
    const url = req.originalUrl || req.url;
    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers.referer || '';
    
    let isSuspicious = false;
    const suspiciousReasons = [];
    
    // Check URL for suspicious patterns
    suspiciousPatterns.forEach(pattern => {
        if (pattern.test(url)) {
            isSuspicious = true;
            suspiciousReasons.push(`Suspicious URL pattern: ${pattern}`);
        }
    });
    
    // Check for suspicious user agents
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
    
    // Log response time on finish
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        if (duration > 5000) { // Log slow requests
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
