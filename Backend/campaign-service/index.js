import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/database.js";
import campaignRoutes from "./routes/CampaignRoute.js";
import appointmentRoutes from "./routes/AppointmentRoute.js";
import campaignVehicleRoutes from "./routes/CampaignVehicleRoute.js";
dotenv.config();

const app = express();

// Middleware cơ bản
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
connectDB();

// Route test
app.get("/", (req, res) => {
  res.json({ message: "Service is running!" });
});

app.use("/api/campaigns", campaignRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/campaign-vehicles", campaignVehicleRoutes);
app;

// Chạy server
const PORT = process.env.PORT_CAMPAIGN;
app.listen(PORT, () => {
  console.log(`Service is running on port ${PORT}`);
});
