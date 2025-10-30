import express from "express";
import dotenv from "dotenv";
dotenv.config("../../.env");

import connectDB from "./configs/database.js";
import cors from "cors";

import userRouter from "./routes/userRoute.js";
import authUser from "./routes/authRoute.js";
import centerRouter from "./routes/centerRoute.js";
import technicianRouter from "./routes/technicianRoute.js";

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

//Kết nối DB
connectDB();

// Route test
app.get("/", (req, res) => {
  res.json({ message: "Service is running!" });
});
app.use("/api/auth", authUser);
app.use("/api/users", userRouter);
app.use("/api/centers", centerRouter);
app.use("/api/technicians", technicianRouter);

// Chạy server

const PORT = process.env.PORT_USER || 3001;
app.listen(PORT, () => {
  console.log(`Service is running on port ${PORT}`);
});
