const { createProxyMiddleware } = require("http-proxy-middleware");

// Service routing configuration
const serviceRoutes = {
    '/api/auth': process.env.USER_SERVICE_URL || 'http://localhost:3001',
    '/api/users': process.env.USER_SERVICE_URL || 'http://localhost:3001',
    '/api/vehicles': process.env.VEHICLE_SERVICE_URL || 'http://localhost:3002'
};

// Create proxy middleware for each service
const createServiceProxy = (target) => {
    return createProxyMiddleware({
        target,
        changeOrigin: true,
        timeout: 30000, // 30 seconds
        proxyTimeout: 30000,
        pathRewrite: {
            '^/api': '' // Remove /api prefix when forwarding to services
        },
        onError: (err, req, res) => {
            console.error(`Proxy error to ${target}:`, err.message);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: 'Lỗi kết nối đến service',
                    error: err.message
                });
            }
        },
        onProxyReq: (proxyReq, req, res) => {
            // Forward request body for POST/PUT requests
            if (req.body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
                const bodyData = JSON.stringify(req.body);
                proxyReq.setHeader('Content-Type', 'application/json');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
            }
        }
    });
};

// Export service routes and proxy creator
module.exports = {
    serviceRoutes,
    createServiceProxy
};