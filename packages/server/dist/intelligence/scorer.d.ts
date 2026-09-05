import { ChangeSignals, ChangeTier } from '@smart-watchlist/shared';
export interface ScoredResult {
    tier: ChangeTier;
    score: number;
    signals: ChangeSignals;
    pricePctChange: number;
    indexPctChange: number;
    confidence: 'high' | 'medium' | 'low';
}
export interface TickInput {
    price: number;
    volume: number;
    exchangeTs?: Date;
}
export declare function calculateMean(values: number[]): number;
export declare function calculateStdDev(values: number[], mean: number): number;
export declare function scoreTick(currentTick: TickInput, stockHistory: TickInput[], // last ~15-20 ticks
currentIndexTick?: TickInput, indexHistory?: TickInput[]): ScoredResult;
