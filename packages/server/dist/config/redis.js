"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisSub = exports.redisPub = void 0;
exports.initRedis = initRedis;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
exports.redisPub = new ioredis_1.default(env_1.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
});
exports.redisSub = new ioredis_1.default(env_1.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
});
exports.redisPub.on('error', () => { });
exports.redisSub.on('error', () => { });
async function initRedis() {
    if (exports.redisPub.status === 'ready' || exports.redisPub.status === 'connecting')
        return;
    try {
        await exports.redisPub.connect();
        await exports.redisSub.connect();
        console.log('⚡ Connected to Redis successfully');
    }
    catch (err) {
        console.warn('⚠️ Could not connect to Redis server. Falling back to local memory pub/sub for tests/dev.', err);
    }
}
