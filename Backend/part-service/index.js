import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'dotenv/config';
import connectDB from './config/database.js';
import partRoutes from './routes/partRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import shipmentRoutes from './routes/shipmentRoutes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to database
connectDB();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Part Service API',
    version: '1.0.0',
    endpoints: {
      parts: '/api/parts',
      inventory: '/api/inventory',
      shipments: '/api/shipments',
      health: '/health'
    }
  });
});

app.get('/health', async (req, res) => {
  try {
    res.json({
      status: 'healthy',
      service: 'part-service',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

app.use('/api/parts', partRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/shipments', shipmentRoutes);

app.listen(PORT, () => {
  console.log(`🔧 Part Service running on port ${PORT}`);
});

export default app;