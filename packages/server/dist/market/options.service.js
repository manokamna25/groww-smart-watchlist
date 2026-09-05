"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionsService = exports.OptionsService = void 0;
const blackScholes_1 = require("./blackScholes");
class OptionsService {
    RISK_FREE_RATE = 0.07; // 7% standard Indian risk-free rate
    DAYS_TO_EXPIRY = 30; // 1-month expiry
    /**
     * Generates a full options chain for a given underlying price.
     * It creates strikes slightly above and below the current price.
     */
    generateChain(symbol, currentPrice, volatility) {
        // Determine step size based on price (e.g. NIFTY is 50, HDFCBANK is 10 or 20)
        let step = 10;
        if (currentPrice > 10000)
            step = 100;
        else if (currentPrice > 2000)
            step = 50;
        else if (currentPrice > 500)
            step = 20;
        else if (currentPrice < 100)
            step = 1;
        // Nearest ATM strike
        const atmStrike = Math.round(currentPrice / step) * step;
        // Generate 4 ITM, 1 ATM, 4 OTM strikes
        const strikes = [];
        for (let i = -4; i <= 4; i++) {
            strikes.push(atmStrike + (i * step));
        }
        const calls = [];
        const puts = [];
        const T = this.DAYS_TO_EXPIRY / 365.0; // Time in years
        const r = this.RISK_FREE_RATE;
        // Scale up the daily volatility to annualized for Black-Scholes
        // Daily volatility in simulatedSource is low (e.g. 0.005), so annualized is roughly * sqrt(252)
        const annualizedVol = Math.max(0.15, volatility * Math.sqrt(252));
        for (const K of strikes) {
            if (K <= 0)
                continue;
            const prices = (0, blackScholes_1.calculateOptionPrices)(currentPrice, K, T, r, annualizedVol);
            calls.push({
                strike: K,
                type: 'CE',
                price: prices.callPrice,
                impliedVol: annualizedVol
            });
            puts.push({
                strike: K,
                type: 'PE',
                price: prices.putPrice,
                impliedVol: annualizedVol
            });
        }
        return {
            symbol,
            underlyingPrice: currentPrice,
            expiryDays: this.DAYS_TO_EXPIRY,
            calls,
            puts,
            timestamp: new Date().toISOString()
        };
    }
}
exports.OptionsService = OptionsService;
exports.optionsService = new OptionsService();
