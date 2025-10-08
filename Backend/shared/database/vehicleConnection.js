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

        // Handle connection events
        vehicleConnection.on('error', () => {
            // Connection error
        });

        vehicleConnection.on('disconnected', () => {
            // Disconnected
        });

        vehicleConnection.on('reconnected', () => {
            // Reconnected
        });

        return vehicleConnection;

    } catch (err) {
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
