import mongoose from "mongoose";

const PartStatSchema = new mongoose.Schema({
  part_name: String,
  failure_count: Number,
  failure_rate: Number,
  average_cost: Number,
});

const VehicleModelStatSchema = new mongoose.Schema({
  model: String,
  claims_count: Number,
  total_warranty: Number,
  total_customer: Number,
});

const CenterStatSchema = new mongoose.Schema({
  center_id: String,
  claims_count: Number,
  total_warranty: Number,
});

const ClaimAnalyticsSchema = new mongoose.Schema(
  {
    period: String, 
    total_claims: Number,
    total_warranty_amount: Number,
    total_customer_amount: Number,
    parts_failure_stats: [PartStatSchema],
    vehicle_model_stats: [VehicleModelStatSchema],
    center_stats: [CenterStatSchema],
    predicted_future_cost: Number, // mô phỏng dự báo
  },
  { timestamps: true }
);

export default mongoose.model("ClaimAnalytics", ClaimAnalyticsSchema);
