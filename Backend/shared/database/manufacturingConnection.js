const mongoose = require('mongoose');

let manufacturingConnection = null;

const connectToManufacturingDB = async () => {
    try {
        if (manufacturingConnection && manufacturingConnection.readyState === 1) {
            return manufacturingConnection;
        }

        const MANUFACTURING_DB_URI = process.env.MANUFACTURING_DB_URI || 'mongodb://mongo:qixrNEtIZeVkwiXmEIKawDvLBFlwaDvS@turntable.proxy.rlwy.net:23317';

        manufacturingConnection = mongoose.createConnection(MANUFACTURING_DB_URI, {
            maxPoolSize: 20,
            minPoolSize: 5,
            maxIdleTimeMS: 30000,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        });

        manufacturingConnection.on('connected', () => {
            // Connected
        });

        manufacturingConnection.on('error', () => {
            // Connection error
        });

        manufacturingConnection.on('disconnected', () => {
            // Disconnected
        });

        // Wait for connection
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
