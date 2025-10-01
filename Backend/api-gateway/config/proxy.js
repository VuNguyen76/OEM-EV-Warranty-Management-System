const { createProxyMiddleware } = require("http-proxy-middleware");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const proxy = createProxyMiddleware({
    target: process.env.USER_SERVICE_URL,
    changeOrigin: true,
    timeout: 30000, // 30 seconds
    proxyTimeout: 30000,
    onError: (err, req, res) => {
        console.error('Proxy error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Proxy error',
            error: err.message
        });
    }
});

module.exports = proxy;