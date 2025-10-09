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
    if (process.env.ENABLE_RATE_LIMIT === "true") {
      this.app.use(apiRateLimit);
      this.app.use("/api/auth/login", loginRateLimit);
      this.app.use("/api/auth/register", registerRateLimit);
      this.app.use("/api/users/delete", strictRateLimit);
      this.app.use("/api/users/update-role", strictRateLimit);
      console.log("Rate limiting ENABLED");
    } else {
      console.log("Rate limiting is disabled");
    }
        // Xóa middleware parse body để tránh xung đột với proxy
        // this.app.use(express.json());
        // this.app.use(express.urlencoded({ extended: true }));

        this.app.use(apiRateLimit);
        this.app.use('/api/auth/login', loginRateLimit);
        this.app.use('/api/auth/register', registerRateLimit);
        this.app.use('/api/users/delete', strictRateLimit);
        this.app.use('/api/users/update-role', strictRateLimit);

    this.gatewayService = new GatewayService(this.app);
  }

  async start(port) {
    try {
      await redisService.connect();
      console.log("✅ Redis connected for rate limiting");
    } catch (error) {
      console.warn(
        "⚠️ Redis connection failed, rate limiting will be disabled:",
        error.message
      );
    }

    this.gatewayService.initRoutes();

    this.app.listen(port, () => {});
  }
}

module.exports = App;
