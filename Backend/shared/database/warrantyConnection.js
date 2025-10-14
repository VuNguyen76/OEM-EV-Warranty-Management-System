const mongoose = require('mongoose');

let warrantyConnection = null;

const connectToWarrantyDB = async () => {
    try {
        if (warrantyConnection && warrantyConnection.readyState === 1) {
            return warrantyConnection;
        }

        const WARRANTY_DB_URI = process.env.WARRANTY_DB_URI;
        warrantyConnection = mongoose.createConnection(WARRANTY_DB_URI, {
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

        // FIXED: Proper event handling with cleanup and meaningful logs
        warrantyConnection.on('connected', () => {
            console.log('✅ Warranty DB connected successfully');
        });

        warrantyConnection.on('error', (err) => {
            console.error('❌ Warranty DB connection error:', err.message);
        });

        warrantyConnection.on('disconnected', () => {
            console.warn('⚠️ Warranty DB disconnected');
        });

        warrantyConnection.on('reconnected', () => {
            console.log('🔄 Warranty DB reconnected');
        });

        // Chờ kết nối
        await new Promise((resolve, reject) => {
            warrantyConnection.once('open', resolve);
            warrantyConnection.once('error', reject);
        });

        return warrantyConnection;
    } catch (error) {
        throw error;
    }
};

const getWarrantyConnection = () => {
    if (!warrantyConnection) {
        throw new Error('Warranty DB connection not initialized. Call connectToWarrantyDB() first.');
    }
    return warrantyConnection;
};

module.exports = {
    connectToWarrantyDB,
    getWarrantyConnection
};
