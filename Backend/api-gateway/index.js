import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(morgan("dev"));

const services = {
  user: process.env.USER_SERVICE_URL || "http://user-service:3001",
  vehicle: process.env.VEHICLE_SERVICE_URL || "http://vehicle-service:3002",
  warranty: process.env.WARRANTY_SERVICE_URL || "http://warranty-service:3003",
  part: process.env.PART_SERVICE_URL || "http://part-service:3004",
  campaign: process.env.CAMPAIGN_SERVICE_URL || "http://campaign-service:3005",
};

// Tạo route

app.use("/api/users", createProxyMiddleware({ target: services.user, changeOrigin: true }));
app.use("/api/vehicles", createProxyMiddleware({ target: services.vehicle, changeOrigin: true }));
app.use("/api/warranty", createProxyMiddleware({ target: services.warranty, changeOrigin: true }));
app.use("/api/parts", createProxyMiddleware({ target: services.part, changeOrigin: true }));
app.use("/api/campaigns", createProxyMiddleware({ target: services.campaign, changeOrigin: true }));
// Analytics routes are handled by warranty-service
app.use("/api/analytics", createProxyMiddleware({ target: services.warranty, changeOrigin: true }));

const PORT = process.env.PORT_GATEWAY || 3000;
app.listen(PORT, () => console.log(`API Gateway running on port ${PORT}`));
