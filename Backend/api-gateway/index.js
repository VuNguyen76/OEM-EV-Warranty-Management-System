import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(morgan("dev"));

const services = {
  user: process.env.USER_SERVICE_URL || "http://user-service:3001",
  vehicle: process.env.VEHICLE_SERVICE_URL || "http://vehicle-service:3002",
  warranty: process.env.WARRANTY_SERVICE_URL || "http://warranty-service:3003",
  part: process.env.PART_SERVICE_URL || "http://part-service:3004",
  campaign: process.env.CAMPAIGN_SERVICE_URL || "http://campaign-service:3005",
  analytics: process.env.ANALYTICS_SERVICE_URL || "http://analytics-service:3006",
};

const createServiceProxy = (mountPath, target, targetBase = "/api") =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path, req) => {
      const suffix = path?.startsWith("/") ? path : `/${path || ""}`;
      const base = targetBase.endsWith("/") ? targetBase.slice(0, -1) : targetBase;
      return `${base}${suffix}`;
    },
  });

app.use("/api/user", createServiceProxy("/api/user", services.user));
app.use("/api/vehicle", createServiceProxy("/api/vehicle", services.vehicle));
app.use("/api/warranty", createServiceProxy("/api/warranty", services.warranty));
app.use("/api/part", createServiceProxy("/api/part", services.part));
app.use("/api/campaign", createServiceProxy("/api/campaign", services.campaign));
app.use(
  "/api/analytics",
  createServiceProxy("/api/analytics", services.analytics, "/api/analytics")
);

const PORT = process.env.PORT_GATEWAY || 3000;
app.listen(PORT, () => console.log(`API Gateway running on port ${PORT}`));
