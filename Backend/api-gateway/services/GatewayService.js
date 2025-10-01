// api-gateway/services/GatewayService.js
const { createProxyMiddleware } = require('http-proxy-middleware');

/**
 * Service quản lý API Gateway
 */
class GatewayService {
    constructor(app, authService, authorizationService) {
        this.app = app;
        this.authService = authService;
        this.authorizationService = authorizationService;

        // Cấu hình URL của các microservice
        this.services = {
            user: process.env.USER_SERVICE_URL,
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
                pathRewrite: {
                    '^/api/auth': '/auth',
                },
                onProxyReq: (proxyReq, req, res) => {
                    console.log(`→ Proxy: ${req.method} ${req.originalUrl} → ${this.services.user}`);
                },
                onError: (err, req, res) => {
                    console.error('✗ Proxy error:', err.message);
                    res.status(500).json({
                        success: false,
                        message: 'Lỗi kết nối đến service'
                    });
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
            this.authService.authenticate.bind(this.authService),
            createProxyMiddleware({
                target: this.services.user,
                changeOrigin: true,
                pathRewrite: {
                    '^/api/users': '/users',
                },
                onProxyReq: (proxyReq, req, res) => {
                    if (req.user) {
                        proxyReq.setHeader('X-User-Id', req.user.userId);
                        proxyReq.setHeader('X-User-Role', req.user.role);
                        proxyReq.setHeader('X-User-Email', req.user.email);
                    }
                    console.log(`→ Proxy: ${req.method} ${req.originalUrl} → ${this.services.user}`);
                },
                onError: (err, req, res) => {
                    console.error('✗ Proxy error:', err.message);
                    res.status(500).json({
                        success: false,
                        message: 'Lỗi kết nối đến user service'
                    });
                }
            })
        );
        console.log('  ✓ User routes: /api/users/* → User Service (Auth required)');
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
