"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.watchlistRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const watchlist_service_1 = require("./watchlist.service");
exports.watchlistRouter = (0, express_1.Router)();
// Protect all watchlist routes with JWT auth
exports.watchlistRouter.use(auth_1.authMiddleware);
exports.watchlistRouter.get('/', async (req, res, next) => {
    try {
        const watchlists = await (0, watchlist_service_1.getUserWatchlists)(req.user.userId);
        res.json(watchlists);
    }
    catch (err) {
        next(err);
    }
});
exports.watchlistRouter.post('/', async (req, res, next) => {
    try {
        const { name } = req.body;
        const watchlist = await (0, watchlist_service_1.createWatchlist)(req.user.userId, name);
        res.status(201).json(watchlist);
    }
    catch (err) {
        next(err);
    }
});
exports.watchlistRouter.get('/:id/summary', async (req, res, next) => {
    try {
        const summary = await (0, watchlist_service_1.getWatchlistSummary)(req.user.userId, req.params.id);
        res.json(summary);
    }
    catch (err) {
        next(err);
    }
});
exports.watchlistRouter.post('/:id/items', async (req, res, next) => {
    try {
        const { symbol } = req.body;
        const item = await (0, watchlist_service_1.addWatchlistItem)(req.user.userId, req.params.id, symbol);
        res.status(201).json(item);
    }
    catch (err) {
        next(err);
    }
});
exports.watchlistRouter.delete('/:id/items/:symbol', async (req, res, next) => {
    try {
        const result = await (0, watchlist_service_1.removeWatchlistItem)(req.user.userId, req.params.id, req.params.symbol);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
exports.watchlistRouter.post('/:id/items/:symbol/ack', async (req, res, next) => {
    try {
        const result = await (0, watchlist_service_1.ackWatchlistItem)(req.user.userId, req.params.id, req.params.symbol);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
