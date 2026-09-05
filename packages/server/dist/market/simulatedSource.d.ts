import { MarketDataSource, Tick } from './adapter';
export interface InstrumentProfile {
    symbol: string;
    name: string;
    exchange: string;
    sector: string;
    basePrice: number;
    currentPrice: number;
    baseVolume: number;
    volatility: number;
    indexCorrelation: number;
}
export declare class SimulatedMarketDataSource implements MarketDataSource {
    private listeners;
    private intervalId;
    private instruments;
    private indexPrice;
    private pendingInjections;
    constructor();
    private initInstruments;
    getInstruments(): InstrumentProfile[];
    injectEvent(symbol: string, type: 'spike' | 'spike_up' | 'spike_down' | 'gap' | 'volume_anomaly'): void;
    onTick(callback: (tick: Tick) => void | Promise<void>): void;
    generateTickForSymbol(symbol: string, indexPctChange?: number): Tick;
    stepAll(): Tick[];
    start(intervalMs?: number): void;
    stop(): void;
}
export declare const simulatedMarketSource: SimulatedMarketDataSource;
