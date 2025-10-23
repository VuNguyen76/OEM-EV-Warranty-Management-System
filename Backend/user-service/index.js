import express from "express";
import dotenv from "dotenv";

import connectDB from "./configs/database.js";
import cors from "cors";

import userRouter from "./routes/userRoute.js" 

const app = express();
dotenv.config();

// Middleware cơ bản
app.use(express.json());
app.use(cors());

//Kết nối DB
connectDB();

// Route test
app.get("/", (req, res) => {
  res.json({ message: "Service is running!" });
});
app.use("/api/user", userRouter);
app.use("/api/centers", userRouter);



// Chạy server

const PORT = process.env.PORT_USER || 3001;
app.listen(PORT, () => {
  console.log(`Service is running on port ${PORT}`);
});
