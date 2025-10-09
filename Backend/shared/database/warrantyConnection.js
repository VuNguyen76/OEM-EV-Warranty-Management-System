const mongoose = require('mongoose');

let warrantyConnection = null;

const connectToWarrantyDB = async () => {
    try {
        if (warrantyConnection && warrantyConnection.readyState === 1) {
            return warrantyConnection;
        }

        const WARRANTY_DB_URI = process.env.WARRANTY_DB_URI || 'mongodb://mongo:cTNxYIJzmVIoQKWUdmOlxojqaNzBvtEs@shuttle.proxy.rlwy.net:25448';

        warrantyConnection = mongoose.createConnection(WARRANTY_DB_URI, {
            maxPoolSize: 20,
            minPoolSize: 5,
            maxIdleTimeMS: 30000,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 30000
        });

        warrantyConnection.on('connected', () => {
            // Connected
        });

        warrantyConnection.on('error', () => {
            // Lỗi kết nối
        });

        warrantyConnection.on('disconnected', () => {
            // Mất kết nối
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
