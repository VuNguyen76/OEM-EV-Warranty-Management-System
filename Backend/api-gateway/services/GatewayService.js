const { createProxyMiddleware } = require('http-proxy-middleware');

class GatewayService {
    constructor(app) {
        this.app = app;

        this.serviceUrls = {
            user: process.env.USER_SERVICE_URL,
            manufacturing: process.env.MANUFACTURING_SERVICE_URL,
            warranty: process.env.WARRANTY_SERVICE_URL,
            vehicle: process.env.VEHICLE_SERVICE_URL,
        };
        this.validateServiceUrls();
    }

    /**
     * Validate that all required service URLs are configured
     * @private
     */
    validateServiceUrls() {
        const requiredServices = ['user', 'manufacturing', 'warranty', 'vehicle'];
        const missingServices = requiredServices.filter(service => !this.serviceUrls[service]);

        if (missingServices.length > 0) {
            throw new Error(`Missing service URLs: ${missingServices.join(', ')}`);
        }
    }

    /**
     * Create proxy configuration for a service
     * @param {string} target - Target service URL
     * @param {object} pathRewrite - Path rewrite rules
     * @param {boolean} requiresAuth - Whether authentication is required
     * @returns {object} Proxy configuration
     * @private
     */
    createProxyConfiguration(target, pathRewrite, requiresAuth = false) {
        return {
            target,
            changeOrigin: true,
            timeout: 60000,
            proxyTimeout: 60000,
            pathRewrite,
            onProxyReq: (proxyReq, req) => {
                if (requiresAuth && req.headers.authorization) {
                    proxyReq.setHeader('Authorization', req.headers.authorization);
                }

                // Fix content-length for POST requests
                if (req.body && (req.method === 'POST' || req.method === 'PUT')) {
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
     * Initialize all routes for the API Gateway
     * @public
     */
    initializeRoutes() {
        this.registerHealthCheck();
        this.registerAuthRoutes();
        this.registerUserRoutes();
        this.registerManufacturingRoutes();
        this.registerWarrantyRoutes();
        this.registerVehicleRoutes();
        this.register404Handler();
    }

    /**
     * Register health check endpoint
     * @private
     */
    registerHealthCheck() {
        this.app.get('/health', (req, res) => {
            res.json({
                success: true,
                message: 'API Gateway đang hoạt động',
                timestamp: new Date().toISOString(),
                services: Object.keys(this.serviceUrls)
            });
        });
    }

    /**
     * Register authentication routes
     * @private
     */
    registerAuthRoutes() {
        this.app.use(
            '/api/auth',
            createProxyMiddleware(this.createProxyConfiguration(
                this.serviceUrls.user,
                {
                    '^/api/auth/health': '/health',
                    '^/api/auth': '/auth'
                },
                false
            ))
        );
    }

    /**
     * Register user management routes
     * @private
     */
    registerUserRoutes() {
        this.app.use(
            '/api/users',
            createProxyMiddleware(this.createProxyConfiguration(
                this.serviceUrls.user,
                { '^/api/users': '/users' },
                true
            ))
        );
    }

    /**
     * Register manufacturing routes
     * @private
     */
    registerManufacturingRoutes() {
        this.app.use(
            '/api/manufacturing',
            createProxyMiddleware(this.createProxyConfiguration(
                this.serviceUrls.manufacturing,
                { '^/api/manufacturing': '' },
                true
            ))
        );
    }

    /**
     * Register warranty routes
     * @private
     */
    registerWarrantyRoutes() {
        this.app.use(
            '/api/warranty',
            createProxyMiddleware(this.createProxyConfiguration(
                this.serviceUrls.warranty,
                { '^/api/warranty': '' },
                true
            ))
        );
    }

    /**
     * Register vehicle routes
     * @private
     */
    registerVehicleRoutes() {
        this.app.use(
            '/api/vehicle',
            createProxyMiddleware(this.createProxyConfiguration(
                this.serviceUrls.vehicle,
                { '^/api/vehicle': '' },
                true
            ))
        );
    }

    /**
     * Register 404 handler for unmatched routes
     * @private
     */
    register404Handler() {
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
