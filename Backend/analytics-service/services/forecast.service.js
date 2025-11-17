import Warranty from "../models/warranty.model.js";

export default {
    async forecast(filters) {
        const { model, region } = filters;

        const query = {};
        if (model) query.model = model;
        if (region) query.region = region;

        const data = await Warranty.find(query).sort({ failureDate: 1 });

        if (data.length < 3) {
            return { error: "Not enough data for forecasting" };
        }

        // Chuyển dữ liệu thành dạng (x = tháng thứ N, y = cost)
        const monthly = {};

        data.forEach(item => {
            const key = item.failureDate.getFullYear() + "-" + (item.failureDate.getMonth() + 1);
            if (!monthly[key]) monthly[key] = 0;
            monthly[key] += item.cost;
        });

        const x = [];
        const y = [];

        Object.values(monthly).forEach((cost, index) => {
            x.push(index + 1);
            y.push(cost);
        });

        // Tính linear regression
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b);
        const sumY = y.reduce((a, b) => a + b);
        const sumXY = x.map((v, i) => v * y[i]).reduce((a, b) => a + b);
        const sumX2 = x.map(v => v * v).reduce((a, b) => a + b);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        const nextMonth = n + 1;
        const forecastValue = slope * nextMonth + intercept;

        return {
            historical: monthly,
            forecastNextMonth: Number(forecastValue.toFixed(2)),
            model,
            region
        };
    }
};
