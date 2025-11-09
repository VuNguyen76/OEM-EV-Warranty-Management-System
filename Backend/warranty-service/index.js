import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import connectDB from "./config/database.js";
import warrantyPolicyRoutes from "./routes/warrantyPolicyRoutes.js";
import warrantyClaimRoutes from "./routes/warrantyClaimRoutes.js";
import warrantyCostsRoutes from "./routes/warrantyCostsRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3003;

// Connect to database
connectDB();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(morgan("combined"));
app.use(express.json());

// Serve static files (hình ảnh đã upload)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "Warranty Service API",
    version: "1.0.0",
    endpoints: {
      policies: "/api/policies",
      claims: "/api/claims",
      repairOrders: "/api/repair-orders",
      warrantyCosts: "/api/warranty-costs",
      analytics: "/api/analytics",
    },
  });
});

app.get("/health", async (req, res) => {
  try {
    res.json({
      status: "healthy",
      service: "warranty-service",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
    });
  }
});

app.use("/api/policies", warrantyPolicyRoutes);
app.use("/api/claims", warrantyClaimRoutes);
app.use("/api/warranty-costs", warrantyCostsRoutes);
app.use("/api/analytics", analyticsRoutes);


app.listen(PORT, () => {
  console.log(`Warranty Service running on port ${PORT}`);
});

export default app;
