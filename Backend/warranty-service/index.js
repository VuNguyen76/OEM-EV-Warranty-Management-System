import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'dotenv/config';
import connectDB from './config/database.js';
import warrantyPolicyRoutes from './routes/warrantyPolicyRoutes.js';
import warrantyClaimRoutes from './routes/warrantyClaimRoutes.js';

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
      claims: '/api/claims'
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

app.listen(PORT, () => {
  console.log(`🛡️  Warranty Service running on port ${PORT}`);
});

export default app;