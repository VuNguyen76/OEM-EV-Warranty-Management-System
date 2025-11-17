const AnalyticsClaim = require('../model/AnalyticsClaim');
const ss = require('simple-statistics');
const natural = require('natural');

class AnalyticsService {
  
  // --- UC24: Thống kê tỷ lệ hỏng hóc ---
  async getFailureStats(modelFilter) {
    const matchStage = modelFilter ? { model: modelFilter } : {};
    
    return await AnalyticsClaim.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$partName",
          failureCount: { $sum: 1 },
          totalCost: { $sum: "$repairCost" }
        }
      },
      { $sort: { failureCount: -1 } } // Part nào hay hỏng nhất lên đầu
    ]);
  }

  // --- UC25: AI Phân tích nguyên nhân (NLP) ---
  async getRootCauseAnalysis() {
    const claims = await AnalyticsClaim.find({}, 'errorDescription');
    const tokenizer = new natural.WordTokenizer();
    const wordMap = {};

    claims.forEach(doc => {
      if (doc.errorDescription) {
        const words = tokenizer.tokenize(doc.errorDescription.toLowerCase());
        words.forEach(w => {
          // Lọc từ khóa rác (Stopwords)
          if (w.length > 3 && !['error', 'failure', 'vehicle', 'check', 'lỗi', 'không'].includes(w)) {
            wordMap[w] = (wordMap[w] || 0) + 1;
          }
        });
      }
    });

    // Lấy Top 5 nguyên nhân
    return Object.entries(wordMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cause, count]) => ({ cause, count }));
  }

  // --- UC26: Dự báo chi phí (Linear Regression) ---
  async getCostForecast() {
    // 1. Gom nhóm chi phí theo tháng
    const monthlyData = await AnalyticsClaim.aggregate([
      {
        $group: {
          _id: { $month: "$failureDate" },
          monthlyCost: { $sum: "$repairCost" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const dataPoints = monthlyData.map(d => [d._id, d.monthlyCost]);

    // Nếu ít dữ liệu quá thì không dự báo được
    if (dataPoints.length < 2) return { message: "Not enough data for AI forecast" };

    // 2. Chạy thuật toán hồi quy tuyến tính
    const line = ss.linearRegression(dataPoints);
    const lineFunc = ss.linearRegressionLine(line);

    // 3. Dự báo tháng tiếp theo
    const lastMonth = dataPoints[dataPoints.length - 1][0];
    const nextMonth = lastMonth + 1;
    const predictedVal = Math.max(0, Math.round(lineFunc(nextMonth)));

    return {
      trend: line.m > 0 ? "TĂNG (Increasing)" : "GIẢM (Decreasing)",
      nextMonth: `Tháng ${nextMonth}`,
      predictedCost: predictedVal,
      historicalData: monthlyData
    };
  }
}

module.exports = new AnalyticsService();
