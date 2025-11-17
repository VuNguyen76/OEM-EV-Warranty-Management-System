import failureRateService from "../services/failureRate.service.js";
import rootCauseService from "../services/rootCause.service.js";
import forecastService from "../services/forecast.service.js";

export const getFailureRate = async (req, res) => {
    try {
        const result = await failureRateService.calculate(req.query);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const analyzeRootCause = async (req, res) => {
    try {
        const result = await rootCauseService.analyze(req.query);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const forecastCost = async (req, res) => {
    try {
        const result = await forecastService.forecast(req.query);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
