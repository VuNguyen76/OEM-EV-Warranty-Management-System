// shared/database/userConnection.js
// Kết nối database riêng cho User Service

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load .env từ thư mục Backend
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const connectToUserDatabase = async () => {
    try {
        const mongoUri = process.env.USER_MONGODB_URI;
        console.log("🔗 Connecting to User Database...");
        console.log("URI:", mongoUri ? mongoUri.replace(/\/\/.*@/, '//***:***@') : 'undefined');

        if (!mongoUri) {
            throw new Error("USER_MONGODB_URI is not defined in environment variables");
        }
        await mongoose.connect(mongoUri, {
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

        console.log("✅ Connected to User MongoDB database");
        console.log(`📍 Database: ${mongoUri.split('@')[1]?.split('/')[0] || 'localhost'}`);

        // Xử lý sự kiện kết nối
        mongoose.connection.on('error', (err) => {
            console.error('❌ User Database connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ User Database disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('🔄 User Database reconnected');
        });

    } catch (err) {
        console.error("❌ Error connecting to User database:", err.message);
        process.exit(1);
    }
};

module.exports = connectToUserDatabase;
