import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import analyticsRoutes from "./routes/analytics.routes.js";

dotenv.config();
const app = express();

app.use(express.json());

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("Analytics Service connected to MongoDB"))
  .catch(err => console.log(err));

app.use("/analytics", analyticsRoutes);

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Analytics Service running on port ${PORT}`);
});
