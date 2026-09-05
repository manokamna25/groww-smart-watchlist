/**
 * Simplified Black-Scholes-Merton Options Pricing Model
 * Calculates theoretical prices for European Call and Put options.
 */
export declare function calculateOptionPrices(S: number, // Current stock price
K: number, // Strike price
T: number, // Time to expiration in years (e.g., 30 days = 30/365)
r: number, // Risk-free interest rate (e.g., 5% = 0.05)
sigma: number): {
    callPrice: number;
    putPrice: number;
};
