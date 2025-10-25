import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'dotenv/config';
import connectDB from './config/database.js';
import warrantyPolicyRoutes from './routes/warrantyPolicyRoutes.js';
import warrantyClaimRoutes from './routes/warrantyClaimRoutes.js';
import repairOrderRoutes from './routes/repairOrderRoutes.js';
import warrantyCostsRoutes from './routes/warrantyCostsRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

const app = express();
const PORT = process.env.PORT || 3003;

// Connect to database
connectDB();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Warranty Service API',
    version: '1.0.0',
    endpoints: {
      policies: '/api/policies',
      claims: '/api/claims',
      repairOrders: '/api/repair-orders',
      warrantyCosts: '/api/warranty-costs',
      analytics: '/api/analytics'
    }
  });
});

app.get('/health', async (req, res) => {
  try {
    res.json({
      status: 'healthy',
      service: 'warranty-service',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

app.use('/api/policies', warrantyPolicyRoutes);
app.use('/api/claims', warrantyClaimRoutes);
app.use('/api/repair-orders', repairOrderRoutes);
app.use('/api/warranty-costs', warrantyCostsRoutes);
app.use('/api/analytics', analyticsRoutes);

app.listen(PORT, () => {
  console.log(`🛡️  Warranty Service running on port ${PORT}`);
});

export default app;