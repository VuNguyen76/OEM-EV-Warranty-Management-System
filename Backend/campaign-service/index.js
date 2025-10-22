import express from "express";
import dotenv from "dotenv"; 

dotenv.config();

const app = express();

// Middleware cơ bản
app.use(express.json());

// Route test
app.get("/", (req, res) => {
  res.json({ message: "Service is running!" });
});

// Chạy server
const PORT = process.env.PORT_CAMPAIGN || 3005;
app.listen(PORT, () => {
  console.log(`Service is running on port ${PORT}`);
});
