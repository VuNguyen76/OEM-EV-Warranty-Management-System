const { createProxyMiddleware } = require('http-proxy-middleware');

class GatewayService {
    constructor(app) {
        this.app = app;

        this.services = {
            user: process.env.USER_SERVICE_URL,
            manufacturing: process.env.MANUFACTURING_SERVICE_URL,
            warranty: process.env.WARRANTY_SERVICE_URL,
            vehicle: process.env.VEHICLE_SERVICE_URL,
        };
    }

    createProxyConfig(target, pathRewrite, requiresAuth = false) {
        return {
            target,
            changeOrigin: true,
            timeout: 30000,
            proxyTimeout: 30000,
            pathRewrite,
            onProxyReq: (proxyReq, req) => {
                if (requiresAuth && req.headers.authorization) {
                    proxyReq.setHeader('Authorization', req.headers.authorization);
                }
                // Let http-proxy-middleware handle body automatically
            },
            onError: (err, req, res) => {
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        message: 'Lỗi kết nối đến service',
                        error: err.message
                    });
                }
            }
        };
    }

    initRoutes() {
        this.setupHealthCheck();
        this.setupAuthRoutes();
        this.setupUserRoutes();
        this.setupManufacturingRoutes();
        this.setupWarrantyRoutes();
        this.setupVehicleRoutes();
        this.setup404Handler();
    }

    setupHealthCheck() {
        this.app.get('/health', (req, res) => {
            res.json({
                success: true,
                message: 'API Gateway đang hoạt động',
                timestamp: new Date().toISOString(),
                services: this.services
            });
        });
    }

    setupAuthRoutes() {
        this.app.use(
            '/api/auth',
            createProxyMiddleware(this.createProxyConfig(
                this.services.user,
                { '^/api/auth': '/auth' },
                false
            ))
        );
    }

    setupUserRoutes() {
        this.app.use(
            '/api/users',
            createProxyMiddleware(this.createProxyConfig(
                this.services.user,
                { '^/api/users': '/users' },
                true
            ))
        );
    }

    setupManufacturingRoutes() {
        this.app.use(
            '/api/manufacturing',
            createProxyMiddleware(this.createProxyConfig(
                this.services.manufacturing,
                { '^/api/manufacturing': '' },
                true
            ))
        );
    }

    setupWarrantyRoutes() {
        this.app.use(
            '/api/warranty',
            createProxyMiddleware(this.createProxyConfig(
                this.services.warranty,
                { '^/api/warranty': '' },
                true
            ))
        );
    }

    setupVehicleRoutes() {
        this.app.use(
            '/api/vehicle',
            createProxyMiddleware(this.createProxyConfig(
                this.services.vehicle,
                { '^/api/vehicle': '' },
                true
            ))
        );
    }

    setup404Handler() {
        this.app.use((req, res) => {
            res.status(404).json({
                success: false,
                message: 'Route không tồn tại',
                path: req.originalUrl
            });
        });
    }
}

module.exports = GatewayService;
