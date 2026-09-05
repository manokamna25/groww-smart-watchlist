"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketRouter = void 0;
const express_1 = require("express");
const gateway_1 = require("../ws/gateway");
exports.marketRouter = (0, express_1.Router)();
exports.marketRouter.get('/sentiment/:symbol', (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    // We can add a base multiplier to simulate a larger crowd (e.g. 100x)
    // or just return the exact refCount for demo purposes.
    // We'll add a baseline of ~30 + random to make it look active, plus the actual refCount.
    const actualCount = gateway_1.socketGateway.getRefCount(symbol);
    // Deterministic random based on symbol length to keep it somewhat stable
    const baseCount = 30 + (symbol.length * 7);
    return res.json({
        symbol,
        activeTraders: baseCount + actualCount * 12
    });
});
