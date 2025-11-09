import mongoose from "mongoose";
import "dotenv/config";
import WarrantyPolicy from "../models/WarrantyPolicy.js";
import WarrantyClaim from "../models/WarrantyClaim.js";

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGO_URL;
    
    if (!mongoUri) {
      throw new Error("MONGO_URI or MONGO_URL environment variable is not defined");
    }

    const connectionOptions = {
      // Options for Railway and production environments
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      retryWrites: true,
      w: 'majority',
      // These options are deprecated but kept for older MongoDB versions
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };

    await mongoose.connect(mongoUri, connectionOptions);
    console.log("MongoDB connected successfully");
    console.log(`Connected to: ${mongoose.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  }
};

export default connectDB;
