const { createProxyMiddleware } = require("http-proxy-middleware");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const proxy = createProxyMiddleware({
    target: process.env.USER_SERVICE_URL,
    changeOrigin: true,
});

module.exports = proxy;