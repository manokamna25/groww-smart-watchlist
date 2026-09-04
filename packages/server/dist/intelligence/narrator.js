"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNarrative = generateNarrative;
function generateNarrative(symbol, pricePctChange, indexPctChange, signals) {
    const stockDir = pricePctChange >= 0 ? 'gained' : 'fell';
    const absStockPct = Math.abs(pricePctChange).toFixed(1);
    const volStr = signals.volume_ratio > 1.2 ? ` on ${signals.volume_ratio}x volume` : '';
    let text = `${symbol} ${stockDir} ${absStockPct}%${volStr}`;
    // Market comparison clause
    if (Math.abs(indexPctChange) < 0.3 && Math.abs(pricePctChange) >= 1.5) {
        text += `, while the market was flat — unusual ${stockDir === 'gained' ? 'strength' : 'weakness'}.`;
    }
    else if ((pricePctChange > 0 && indexPctChange < 0) || (pricePctChange < 0 && indexPctChange > 0)) {
        const marketDir = indexPctChange >= 0 ? 'up' : 'down';
        text += `, diverging from Nifty (${marketDir} ${Math.abs(indexPctChange).toFixed(1)}%).`;
    }
    else {
        const marketDir = indexPctChange >= 0 ? 'up' : 'down';
        text += `, while Nifty was ${marketDir} ${Math.abs(indexPctChange).toFixed(1)}%.`;
    }
    // Breakout clause
    if (signals.breakout) {
        text += ` Stock broke out of its recent trading range.`;
    }
    return text;
}
