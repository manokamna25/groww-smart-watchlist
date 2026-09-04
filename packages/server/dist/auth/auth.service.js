"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
const database_1 = require("../config/database");
const jwt_1 = require("./jwt");
const errorHandler_1 = require("../middleware/errorHandler");
async function registerUser(email, password) {
    if (!email || !password || password.length < 6) {
        throw new errorHandler_1.AppError('Email and password (min 6 chars) are required', 400);
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await database_1.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
        throw new errorHandler_1.AppError('User with this email already exists', 409);
    }
    const passwordHash = await (0, jwt_1.hashPassword)(password);
    // Create user and a default "Main Watchlist"
    const user = await database_1.prisma.user.create({
        data: {
            email: normalizedEmail,
            passwordHash,
            watchlists: {
                create: {
                    name: 'Main Watchlist',
                },
            },
        },
        include: {
            watchlists: true,
        },
    });
    const token = (0, jwt_1.generateToken)({ userId: user.id, email: user.email });
    return {
        user: {
            id: user.id,
            email: user.email,
        },
        token,
    };
}
async function loginUser(email, password) {
    if (!email || !password) {
        throw new errorHandler_1.AppError('Email and password are required', 400);
    }
    const normalizedEmail = email.trim().toLowerCase();
    const user = await database_1.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
        throw new errorHandler_1.AppError('Invalid email or password', 401);
    }
    const isValid = await (0, jwt_1.comparePassword)(password, user.passwordHash);
    if (!isValid) {
        throw new errorHandler_1.AppError('Invalid email or password', 401);
    }
    const token = (0, jwt_1.generateToken)({ userId: user.id, email: user.email });
    return {
        user: {
            id: user.id,
            email: user.email,
        },
        token,
    };
}
