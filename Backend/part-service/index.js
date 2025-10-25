import express from "express";
import dotenv from "dotenv";

dotenv.config();

import connectDB from './config/database.js';
import partRoutes from './routes/partRoutes.js';
// import inventoryRoutes from './routes/inventoryRoutes.js';
// import shipmentRoutes from './routes/shipmentRoutes.js';


const app = express();

const PORT = process.env.PORT;

// Connect to database
connectDB();


// Route test
app.get("/", (req, res) => {
  res.json({ message: "Service is running!" });
});

// Middleware
app.use(express.json());


app.use('/api/parts', partRoutes);
// app.use('/api/inventory', inventoryRoutes);
// app.use('/api/shipments', shipmentRoutes);


app.listen(PORT, () => {
  console.log(`Service is running on port ${PORT}`);
});