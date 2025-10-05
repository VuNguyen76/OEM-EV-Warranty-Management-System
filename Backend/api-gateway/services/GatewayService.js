// api-gateway/services/GatewayService.js
const { createProxyMiddleware } = require('http-proxy-middleware');

/**
 * Service quản lý API Gateway
 */
class GatewayService {
    constructor(app) {
        this.app = app;

        // Cấu hình URL của các microservice
        this.services = {
            user: process.env.USER_SERVICE_URL,
            manufacturing: process.env.MANUFACTURING_SERVICE_URL,
            warranty: process.env.WARRANTY_SERVICE_URL,
            vehicle: process.env.VEHICLE_SERVICE_URL,
        };

        // Environment variables loaded
    }

    /**
     * Create generic proxy middleware
     */
    createProxyConfig(target, pathRewrite, requiresAuth = false) {
        return {
            target,
            changeOrigin: true,
            timeout: 30000,
            proxyTimeout: 30000,
            pathRewrite,
            onProxyReq: (proxyReq, req, res) => {
                // Forward Authorization header if required
                if (requiresAuth && req.headers.authorization) {
                    proxyReq.setHeader('Authorization', req.headers.authorization);
                }

                // Fix body forwarding for POST/PUT/PATCH requests
                if (req.body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
                    const bodyData = JSON.stringify(req.body);
                    proxyReq.setHeader('Content-Type', 'application/json');
                    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                    proxyReq.write(bodyData);
                }
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

    /**
     * Khởi tạo tất cả các routes
     */
    initRoutes() {
        // Health check
        this.setupHealthCheck();

        // Auth routes (không cần token)
        this.setupAuthRoutes();

        // User routes (cần token)
        this.setupUserRoutes();

        // Manufacturing routes (cần token)
        this.setupManufacturingRoutes();

        // Warranty routes (cần token)
        this.setupWarrantyRoutes();

        // Vehicle routes (cần token)
        this.setupVehicleRoutes();

        // 404 handler
        this.setup404Handler();
    }

    /**
     * Health check route
     */
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

    /**
     * Auth routes (không cần token)
     */
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

    /**
     * User routes (cần token)
     */
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

    /**
     * Manufacturing routes (cần token)
     */
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

    /**
     * Warranty routes (cần token)
     */
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

    /**
     * Vehicle routes (cần token)
     */
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

    /**
     * 404 handler
     */
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
