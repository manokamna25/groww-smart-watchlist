"use strict";
/**
 * Simplified Black-Scholes-Merton Options Pricing Model
 * Calculates theoretical prices for European Call and Put options.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateOptionPrices = calculateOptionPrices;
function normalCDF(x) {
    let t = 1 / (1 + 0.2316419 * Math.abs(x));
    let d = 0.3989423 * Math.exp(-x * x / 2);
    let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    if (x > 0)
        p = 1 - p;
    return p;
}
function calculateOptionPrices(S, // Current stock price
K, // Strike price
T, // Time to expiration in years (e.g., 30 days = 30/365)
r, // Risk-free interest rate (e.g., 5% = 0.05)
sigma // Volatility of the underlying stock (e.g., 20% = 0.2)
) {
    if (T <= 0) {
        return {
            callPrice: Math.max(0, S - K),
            putPrice: Math.max(0, K - S)
        };
    }
    const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    const callPrice = S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
    const putPrice = K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
    return {
        callPrice: Number(callPrice.toFixed(2)),
        putPrice: Number(putPrice.toFixed(2))
    };
}
