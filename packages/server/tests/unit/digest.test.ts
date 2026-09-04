import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '../../src/config/database';
import { calculateWatchlistDigest, getEventBreakdown, acknowledgeEvent } from '../../src/intelligence/digest';

describe('Phase 4 Unit & Integration Tests: Digest Engine & Event Acknowledgment', () => {
  let userId: string;
  let eventId1: string;
  let eventId2: string;
  let token: string;

  beforeAll(async () => {
    await prisma.changeAcknowledgment.deleteMany();
    await prisma.userSymbolState.deleteMany();
    await prisma.changeEvent.deleteMany();
    await prisma.watchlistItem.deleteMany();
    await prisma.watchlist.deleteMany();
    await prisma.user.deleteMany();

    // Create test user via auth API
    const authRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'digest_trader@groww.in', password: 'password123' });

    userId = authRes.body.user.id;
    token = authRes.body.token;

    // Create 2 test change events for RELIANCE
    const now = new Date();
    const event1 = await prisma.changeEvent.create({
      data: {
        symbol: 'RELIANCE',
        ts: new Date(now.getTime() - 10000), // 10s ago
        tier: 'meaningful',
        score: 3.5,
        narrative: 'RELIANCE gained 2.5% on 2.5x volume, while the market was flat.',
        signals: { z: 2.1, relative_to_index: 2.5, volume_ratio: 2.5, breakout: true, gap: false },
      },
    });
    eventId1 = event1.id;

    const event2 = await prisma.changeEvent.create({
      data: {
        symbol: 'RELIANCE',
        ts: new Date(now.getTime() - 2000), // 2s ago
        tier: 'critical',
        score: 5.2,
        narrative: 'RELIANCE spiked 5.5% on 4.0x volume.',
        signals: { z: 4.2, relative_to_index: 5.5, volume_ratio: 4.0, breakout: true, gap: true },
      },
    });
    eventId2 = event2.id;
  });

  afterAll(async () => {
    await prisma.changeAcknowledgment.deleteMany();
    await prisma.userSymbolState.deleteMany();
    await prisma.changeEvent.deleteMany();
    await prisma.watchlistItem.deleteMany();
    await prisma.watchlist.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it('should return all unseen change events when lastViewedAt is epoch start', async () => {
    const digest = await calculateWatchlistDigest(userId, ['RELIANCE']);
    expect(digest.length).toBe(1);
    expect(digest[0].symbol).toBe('RELIANCE');
    expect(digest[0].unseenEventsCount).toBe(2);
    expect(digest[0].events.length).toBe(2);
  });

  it('should return event breakdown with raw signals via getEventBreakdown', async () => {
    const breakdown = await getEventBreakdown(eventId1);
    expect(breakdown.id).toBe(eventId1);
    expect(breakdown.symbol).toBe('RELIANCE');
    expect(breakdown.tier).toBe('meaningful');
    expect(breakdown.signals).toHaveProperty('z');
    expect(breakdown.signals).toHaveProperty('relative_to_index');
  });

  it('should acknowledge an individual event and update unseen count', async () => {
    const ackRes = await acknowledgeEvent(userId, eventId1);
    expect(ackRes.success).toBe(true);
    expect(ackRes.status).toBe('acknowledged');

    const digest = await calculateWatchlistDigest(userId, ['RELIANCE']);
    expect(digest[0].unseenEventsCount).toBe(1);
    expect(digest[0].events.find((e) => e.id === eventId1)?.acknowledged).toBe(true);
  });

  it('should fetch breakdown via GET /api/intelligence/events/:id/breakdown endpoint', async () => {
    const res = await request(app)
      .get(`/api/intelligence/events/${eventId1}/breakdown`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(eventId1);
    expect(res.body.score).toBe(3.5);
  });

  it('should mark event acknowledged via POST /api/intelligence/events/:id/ack endpoint', async () => {
    const res = await request(app)
      .post(`/api/intelligence/events/${eventId2}/ack`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('acknowledged');
  });
});
