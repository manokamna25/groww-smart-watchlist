"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.intelligenceRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const digest_1 = require("./digest");
exports.intelligenceRouter = (0, express_1.Router)();
// Protect intelligence endpoints with JWT auth
exports.intelligenceRouter.use(auth_1.authMiddleware);
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
