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

        warrantyConnection.on('connected', () => {
            // Connected
            console.log('Đã kết nối đến DB')
        });

        warrantyConnection.on('error', () => {
            // Lỗi kết nối
            console.log('Lỗi kết nối đến DB')
        });

        warrantyConnection.on('disconnected', () => {
            // Mất kết nối
            console.log('Mất kết nối đến DB')
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
