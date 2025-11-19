import axios from "axios";
import ClaimAnalytics from "../models/ClaimAnalytics.js";

export const analyzeAndSave = async (period, token) => {
  // 1. Lấy claim từ warranty-service
  const response = await axios.get(`${process.env.WARRANTY_SERVICE_URL}?period=${period}`,{
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });
  const claims = response.data.data;

  if (!claims || !claims.length) return null;

  let totalClaims = claims.length;
  let totalWarranty = 0;
  let totalCustomer = 0;

  const partsStats = {};
  const modelStats = {};
  const centerStats = {};

  // 2. Phân tích dữ liệu mô phỏng
  for (const claim of claims) {
    totalWarranty += claim.summary.total_warranty_amount;
    totalCustomer += claim.summary.total_customer_amount;

    for (const part of claim.parts) {
      if (!partsStats[part.part_name]) {
        partsStats[part.part_name] = { failure_count: 0, total_cost: 0 };
      }
      partsStats[part.part_name].failure_count += 1;
      partsStats[part.part_name].total_cost += part.cost;
    }

    const model = claim.vehicle.model;
    if (!modelStats[model]) {
      modelStats[model] = { claims_count: 0, total_warranty: 0, total_customer: 0 };
    }
    modelStats[model].claims_count += 1;
    modelStats[model].total_warranty += claim.summary.total_warranty_amount;
    modelStats[model].total_customer += claim.summary.total_customer_amount;

    const center = claim.center_id;
    if (!centerStats[center]) {
      centerStats[center] = { claims_count: 0, total_warranty: 0 };
    }
    centerStats[center].claims_count += 1;
    centerStats[center].total_warranty += claim.summary.total_warranty_amount;
  }

  // 3. Lưu kết quả vào DB
  const analyticsDoc = await ClaimAnalytics.findOneAndUpdate(
    { period },
    {
      period,
      total_claims: totalClaims,
      total_warranty_amount: totalWarranty,
      total_customer_amount: totalCustomer,
      parts_failure_stats: Object.entries(partsStats).map(([part_name, stats]) => ({
        part_name,
        failure_count: stats.failure_count,
        failure_rate: stats.failure_count / totalClaims,
        average_cost: stats.total_cost / stats.failure_count,
      })),
      vehicle_model_stats: Object.entries(modelStats).map(([model, stats]) => ({
        model,
        ...stats,
      })),
      center_stats: Object.entries(centerStats).map(([center_id, stats]) => ({
        center_id,
        ...stats,
      })),
      predicted_future_cost: totalWarranty * 0.1, // mô phỏng dự báo 10%
    },
    { upsert: true, new: true }
  );

  return analyticsDoc;
};
