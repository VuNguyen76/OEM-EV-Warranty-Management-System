import express from "express";
import dotenv from "dotenv";
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

dotenv.config();
import connectDB from './config/database.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import partsAttachedRoutes from './routes/partsAttachedRoutes.js';

const app = express();
const PORT = process.env.PORT;

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
            customers: '/api/customers',
            parts: '/api/vehicles/:vin/parts, /api/parts/:serial_number',
            health: '/health'
        }
    });
});

app.get('/health', async (req, res) => {
    try {
        res.json({
            status: 'healthy',
            service: 'vehicle-service',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

app.use('/api/vehicles', vehicleRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api', partsAttachedRoutes);

app.listen(PORT, () => {
    console.log(`Vehicle Service running on port ${PORT}`);
});