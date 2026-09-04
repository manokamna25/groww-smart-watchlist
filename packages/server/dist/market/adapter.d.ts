export interface Tick {
    symbol: string;
    price: number;
    volume: number;
    exchangeTs: Date;
    source: string;
}
export interface MarketDataSource {
    start(): void;
    stop(): void;
    onTick(callback: (tick: Tick) => void | Promise<void>): void;
}
