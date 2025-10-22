import express from "express";
import dotenv from "dotenv";
import connectDB from "./shared/configs/DBConfig/connectDB";

dotenv.config();

const app = express();

// Middleware cơ bản
app.use(express.json());

//Kết nối DB
connectDB();
console.log(123);

// Route test
app.get("/", (req, res) => {
  res.json({ message: "Service is running!" });
});

// Chạy server
const PORT = process.env.PORT_USER || 3001;
app.listen(PORT, () => {
  console.log(`Service is running on port ${PORT}`);
});
