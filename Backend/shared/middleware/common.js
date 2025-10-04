const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const { securityHeaders, securityLogger, requestSizeLimiter } = require("./SecurityMiddleware");

const setupCommonMiddleware = (app) => {
    // Security middleware
    app.use(securityHeaders);
    app.use(securityLogger);
    app.use(requestSizeLimiter("10mb"));
    // sanitizeRequest removed - conflicts with body parser

    // Third-party security middleware
    app.use(
        helmet({
            contentSecurityPolicy: false, // We set our own CSP
            crossOriginEmbedderPolicy: false,
        })
    );

    // Load allowed origins từ ENV
    const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",")
        : [];

    // CORS configuration
    app.use(
        cors({
            origin: function (origin, callback) {
                // Cho phép request từ Postman / curl (không có header Origin)
                if (!origin) return callback(null, true);
                if (allowedOrigins.includes(origin)) {
                    return callback(null, true);
                } else {
                    console.log(`CORS blocked origin: ${origin}, allowed: ${allowedOrigins.join(', ')}`);
                    return callback(null, false);
                }
            },
            credentials: true,
            methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
        })
    );

    // CORS middleware đã tự động xử lý preflight OPTIONS requests

    // Logging
    app.use(morgan("combined"));
};

module.exports = {
    setupCommonMiddleware,
};
