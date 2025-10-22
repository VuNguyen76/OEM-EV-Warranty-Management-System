import mongoose from "mongoose";
import { mongoConnections } from "./mongoConnections";
const connectDB = async () => {
  const serviceName = process.env.SERVICE_NAME;
  const mongo_url = mongoConnections[serviceName];
  try {
    const connect = await mongoose.connect(mongo_url, {
      useNewUrlParser: true, //giúp đọc URI chính xác
      useUnifiedTopology: true, //giúp kết nối ổn định hơn
    });

    console.log(`MongoDB Connected: ${connect.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1); // Dừng service nếu lỗi DB
  }
};

export default connectDB;
