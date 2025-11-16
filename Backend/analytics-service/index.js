import express from "express";
import dotenv from "dotenv";
import analyticsRoutes from "./src/routes/analyticsRoutes.js";
import connectDB from "./src/database/connect.js";

dotenv.config();
const app = express();

app.use(express.json());

// Route chính
app.use("/api/analytics", analyticsRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "analytics-service", time: new Date() });
});



connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Analytics Service running on port ${PORT}`);
  });
});
