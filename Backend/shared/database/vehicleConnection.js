// shared/database/vehicleConnection.js
// Database connection specifically for Vehicle Service

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load .env từ thư mục Backend
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Create separate connection for Vehicle Service
let vehicleConnection = null;

const connectToVehicleDatabase = async () => {
    try {
        const mongoUri = process.env.VEHICLE_MONGODB_URI;
        console.log("🚗 Connecting to Vehicle Database...");
        console.log("URI:", mongoUri ? mongoUri.replace(/\/\/.*@/, '//***:***@') : 'undefined');
        
        if (!mongoUri) {
            throw new Error("VEHICLE_MONGODB_URI is not defined in environment variables");
        }

        // Create separate connection for Vehicle Service
        vehicleConnection = mongoose.createConnection(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        // Wait for connection to be established
        await new Promise((resolve, reject) => {
            vehicleConnection.once('open', resolve);
            vehicleConnection.once('error', reject);
        });

        console.log("✅ Connected to Vehicle MongoDB database");
        console.log(`📍 Database: ${mongoUri.split('@')[1]?.split('/')[0] || 'Railway'}`);
        
        // Handle connection events
        vehicleConnection.on('error', (err) => {
            console.error('❌ Vehicle Database connection error:', err);
        });

        vehicleConnection.on('disconnected', () => {
            console.warn('⚠️ Vehicle Database disconnected');
        });

        vehicleConnection.on('reconnected', () => {
            console.log('🔄 Vehicle Database reconnected');
        });

        return vehicleConnection;

    } catch (err) {
        console.error("❌ Error connecting to Vehicle database:", err.message);
        process.exit(1);
    }
};

const getVehicleConnection = () => {
    if (!vehicleConnection) {
        throw new Error("Vehicle database connection not established. Call connectToVehicleDatabase() first.");
    }
    return vehicleConnection;
};

module.exports = {
    connectToVehicleDatabase,
    getVehicleConnection
};
