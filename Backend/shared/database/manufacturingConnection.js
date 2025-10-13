const mongoose = require('mongoose');

let manufacturingConnection = null;

const connectToManufacturingDB = async () => {
    try {
        if (manufacturingConnection && manufacturingConnection.readyState === 1) {
            return manufacturingConnection;
        }

        const MANUFACTURING_DB_URI = process.env.MANUFACTURING_DB_URI;
        manufacturingConnection = mongoose.createConnection(MANUFACTURING_DB_URI, {
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

        manufacturingConnection.on('connected', () => {
            // Connected
        });

        manufacturingConnection.on('error', () => {
            // Lỗi kết nối
        });

        manufacturingConnection.on('disconnected', () => {
            // Mất kết nối
        });

        // Chờ kết nối
        await new Promise((resolve, reject) => {
            manufacturingConnection.once('open', resolve);
            manufacturingConnection.once('error', reject);
        });

        return manufacturingConnection;
    } catch (error) {
        throw error;
    }
};

const getManufacturingConnection = () => {
    if (!manufacturingConnection) {
        throw new Error('Manufacturing DB connection not initialized. Call connectToManufacturingDB() first.');
    }
    return manufacturingConnection;
};

module.exports = {
    connectToManufacturingDB,
    getManufacturingConnection
};
