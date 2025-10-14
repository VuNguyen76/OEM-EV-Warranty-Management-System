// shared/database/vehicleConnection.js
// Kết nối database riêng cho Vehicle Service

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load .env từ thư mục Backend
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Tạo kết nối riêng cho Vehicle Service
let vehicleConnection = null;

const connectToVehicleDatabase = async () => {
    try {
        const mongoUri = process.env.VEHICLE_MONGODB_URI;

        if (!mongoUri) {
            throw new Error("VEHICLE_MONGODB_URI is not defined in environment variables");
        }
        vehicleConnection = mongoose.createConnection(mongoUri, {
            maxPoolSize: 50,
            minPoolSize: 10,
            maxIdleTimeMS: 30000,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 30000,
            heartbeatFrequencyMS: 10000,
            retryWrites: true,
            retryReads: true,
        });

        // Chờ kết nối to be established
        await new Promise((resolve, reject) => {
            vehicleConnection.once('open', resolve);
            vehicleConnection.once('error', reject);
        });

        // Xử lý sự kiện kết nối
        vehicleConnection.on('error', () => {
            // Lỗi kết nối
        });

        vehicleConnection.on('disconnected', () => {
            // Mất kết nối
        });

        vehicleConnection.on('reconnected', () => {
            // Kết nối lại
        });

        return vehicleConnection;

    } catch (err) {
        console.error("❌ Error connecting to Vehicle database:", err.message);
        throw new Error(`Failed to connect to Vehicle database: ${err.message}`);
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
