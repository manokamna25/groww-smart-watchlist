"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.devRouter = void 0;
const express_1 = require("express");
const env_1 = require("../config/env");
const simulatedSource_1 = require("./simulatedSource");
exports.devRouter = (0, express_1.Router)();
exports.devRouter.post('/inject-event', (req, res) => {
    if (!env_1.env.DEV_MODE) {
        return res.status(403).json({ error: 'Dev mode disabled. Event injection is forbidden in production.' });
    }
    const { symbol, type } = req.body;
    if (!symbol || !type) {
        return res.status(400).json({ error: 'symbol and type (spike | gap | volume_anomaly) are required.' });
    }
    if (!['spike', 'gap', 'volume_anomaly'].includes(type)) {
        return res.status(400).json({ error: 'Invalid event type. Must be spike, gap, or volume_anomaly.' });
    }
    try {
        simulatedSource_1.simulatedMarketSource.injectEvent(symbol, type);
        return res.json({
            success: true,
            message: `Successfully scheduled ${type} injection for ${symbol.toUpperCase()} on next tick.`,
        });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
