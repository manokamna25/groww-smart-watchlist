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

export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
}

export function calculateStdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0.5; // Reasonable default min variance
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.max(0.25, Math.sqrt(variance)); // Avoid artificially inflated z-scores on flat series
}

export function scoreTick(
  currentTick: TickInput,
  stockHistory: TickInput[], // last ~15-20 ticks
  currentIndexTick?: TickInput,
  indexHistory?: TickInput[]
): ScoredResult {
  const prices = stockHistory.map((t) => t.price);
  const volumes = stockHistory.map((t) => t.volume);

  const prevPrice = stockHistory.length > 0 ? stockHistory[stockHistory.length - 1].price : currentTick.price;
  const rawPricePctChange = prevPrice > 0 ? ((currentTick.price - prevPrice) / prevPrice) * 100 : 0;
  const pricePctChange = Number(rawPricePctChange.toFixed(2));

  // Index pct change
  let indexPctChange = 0;
  if (currentIndexTick && indexHistory && indexHistory.length > 0) {
    const prevIndexPrice = indexHistory[indexHistory.length - 1].price;
    const rawIndexPctChange = prevIndexPrice > 0 ? ((currentIndexTick.price - prevIndexPrice) / prevIndexPrice) * 100 : 0;
    indexPctChange = Number(rawIndexPctChange.toFixed(2));
  }

  // Signal 1: Z-score vs stock's rolling volatility
  const meanPrice = calculateMean(prices.length > 0 ? prices : [currentTick.price]);
  const stdPrice = calculateStdDev(prices.length > 0 ? prices : [currentTick.price], meanPrice);
  const zScore = Number(((currentTick.price - meanPrice) / stdPrice).toFixed(2));

  // Signal 2: Market-relative move
  const relativeMove = Number((pricePctChange - indexPctChange).toFixed(2));

  // Signal 3: Volume ratio anomaly
  const meanVolume = calculateMean(volumes.length > 0 ? volumes : [currentTick.volume]);
  const volumeRatio = meanVolume > 0 ? Number((currentTick.volume / meanVolume).toFixed(2)) : 1.0;

  // Signal 4 & 5: Breakout & Gap flags
  let breakout = false;
  let gap = false;

  if (prices.length >= 4) {
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    if (currentTick.price > maxPrice || currentTick.price < minPrice) {
      breakout = true;
    }
  }

  if (Math.abs(pricePctChange) >= 3.0) {
    gap = true;
  }

  // Calculate composite score
  const w1 = 1.0; // z-score
  const w2 = 1.2; // relative move
  const w3 = 0.8; // volume ratio multiplier
  const w4 = 0.8; // breakout
  const w5 = 1.0; // gap

  const absZ = Math.abs(zScore);
  const absRel = Math.abs(relativeMove);
  const volBonus = volumeRatio > 2.0 ? (volumeRatio - 1.0) * w3 : 0;
  const breakoutBonus = breakout ? w4 : 0;
  const gapBonus = gap ? w5 : 0;

  const rawScore = w1 * absZ + w2 * absRel + volBonus + breakoutBonus + gapBonus;
  const score = Number(rawScore.toFixed(2));

  // Assign tier thresholds
  let tier: ChangeTier = 'quiet';
  if (score >= 5.0) {
    tier = 'critical';
  } else if (score >= 3.2) {
    tier = 'meaningful';
  } else if (score >= 1.8) {
    tier = 'notable';
  }

  const signals: ChangeSignals = {
    z: zScore,
    relative_to_index: relativeMove,
    volume_ratio: volumeRatio,
    breakout,
    gap,
  };

  // Calculate confidence
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  if (tier !== 'quiet') {
    let prevZ = 0;
    if (prices.length >= 2) {
      const prevPrices = prices.slice(0, -1);
      const prevMean = calculateMean(prevPrices);
      const prevStd = calculateStdDev(prevPrices, prevMean);
      prevZ = (prices[prices.length - 1] - prevMean) / prevStd;
    }
    
    const isConfirmed = Math.abs(prevZ) > 1.5;
    const isStrongSignal = score >= 2.5;
    const isBoundary = score < 2.2;

    if (isConfirmed && isStrongSignal) {
      confidence = 'high';
    } else if (!isConfirmed && isBoundary) {
      confidence = 'low';
    }
  }

  return {
    tier,
    score,
    signals,
    pricePctChange,
    indexPctChange,
    confidence,
  };
}
