import { MarketDataSource, Tick } from './adapter';
export declare class IngestionEngine {
    private dataSource;
    private history;
    private indexHistory;
    constructor(dataSource?: MarketDataSource);
    seedInstruments(): Promise<void>;
    processTick(tick: Tick): Promise<{
        symbol: string;
        id: string;
        price: number;
        volume: number;
        exchangeTs: Date;
        ingestedAt: Date;
        source: string;
    }>;
    start(): void;
    stop(): void;
}
export declare const ingestionEngine: IngestionEngine;
