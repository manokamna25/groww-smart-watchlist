import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '../../src/config/database';
import { simulatedMarketSource } from '../../src/market/simulatedSource';
import { ingestionEngine } from '../../src/market/ingestion';
import { env } from '../../src/config/env';

describe('Phase 2 Integration Tests: Market Simulator & Ingestion Engine', () => {
  beforeAll(async () => {
    await prisma.priceTick.deleteMany();
    await prisma.instrument.deleteMany();
    await ingestionEngine.seedInstruments();
  });

  afterAll(async () => {
    await prisma.priceTick.deleteMany();
    await prisma.instrument.deleteMany();
    await prisma.$disconnect();
  });

  it('should seed ~30 instruments into the database', async () => {
    const count = await prisma.instrument.count();
    expect(count).toBeGreaterThanOrEqual(30);

    const nifty = await prisma.instrument.findUnique({ where: { symbol: 'NIFTY_INDEX' } });
    expect(nifty).not.toBeNull();
    expect(nifty?.sector).toBe('INDEX');
  });

  it('should generate simulated ticks for all symbols including index', () => {
    const ticks = simulatedMarketSource.stepAll();
    expect(ticks.length).toBeGreaterThanOrEqual(30);

    const relianceTick = ticks.find((t) => t.symbol === 'RELIANCE');
    expect(relianceTick).toBeDefined();
    expect(relianceTick!.price).toBeGreaterThan(0);
    expect(relianceTick!.volume).toBeGreaterThan(0);
  });

  it('should ingest ticks into price_ticks table', async () => {
    const tick = simulatedMarketSource.generateTickForSymbol('RELIANCE');
    const saved = await ingestionEngine.processTick(tick);

    expect(saved.id).toBeDefined();
    expect(saved.symbol).toBe('RELIANCE');
    expect(saved.price).toBe(tick.price);

    const dbCount = await prisma.priceTick.count({ where: { symbol: 'RELIANCE' } });
    expect(dbCount).toBeGreaterThanOrEqual(1);
  });

  it('should allow demo event injection via POST /api/dev/inject-event', async () => {
    const res = await request(app)
      .post('/api/dev/inject-event')
      .send({ symbol: 'SUZLON', type: 'spike' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Next generated tick for SUZLON should reflect the spike anomaly
    const nextTick = simulatedMarketSource.generateTickForSymbol('SUZLON');
    expect(nextTick.symbol).toBe('SUZLON');
    // base volume is 50000, spike volume is 3.5x = ~175000
    expect(nextTick.volume).toBeGreaterThan(150000);
  });

  it('should reject event injection when DEV_MODE is disabled', async () => {
    // Temporarily override DEV_MODE
    const originalDevMode = env.DEV_MODE;
    env.DEV_MODE = false;

    const res = await request(app)
      .post('/api/dev/inject-event')
      .send({ symbol: 'RELIANCE', type: 'spike' });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');

    // Restore original DEV_MODE
    env.DEV_MODE = originalDevMode;
  });
});
