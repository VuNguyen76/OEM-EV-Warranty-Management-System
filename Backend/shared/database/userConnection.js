// shared/database/userConnection.js
// Kết nối database riêng cho User Service

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load .env từ thư mục Backend
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const connectToUserDatabase = async () => {
    try {
        const mongoUri = process.env.USER_MONGODB_URI || process.env.MONGODB_URI;
        console.log("🔗 Connecting to User Database...");
        console.log("URI:", mongoUri ? mongoUri.replace(/\/\/.*@/, '//***:***@') : 'undefined');

        if (!mongoUri) {
            throw new Error("USER_MONGODB_URI or MONGODB_URI is not defined in environment variables");
        }

        await mongoose.connect(mongoUri, {
            maxPoolSize: 20, // Tăng pool size để hiệu suất tốt hơn
            minPoolSize: 5, // Số kết nối tối thiểu duy trì
            maxIdleTimeMS: 30000, // Đóng kết nối sau 30 giây không hoạt động
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
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
