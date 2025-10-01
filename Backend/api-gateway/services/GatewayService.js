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
            vehicle: process.env.VEHICLE_SERVICE_URL,
        };
    }

    /**
     * Khởi tạo tất cả các routes
     */
    initRoutes() {
        console.log('Initializing API Gateway routes...');

        // Health check
        this.setupHealthCheck();

        // Auth routes (không cần token)
        this.setupAuthRoutes();

        // User routes (cần token)
        this.setupUserRoutes();

        // Vehicle routes (cần token)
        this.setupVehicleRoutes();

        // 404 handler
        this.setup404Handler();

        console.log('Routes initialized successfully!');
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
        console.log('  ✓ Health check: GET /health');
    }

    /**
     * Auth routes (không cần token)
     */
    setupAuthRoutes() {
        this.app.use(
            '/api/auth',
            createProxyMiddleware({
                target: this.services.user,
                changeOrigin: true,
                timeout: 30000,
                proxyTimeout: 30000,
                pathRewrite: {
                    '^/api/auth': '/auth',
                },
                onProxyReq: (proxyReq, req, res) => {
                    // Fix body forwarding for POST requests
                    if (req.body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
                        const bodyData = JSON.stringify(req.body);
                        proxyReq.setHeader('Content-Type', 'application/json');
                        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                        proxyReq.write(bodyData);
                    }
                    console.log(`→ Proxy: ${req.method} ${req.originalUrl} → ${this.services.user}`);
                },
                onError: (err, req, res) => {
                    console.error('✗ Proxy error:', err.message);
                    if (!res.headersSent) {
                        res.status(500).json({
                            success: false,
                            message: 'Lỗi kết nối đến service',
                            error: err.message
                        });
                    }
                }
            })
        );
        console.log('  ✓ Auth routes: /api/auth/* → User Service');
    }

    /**
     * User routes (cần token)
     */
    setupUserRoutes() {
        this.app.use(
            '/api/users',
            createProxyMiddleware({
                target: this.services.user,
                changeOrigin: true,
                timeout: 30000,
                proxyTimeout: 30000,
                pathRewrite: {
                    '^/api/users': '/users',
                },
                onProxyReq: (proxyReq, req, res) => {
                    // Forward Authorization header to User Service
                    if (req.headers.authorization) {
                        proxyReq.setHeader('Authorization', req.headers.authorization);
                    }

                    // Fix body forwarding for POST/PUT requests
                    if (req.body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
                        const bodyData = JSON.stringify(req.body);
                        proxyReq.setHeader('Content-Type', 'application/json');
                        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                        proxyReq.write(bodyData);
                    }

                    console.log(`→ Proxy: ${req.method} ${req.originalUrl} → ${this.services.user}`);
                },
                onError: (err, req, res) => {
                    console.error('✗ Proxy error:', err.message);
                    if (!res.headersSent) {
                        res.status(500).json({
                            success: false,
                            message: 'Lỗi kết nối đến user service',
                            error: err.message
                        });
                    }
                }
            })
        );
        console.log('  ✓ User routes: /api/users/* → User Service (Auth required)');
    }

    /**
     * Vehicle routes (cần token)
     */
    setupVehicleRoutes() {
        this.app.use(
            '/api/vehicles',
            createProxyMiddleware({
                target: this.services.vehicle,
                changeOrigin: true,
                timeout: 30000,
                proxyTimeout: 30000,
                pathRewrite: {
                    '^/api/vehicles': '/vehicles',
                },
                onProxyReq: (proxyReq, req, res) => {
                    // Forward Authorization header to Vehicle Service
                    if (req.headers.authorization) {
                        proxyReq.setHeader('Authorization', req.headers.authorization);
                    }

                    // Fix body forwarding for POST/PUT requests
                    if (req.body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
                        const bodyData = JSON.stringify(req.body);
                        proxyReq.setHeader('Content-Type', 'application/json');
                        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                        proxyReq.write(bodyData);
                    }

                    console.log(`→ Proxy: ${req.method} ${req.originalUrl} → ${this.services.vehicle}`);
                },
                onError: (err, req, res) => {
                    console.error('✗ Proxy error:', err.message);
                    if (!res.headersSent) {
                        res.status(500).json({
                            success: false,
                            message: 'Lỗi kết nối đến vehicle service',
                            error: err.message
                        });
                    }
                }
            })
        );
        console.log('  ✓ Vehicle routes: /api/vehicles/* → Vehicle Service (Auth required)');
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
