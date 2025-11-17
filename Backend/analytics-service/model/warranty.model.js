import mongoose from "mongoose";

const WarrantySchema = new mongoose.Schema({
    model: String,
    part: String,
    region: String,
    cost: Number,
    failureDate: Date,
    description: String
});

export default mongoose.model("Warranty", WarrantySchema);
