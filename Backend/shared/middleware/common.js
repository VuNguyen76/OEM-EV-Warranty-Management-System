const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const { securityHeaders, sanitizeRequest, securityLogger, requestSizeLimiter } = require("./SecurityMiddleware");

const setupCommonMiddleware = (app) => {
    // Security middleware
    app.use(securityHeaders);
    app.use(securityLogger);
    app.use(requestSizeLimiter('10mb'));
    app.use(sanitizeRequest);

    // Third-party security middleware
    app.use(helmet({
        contentSecurityPolicy: false, // We set our own CSP
        crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    app.use(cors({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Logging
    app.use(morgan("combined"));
};
module.exports = {
    setupCommonMiddleware
};
