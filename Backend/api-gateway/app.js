const express = require("express");
const { setupCommonMiddleware } = require("../shared/middleware/common");
const GatewayService = require("./services/GatewayService");
const redisService = require("../shared/services/RedisService");
const {
  apiRateLimit,
  loginRateLimit,
  registerRateLimit,
  strictRateLimit,
} = require("../shared/middleware/RateLimitMiddleware");

class App {
  constructor() {
    this.app = express();

    setupCommonMiddleware(this.app);

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Parse body cho POST requests trước khi proxy
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting configuration
    if (process.env.ENABLE_RATE_LIMIT === "true") {
      this.app.use(apiRateLimit);
      this.app.use("/api/auth/login", loginRateLimit);
      this.app.use("/api/auth/register", registerRateLimit);
      this.app.use("/api/users/delete", strictRateLimit);
      this.app.use("/api/users/update-role", strictRateLimit);
    }

    this.gatewayService = new GatewayService(this.app);
  }

  async start(port) {
    try {
      await redisService.connect();
    } catch (error) {
      // Redis connection failed, rate limiting will be disabled
    }

    this.gatewayService.initializeRoutes();

    this.app.listen(port, () => {
      console.log(`API Gateway running on port ${port}`);
    });
  }
}

module.exports = App;
