import { Tick } from '../market/adapter';
export type FreshnessStatus = 'live' | 'delayed' | 'stale';
export interface FreshnessInfo {
    freshness: FreshnessStatus;
    label: string;
    ageSeconds: number;
    marketClosed?: boolean;
}
export interface ReconciliationLogEntry {
    symbol: string;
    timestamp: Date;
    reason: 'OUT_OF_ORDER' | 'LOWER_PRIORITY_CONFLICT' | 'DUPLICATE_DISCARDED';
    winningTick: Tick;
    discardedTick: Tick;
}
export declare const reconciliationLogs: ReconciliationLogEntry[];
export declare function getSourcePriority(source: string): number;
export declare function reconcileTicks(existingTick: Tick | null, incomingTick: Tick): {
    accepted: boolean;
    winningTick: Tick;
    log?: ReconciliationLogEntry;
};
export declare function calculateFreshness(exchangeTs: Date | string, now?: Date, isMarketOpen?: boolean): FreshnessInfo;
