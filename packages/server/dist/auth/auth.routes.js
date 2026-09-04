"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const auth_service_1 = require("./auth.service");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post('/register', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await (0, auth_service_1.registerUser)(email, password);
        res.status(201).json(result);
    }
    catch (err) {
        next(err);
    }
});
exports.authRouter.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await (0, auth_service_1.loginUser)(email, password);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
