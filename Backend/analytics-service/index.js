import express from "express";
import dotenv from "dotenv";
import analyticsRoutes from "./routes/analytics.route.js";
import connectDB from "./config/database.js";
import cors from "cors";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Route chính
app.use("/api/analytics", analyticsRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "analytics-service", time: new Date() });
});

// Kết nối DB và khởi động server
const PORT = process.env.PORT;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Analytics Service running on port ${PORT}`);
  });
});
