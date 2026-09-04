"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconciliationLogs = void 0;
exports.getSourcePriority = getSourcePriority;
exports.reconcileTicks = reconcileTicks;
exports.calculateFreshness = calculateFreshness;
const SOURCE_PRIORITIES = {
    DIRECT_NSE_WEBSOCKET: 100,
    SIMULATED_NSE: 80,
    SECONDARY_FEED: 50,
    BACKUP_REST_FEED: 30,
};
exports.reconciliationLogs = [];
function getSourcePriority(source) {
    return SOURCE_PRIORITIES[source] || 50;
}
function reconcileTicks(existingTick, incomingTick) {
    if (!existingTick) {
        return { accepted: true, winningTick: incomingTick };
    }
    const existingTs = new Date(existingTick.exchangeTs).getTime();
    const incomingTs = new Date(incomingTick.exchangeTs).getTime();
    // Rule 1: Newer timestamp always wins
    if (incomingTs > existingTs) {
        return { accepted: true, winningTick: incomingTick };
    }
    // Rule 2: Out of order timestamp (incoming is older than latest known tick)
    if (incomingTs < existingTs) {
        const log = {
            symbol: incomingTick.symbol,
            timestamp: new Date(),
            reason: 'OUT_OF_ORDER',
            winningTick: existingTick,
            discardedTick: incomingTick,
        };
        exports.reconciliationLogs.push(log);
        return { accepted: false, winningTick: existingTick, log };
    }
    // Rule 3: Equal timestamps -> resolve by source priority
    const existingPriority = getSourcePriority(existingTick.source);
    const incomingPriority = getSourcePriority(incomingTick.source);
    if (incomingPriority > existingPriority) {
        const log = {
            symbol: incomingTick.symbol,
            timestamp: new Date(),
            reason: 'LOWER_PRIORITY_CONFLICT',
            winningTick: incomingTick,
            discardedTick: existingTick,
        };
        exports.reconciliationLogs.push(log);
        return { accepted: true, winningTick: incomingTick, log };
    }
    else {
        const log = {
            symbol: incomingTick.symbol,
            timestamp: new Date(),
            reason: 'LOWER_PRIORITY_CONFLICT',
            winningTick: existingTick,
            discardedTick: incomingTick,
        };
        exports.reconciliationLogs.push(log);
        return { accepted: false, winningTick: existingTick, log };
    }
}
function calculateFreshness(exchangeTs, now = new Date(), isMarketOpen = true) {
    if (!isMarketOpen) {
        return {
            freshness: 'stale',
            label: 'Market Closed',
            ageSeconds: 0,
            marketClosed: true,
        };
    }
    const tickTime = new Date(exchangeTs).getTime();
    const nowTime = now.getTime();
    const ageMs = Math.max(0, nowTime - tickTime);
    const ageSeconds = Number((ageMs / 1000).toFixed(1));
    if (ageSeconds < 5.0) {
        return {
            freshness: 'live',
            label: '<5s Live',
            ageSeconds,
        };
    }
    if (ageSeconds <= 30.0) {
        return {
            freshness: 'delayed',
            label: `${Math.round(ageSeconds)}s Delayed`,
            ageSeconds,
        };
    }
    return {
        freshness: 'stale',
        label: `Stale (${Math.round(ageSeconds)}s ago)`,
        ageSeconds,
    };
}
