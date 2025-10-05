const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const { securityHeaders, securityLogger, requestSizeLimiter } = require("./SecurityMiddleware");

const setupCommonMiddleware = (app) => {
    // Middleware bảo mật
    app.use(securityHeaders);
    app.use(securityLogger);
    app.use(requestSizeLimiter("10mb"));

    // Middleware bảo mật bên thứ ba
    app.use(
        helmet({
            contentSecurityPolicy: false,
            crossOriginEmbedderPolicy: false,
        })
    );

    // Tải danh sách origins được phép từ ENV
    const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",")
        : [];

    // Cấu hình CORS
    app.use(
        cors({
            origin: function (origin, callback) {
                // Cho phép request từ Postman/curl
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

    // Ghi log
    app.use(morgan("combined"));
};

module.exports = {
    setupCommonMiddleware,
};
