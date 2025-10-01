// src/services/GatewayService.js
import { createProxyMiddleware } from "http-proxy-middleware";

import dotenv from "dotenv";
dotenv.config(path.resolve(__dirname, "../../.env"));
export class GatewayService {
    constructor(app, authService, authorizationService) {
        this.app = app;
        this.authService = authService;
        this.authorizationService = authorizationService;
    }

    initRoutes() {
        // User service
        this.app.use(
            "/api/users",
            this.authService.authenticateToken.bind(this.authService),
            createProxyMiddleware({
                target: "USER_SERVICE_URL",
                changeOrigin: true,
            })
        );
    }
}
