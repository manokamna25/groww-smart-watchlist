"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateWatchlistDigest = calculateWatchlistDigest;
exports.getEventBreakdown = getEventBreakdown;
exports.acknowledgeEvent = acknowledgeEvent;
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
async function calculateWatchlistDigest(userId, symbols) {
    if (symbols.length === 0)
        return [];
    // Fetch last viewed states for user across these symbols
    const states = await database_1.prisma.userSymbolState.findMany({
        where: {
            userId,
            symbol: { in: symbols },
        },
    });
    const stateMap = new Map(states.map((s) => [s.symbol, s]));
    // Fetch event acknowledgments for this user
    const acks = await database_1.prisma.changeAcknowledgment.findMany({
        where: {
            userId,
        },
    });
    const ackSet = new Set(acks.map((a) => a.changeEventId));
    const digest = await Promise.all(symbols.map(async (symbol) => {
        const state = stateMap.get(symbol);
        const lastViewedAt = state ? state.lastViewedAt : new Date(0);
        // Fetch change events after lastViewedAt
        const events = await database_1.prisma.changeEvent.findMany({
            where: {
                symbol,
                ts: { gt: lastViewedAt },
            },
            orderBy: { ts: 'desc' },
            take: 20,
        });
        const formattedEvents = events.map((e) => ({
            id: e.id,
            symbol: e.symbol,
            ts: e.ts.toISOString(),
            tier: e.tier,
            score: e.score,
            narrative: e.narrative,
            signals: e.signals,
            createdAt: e.createdAt.toISOString(),
            acknowledged: ackSet.has(e.id),
        }));
        const unseenEventsCount = formattedEvents.filter((e) => !e.acknowledged).length;
        return {
            symbol,
            unseenEventsCount,
            events: formattedEvents,
            lastViewedAt: state ? state.lastViewedAt.toISOString() : undefined,
            lastViewedPrice: state ? state.lastViewedPrice : undefined,
        };
    }));
    return digest;
}
async function getEventBreakdown(eventId) {
    const event = await database_1.prisma.changeEvent.findUnique({
        where: { id: eventId },
    });
    if (!event) {
        throw new errorHandler_1.AppError('Change event not found', 404);
    }
    // Fetch latest stock details/price
    const latestTick = await database_1.prisma.priceTick.findFirst({
        where: { symbol: event.symbol },
        orderBy: { exchangeTs: 'desc' },
    });
    return {
        id: event.id,
        symbol: event.symbol,
        ts: event.ts.toISOString(),
        tier: event.tier,
        score: event.score,
        narrative: event.narrative,
        signals: event.signals,
        latestPrice: latestTick ? latestTick.price : null,
        createdAt: event.createdAt.toISOString(),
    };
}
async function acknowledgeEvent(userId, eventId) {
    const event = await database_1.prisma.changeEvent.findUnique({
        where: { id: eventId },
    });
    if (!event) {
        throw new errorHandler_1.AppError('Change event not found', 404);
    }
    const ack = await database_1.prisma.changeAcknowledgment.upsert({
        where: {
            userId_changeEventId: {
                userId,
                changeEventId: eventId,
            },
        },
        update: {
            status: 'acknowledged',
        },
        create: {
            userId,
            changeEventId: eventId,
            status: 'acknowledged',
        },
    });
    return {
        success: true,
        eventId: ack.changeEventId,
        status: ack.status,
        updatedAt: ack.updatedAt.toISOString(),
    };
}
