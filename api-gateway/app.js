// src/App.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { AuthService } from "./services/AuthService.js";
import { AuthorizationService } from "./services/AuthorizationService.js";
import { GatewayService } from "./services/GatewayService.js";

export class App {
    constructor(secret) {
        this.app = express();
        this.app.use(cors());
        this.app.use(helmet());

        // Khởi tạo service
        this.authService = new AuthService(secret);
        this.authorizationService = new AuthorizationService();

        // Gateway
        this.gatewayService = new GatewayService(
            this.app,
            this.authService,
            this.authorizationService
        );
    }

    start(port) {
        this.gatewayService.initRoutes();
        this.app.listen(port, () => {
            console.log(`API Gateway running on http://localhost:${port}`);
        });
    }
}
