"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.intelligenceRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const digest_1 = require("./digest");
const database_1 = require("../config/database");
exports.intelligenceRouter = (0, express_1.Router)();
// Protect intelligence endpoints with JWT auth
exports.intelligenceRouter.use(auth_1.authMiddleware);
exports.intelligenceRouter.get('/sync', async (req, res, next) => {
    try {
        const afterTs = req.query.afterTs;
        if (!afterTs)
            return res.json([]);
        const date = new Date(afterTs);
        if (isNaN(date.getTime()))
            return res.json([]);
        const missedEvents = await database_1.prisma.changeEvent.findMany({
            where: { ts: { gt: date } },
            orderBy: { ts: 'asc' },
            take: 50,
        });
        const formattedEvents = missedEvents.map((e) => ({
            id: e.id,
            symbol: e.symbol,
            ts: e.ts.toISOString(),
            tier: e.tier,
            score: e.score,
            narrative: e.narrative,
            signals: e.signals,
            confidence: e.confidence,
            createdAt: e.createdAt.toISOString(),
        }));
        res.json(formattedEvents);
    }
    catch (err) {
        next(err);
    }
});
exports.intelligenceRouter.get('/events/:id/breakdown', async (req, res, next) => {
    try {
        const breakdown = await (0, digest_1.getEventBreakdown)(req.params.id);
        res.json(breakdown);
    }
    catch (err) {
        next(err);
    }
});
exports.intelligenceRouter.post('/events/:id/ack', async (req, res, next) => {
    try {
        const result = await (0, digest_1.acknowledgeEvent)(req.user.userId, req.params.id);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
