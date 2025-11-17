const mongoose = require('mongoose');

const AnalyticsClaimSchema = new mongoose.Schema({
  originalClaimId: { type: String, required: true, unique: true }, // ID từ Warranty Service
  model: { type: String, required: true },      // VF3, VF8, VF9
  partName: { type: String, required: true },   // Battery, Motor, Screen
  region: String,                               // Ha Noi, HCM
  repairCost: { type: Number, default: 0 },
  failureDate: { type: Date, required: true },
  errorDescription: String,                     // Dùng cho AI NLP
  status: String                                // APPROVED, PENDING
}, { timestamps: true });

module.exports = mongoose.model('AnalyticsClaim', AnalyticsClaimSchema);
