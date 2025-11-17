import Warranty from "../models/warranty.model.js";

export default {
    async analyze(filters) {
        const { model, part, from, to } = filters;

        const query = {};
        if (model) query.model = model;
        if (part) query.part = part;
        if (from && to) query.failureDate = { $gte: new Date(from), $lte: new Date(to) };

        const data = await Warranty.find(query);

        if (data.length === 0) {
            return { message: "Insufficient Data" };
        }

        // NLP đơn giản: đếm từ khóa xuất hiện nhiều nhất trong mô tả lỗi
        const keywordMap = {};

        data.forEach(item => {
            const words = item.description.toLowerCase().split(" ");
            words.forEach(w => {
                if (!keywordMap[w]) keywordMap[w] = 0;
                keywordMap[w]++;
            });
        });

        // Top 5 nguyên nhân
        const rootCauses = Object.entries(keywordMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(i => ({ cause: i[0], count: i[1] }));

        return {
            totalRecords: data.length,
            topRootCauses: rootCauses,
            suggestions: [
                "Kiểm tra quy trình QC cho các phụ tùng liên quan.",
                "Tăng cường đào tạo kỹ thuật viên.",
                "Tối ưu thiết kế cho các lỗi xuất hiện nhiều nhất."
            ]
        };
    }
};
