require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const connectRabbitMQ = require('./services/consumerService');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database
connectDB();

// RabbitMQ Consumer (Chạy nền)
connectRabbitMQ();

// Routes
// Gateway forward "/api/analytics", nên ở đây ta map vào gốc luôn hoặc map đúng prefix
app.use('/api/analytics', analyticsRoutes);

// Health Check
app.get('/', (req, res) => res.send('Analytics Service is Running...'));

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => {
  console.log(`🚀 Analytics Service running on port ${PORT}`);
});
