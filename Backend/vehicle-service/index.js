import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'dotenv/config';
import connectDB from './config/database.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import customerRoutes from './routes/customerRoutes.js';

const app = express();
const PORT = process.env.PORT || 3002;

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
        message: 'Vehicle Service API',
        version: '1.0.0',
        endpoints: {
            vehicles: '/api/vehicles',
            customers: '/api/customers'
        }
    });
});

app.use('/api/vehicles', vehicleRoutes);
app.use('/api/customers', customerRoutes);

app.listen(PORT, () => {
    console.log(`Vehicle Service running on port ${PORT}`);
});