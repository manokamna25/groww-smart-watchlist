"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load .env from workspace root if available
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
exports.env = {
    PORT: process.env.PORT || '3001',
    NODE_ENV: process.env.NODE_ENV || 'development',
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/smart_watchlist?schema=public',
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    JWT_SECRET: process.env.JWT_SECRET || 'super-secret-groww-hackathon-jwt-key-2026',
    DEV_MODE: process.env.DEV_MODE !== 'false',
};
