"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestionEngine = exports.IngestionEngine = void 0;
const database_1 = require("../config/database");
const simulatedSource_1 = require("./simulatedSource");
const scorer_1 = require("../intelligence/scorer");
const narrator_1 = require("../intelligence/narrator");
const redis_1 = require("../config/redis");
const gateway_1 = require("../ws/gateway");
class IngestionEngine {
    dataSource;
    history = new Map();
    indexHistory = [];
    constructor(dataSource = simulatedSource_1.simulatedMarketSource) {
        this.dataSource = dataSource;
    }
    async seedInstruments() {
        const instruments = simulatedSource_1.simulatedMarketSource.getInstruments();
        for (const inst of instruments) {
            await database_1.prisma.instrument.upsert({
                where: { symbol: inst.symbol },
                update: {
                    name: inst.name,
                    exchange: inst.exchange,
                    sector: inst.sector,
                },
                create: {
                    symbol: inst.symbol,
                    name: inst.name,
                    exchange: inst.exchange,
                    sector: inst.sector,
                },
            });
        }
    }
    async processTick(tick) {
        // 1. Persist tick to DB
        const savedTick = await database_1.prisma.priceTick.create({
            data: {
                symbol: tick.symbol,
                price: tick.price,
                volume: tick.volume,
                exchangeTs: tick.exchangeTs,
                source: tick.source,
            },
        });
        const payload = {
            id: savedTick.id,
            symbol: tick.symbol,
            price: tick.price,
            volume: tick.volume,
            exchangeTs: tick.exchangeTs.toISOString(),
            source: tick.source,
        };
        // 2. Publish tick to Redis channel + direct gateway broadcast
        if (redis_1.redisPub.status === 'ready') {
            await redis_1.redisPub.publish(`tick:${tick.symbol}`, JSON.stringify(payload));
        }
        else {
            gateway_1.socketGateway.broadcastDirect(tick.symbol, 'tick', payload);
        }
        // 3. Track rolling history (~20 ticks)
        if (tick.symbol === 'NIFTY_INDEX') {
            this.indexHistory.push({ price: tick.price, volume: tick.volume });
            if (this.indexHistory.length > 20)
                this.indexHistory.shift();
            return savedTick;
        }
        const symbolHistory = this.history.get(tick.symbol) || [];
        // Evaluate change intelligence if we have previous history
        if (symbolHistory.length > 0) {
            const currentIndexTick = this.indexHistory.length > 0 ? this.indexHistory[this.indexHistory.length - 1] : undefined;
            const scored = (0, scorer_1.scoreTick)({ price: tick.price, volume: tick.volume }, symbolHistory, currentIndexTick, this.indexHistory);
            // Persist notable+ change events to DB
            if (scored.tier !== 'quiet') {
                const narrative = (0, narrator_1.generateNarrative)(tick.symbol, scored.pricePctChange, scored.indexPctChange, scored.signals);
                const changeEvent = await database_1.prisma.changeEvent.create({
                    data: {
                        symbol: tick.symbol,
                        ts: tick.exchangeTs,
                        tier: scored.tier,
                        score: scored.score,
                        narrative,
                        signals: scored.signals,
                    },
                });
                const eventPayload = {
                    id: changeEvent.id,
                    symbol: changeEvent.symbol,
                    ts: changeEvent.ts.toISOString(),
                    tier: changeEvent.tier,
                    score: changeEvent.score,
                    narrative: changeEvent.narrative,
                    signals: changeEvent.signals,
                    createdAt: changeEvent.createdAt.toISOString(),
                };
                // Publish event to Redis channel + direct gateway broadcast
                if (redis_1.redisPub.status === 'ready') {
                    await redis_1.redisPub.publish(`event:${tick.symbol}`, JSON.stringify(eventPayload));
                }
                else {
                    gateway_1.socketGateway.broadcastDirect(tick.symbol, 'change_event', eventPayload);
                }
            }
        }
        symbolHistory.push({ price: tick.price, volume: tick.volume });
        if (symbolHistory.length > 20)
            symbolHistory.shift();
        this.history.set(tick.symbol, symbolHistory);
        return savedTick;
    }
    start() {
        this.dataSource.onTick(async (tick) => {
            try {
                await this.processTick(tick);
            }
            catch (err) {
                console.error(`Error ingesting tick for ${tick.symbol}:`, err);
            }
        });
        this.dataSource.start();
    }
    stop() {
        this.dataSource.stop();
    }
}
exports.IngestionEngine = IngestionEngine;
exports.ingestionEngine = new IngestionEngine();
