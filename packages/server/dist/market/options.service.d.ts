export interface OptionContract {
    strike: number;
    type: 'CE' | 'PE';
    price: number;
    impliedVol: number;
    delta?: number;
}
export interface OptionsChainTick {
    symbol: string;
    underlyingPrice: number;
    expiryDays: number;
    calls: OptionContract[];
    puts: OptionContract[];
    timestamp: string;
}
export declare class OptionsService {
    private readonly RISK_FREE_RATE;
    private readonly DAYS_TO_EXPIRY;
    /**
     * Generates a full options chain for a given underlying price.
     * It creates strikes slightly above and below the current price.
     */
    generateChain(symbol: string, currentPrice: number, volatility: number): OptionsChainTick;
}
export declare const optionsService: OptionsService;
