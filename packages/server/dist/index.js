"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const env_1 = require("./config/env");
const auth_routes_1 = require("./auth/auth.routes");
const watchlist_routes_1 = require("./watchlist/watchlist.routes");
const intelligence_routes_1 = require("./intelligence/intelligence.routes");
const dev_routes_1 = require("./market/dev.routes");
const errorHandler_1 = require("./middleware/errorHandler");
const gateway_1 = require("./ws/gateway");
const redis_1 = require("./config/redis");
exports.app = (0, express_1.default)();
exports.server = http_1.default.createServer(exports.app);
exports.app.use((0, cors_1.default)());
exports.app.use(express_1.default.json());
// Healthcheck endpoint
exports.app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Route registration
exports.app.use('/api/auth', auth_routes_1.authRouter);
exports.app.use('/api/watchlists', watchlist_routes_1.watchlistRouter);
exports.app.use('/api/intelligence', intelligence_routes_1.intelligenceRouter);
exports.app.use('/api/dev', dev_routes_1.devRouter);
// Central error handler
exports.app.use(errorHandler_1.errorHandler);
// In production, serve the compiled React frontend statically
if (process.env.NODE_ENV === 'production') {
    const path = require('path');
    const clientBuildPath = path.join(__dirname, '../../client/dist');
    exports.app.use(express_1.default.static(clientBuildPath));
    exports.app.get('*', (req, res) => {
        res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
}
// Initialize Socket.io gateway
gateway_1.socketGateway.init(exports.server);
const ingestion_1 = require("./market/ingestion");
if (process.env.NODE_ENV !== 'test') {
    (0, redis_1.initRedis)().then(() => {
        // Seed instruments and start the market ingestion engine
        ingestion_1.ingestionEngine.seedInstruments().then(() => {
            ingestion_1.ingestionEngine.start();
            console.log('📈 Simulated Market Feed Started');
            exports.server.listen(env_1.env.PORT, () => {
                console.log(`🚀 Smart Watchlist Backend listening on port ${env_1.env.PORT}`);
            });
        });
    });
}
