import { describe, it, expect } from 'vitest';
import { scoreTick, calculateMean, calculateStdDev } from '../../src/intelligence/scorer';
import { generateNarrative } from '../../src/intelligence/narrator';

describe('Phase 3 Unit Tests: Change Intelligence Scorer & Narrator', () => {
  it('should calculate mean and std dev accurately', () => {
    const values = [10, 12, 14, 16, 18];
    const mean = calculateMean(values);
    expect(mean).toBe(14);

    const std = calculateStdDev(values, mean);
    expect(std).toBeCloseTo(3.162, 2);
  });

  it('should output "quiet" tier for normal low-volatility price steps', () => {
    const history = [
      { price: 100.0, volume: 1000 },
      { price: 100.1, volume: 1050 },
      { price: 100.05, volume: 980 },
      { price: 100.15, volume: 1020 },
    ];

    const current = { price: 100.2, volume: 1010 };
    const result = scoreTick(current, history);

    expect(result.tier).toBe('quiet');
    expect(result.score).toBeLessThan(1.8);
    expect(result.signals.volume_ratio).toBeCloseTo(1.0, 1);
  });

  it('should output "notable" or "meaningful" tier when stock spikes with volume', () => {
    const history = [
      { price: 100.0, volume: 1000 },
      { price: 100.0, volume: 1000 },
      { price: 100.0, volume: 1000 },
      { price: 100.0, volume: 1000 },
    ];

    // Price moves +4.0% with 3.5x volume anomaly
    const current = { price: 104.0, volume: 3500 };
    const result = scoreTick(current, history);

    expect(['notable', 'meaningful', 'critical']).toContain(result.tier);
    expect(result.score).toBeGreaterThanOrEqual(1.8);
    expect(result.signals.volume_ratio).toBeGreaterThan(3.0);
    expect(result.signals.gap).toBe(true);
  });

  it('should boost score when stock moves against market direction (market-relative signal)', () => {
    const stockHistory = [
      { price: 100.0, volume: 1000 },
      { price: 100.0, volume: 1000 },
    ];
    const stockCurrent = { price: 102.5, volume: 1000 }; // +2.5%

    // Scenario A: Market moved +2.5% along with stock (relative move = 0%)
    const indexHistoryFlat = [{ price: 20000, volume: 10000 }];
    const indexCurrentSame = { price: 20500, volume: 10000 }; // +2.5%
    const scoreA = scoreTick(stockCurrent, stockHistory, indexCurrentSame, indexHistoryFlat);

    // Scenario B: Market moved -2.0% while stock moved +2.5% (relative move = +4.5%)
    const indexCurrentOpposite = { price: 19600, volume: 10000 }; // -2.0%
    const scoreB = scoreTick(stockCurrent, stockHistory, indexCurrentOpposite, indexHistoryFlat);

    expect(scoreB.score).toBeGreaterThan(scoreA.score);
    expect(scoreB.signals.relative_to_index).toBeGreaterThan(scoreA.signals.relative_to_index);
  });

  it('should generate clear, deterministic template narrative text', () => {
    const text = generateNarrative('RELIANCE', -2.1, 0.0, {
      z: -2.3,
      relative_to_index: -2.1,
      volume_ratio: 2.8,
      breakout: false,
      gap: false,
    });

    expect(text).toContain('RELIANCE fell 2.1% on 2.8x volume');
    expect(text).toContain('while the market was flat');
    expect(text).toContain('unusual weakness');
  });
});
