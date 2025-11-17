import Warranty from "../models/warranty.model.js";

export default {
    async calculate(filters) {
        const { model, part, region, from, to } = filters;

        const query = {};

        if (model) query.model = model;
        if (part) query.part = part;
        if (region) query.region = region;
        if (from && to) {
            query.failureDate = { $gte: new Date(from), $lte: new Date(to) };
        }

        const total = await Warranty.countDocuments();
        const filtered = await Warranty.countDocuments(query);

        return {
            totalFailures: filtered,
            failureRate: total === 0 ? 0 : (filtered / total * 100).toFixed(2) + "%",
            criteria: query
        };
    }
};
