const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load .env từ thư mục Backend
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const connectToDatabase = async () => {
    try {
        console.log("MONGODB_URI:", process.env.MONGODB_URI);
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is not defined in environment variables");
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB database");
        console.log(`Database: ${process.env.MONGODB_URI.split('@')[1] || 'localhost'}`);
    } catch (err) {
        console.error("Error connecting to database:", err.message);
        process.exit(1);
    }
};

module.exports = connectToDatabase;