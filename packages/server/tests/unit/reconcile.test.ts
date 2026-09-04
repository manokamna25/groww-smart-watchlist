import { describe, it, expect } from 'vitest';
import { reconcileTicks, calculateFreshness, reconciliationLogs } from '../../src/resilience/reconcile';
import { Tick } from '../../src/market/adapter';

describe('Phase 6 Unit Tests: Resilience & Data Reconciliation', () => {
  it('should accept newer timestamp tick regardless of arrival order', () => {
    const baseTime = new Date('2026-09-04T10:00:00Z');
    const newerTime = new Date('2026-09-04T10:00:05Z');

    const existingTick: Tick = {
      symbol: 'RELIANCE',
      price: 2500,
      volume: 1000,
      exchangeTs: baseTime,
      source: 'SIMULATED_NSE',
    };

    const incomingTick: Tick = {
      symbol: 'RELIANCE',
      price: 2510,
      volume: 1200,
      exchangeTs: newerTime,
      source: 'SIMULATED_NSE',
    };

    const result = reconcileTicks(existingTick, incomingTick);
    expect(result.accepted).toBe(true);
    expect(result.winningTick.price).toBe(2510);
  });

  it('should reject out-of-order tick (older timestamp arriving later) and log event', () => {
    const baseTime = new Date('2026-09-04T10:00:05Z');
    const olderTime = new Date('2026-09-04T10:00:00Z');

    const existingTick: Tick = {
      symbol: 'TCS',
      price: 3800,
      volume: 500,
      exchangeTs: baseTime,
      source: 'SIMULATED_NSE',
    };

    const delayedIncomingTick: Tick = {
      symbol: 'TCS',
      price: 3790,
      volume: 400,
      exchangeTs: olderTime,
      source: 'SIMULATED_NSE',
    };

    const initialLogCount = reconciliationLogs.length;
    const result = reconcileTicks(existingTick, delayedIncomingTick);

    expect(result.accepted).toBe(false);
    expect(result.winningTick.price).toBe(3800);
    expect(reconciliationLogs.length).toBe(initialLogCount + 1);
    expect(result.log?.reason).toBe('OUT_OF_ORDER');
  });

  it('should resolve equal timestamp conflicts using feed source priority', () => {
    const sameTime = new Date('2026-09-04T10:00:00Z');

    const lowPriorityTick: Tick = {
      symbol: 'INFY',
      price: 1500,
      volume: 800,
      exchangeTs: sameTime,
      source: 'BACKUP_REST_FEED', // priority 30
    };

    const highPriorityTick: Tick = {
      symbol: 'INFY',
      price: 1505,
      volume: 850,
      exchangeTs: sameTime,
      source: 'DIRECT_NSE_WEBSOCKET', // priority 100
    };

    const result = reconcileTicks(lowPriorityTick, highPriorityTick);
    expect(result.accepted).toBe(true);
    expect(result.winningTick.price).toBe(1505);
    expect(result.winningTick.source).toBe('DIRECT_NSE_WEBSOCKET');
  });

  it('should calculate accurate data freshness status', () => {
    const now = new Date('2026-09-04T12:00:00Z');

    // 2s ago -> live
    const liveTickTime = new Date('2026-09-04T11:59:58Z');
    const liveInfo = calculateFreshness(liveTickTime, now, true);
    expect(liveInfo.freshness).toBe('live');
    expect(liveInfo.label).toContain('<5s Live');

    // 15s ago -> delayed
    const delayedTickTime = new Date('2026-09-04T11:59:45Z');
    const delayedInfo = calculateFreshness(delayedTickTime, now, true);
    expect(delayedInfo.freshness).toBe('delayed');
    expect(delayedInfo.label).toContain('15s Delayed');

    // 45s ago -> stale
    const staleTickTime = new Date('2026-09-04T11:59:15Z');
    const staleInfo = calculateFreshness(staleTickTime, now, true);
    expect(staleInfo.freshness).toBe('stale');
    expect(staleInfo.label).toContain('Stale');

    // Market closed -> stale with Market Closed label
    const marketClosedInfo = calculateFreshness(liveTickTime, now, false);
    expect(marketClosedInfo.freshness).toBe('stale');
    expect(marketClosedInfo.label).toBe('Market Closed');
  });
});
