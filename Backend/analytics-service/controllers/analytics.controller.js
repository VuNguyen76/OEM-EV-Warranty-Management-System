import { analyzeAndSave } from "../services/analytics.service.js";
import ClaimAnalytics from "../models/ClaimAnalytics.js";

export const triggerAnalysis = async (req, res) => {
  try {
    const token = req.token;

    const period = req.query.period  // YYYY-MM
    if (!period ) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu tham số period" });
    }
    console.log(period);
        const result = await analyzeAndSave(period, token);


    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy dữ liệu của tháng này" });
    }

    res.json({ success: true, data: result, message: "Phân tích hoàn tất" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAnalyticsByPeriod = async (req, res) => {
  try {
    const period = req.query.period;
    if (!period) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu tham số period" });
    }

    const doc = await ClaimAnalytics.findOne({ period });
    if (!doc) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy dữ liệu của tháng này" });
    }

      res.json({ success: true, data: doc });
    } catch (error) {
      res.status(500).json({ success: false, message: "Lỗi lấy dữ liệu" });
    }
  };
