import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '../../src/config/database';

describe('Phase 1 Integration Tests: Auth & Watchlist CRUD', () => {
  beforeAll(async () => {
    // Clean up test database before running tests
    await prisma.changeAcknowledgment.deleteMany();
    await prisma.userSymbolState.deleteMany();
    await prisma.watchlistItem.deleteMany();
    await prisma.watchlist.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    // Clean up test database after running tests
    await prisma.changeAcknowledgment.deleteMany();
    await prisma.userSymbolState.deleteMany();
    await prisma.watchlistItem.deleteMany();
    await prisma.watchlist.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  let token: string;
  let userId: string;
  let watchlistId: string;

  describe('Authentication API', () => {
    it('should register a new user successfully and auto-create default watchlist', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'trader@groww.in',
          password: 'password123',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe('trader@groww.in');

      token = res.body.token;
      userId = res.body.user.id;
    });

    it('should reject registration with an existing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'trader@groww.in',
          password: 'password123',
        });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error');
    });

    it('should login an existing user with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'trader@groww.in',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.id).toBe(userId);
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'trader@groww.in',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Watchlist CRUD API', () => {
    it('should reject unauthenticated access to watchlists', async () => {
      const res = await request(app).get('/api/watchlists');
      expect(res.status).toBe(401);
    });

    it('should get default watchlists for authenticated user', async () => {
      const res = await request(app)
        .get('/api/watchlists')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].name).toBe('Main Watchlist');

      watchlistId = res.body[0].id;
    });

    it('should create a new custom watchlist', async () => {
      const res = await request(app)
        .post('/api/watchlists')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Tech Stocks' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Tech Stocks');
    });

    it('should add a symbol to watchlist', async () => {
      const res = await request(app)
        .post(`/api/watchlists/${watchlistId}/items`)
        .set('Authorization', `Bearer ${token}`)
        .send({ symbol: 'RELIANCE' });

      expect(res.status).toBe(201);
      expect(res.body.symbol).toBe('RELIANCE');
      expect(res.body.watchlistId).toBe(watchlistId);
    });

    it('should reject adding a duplicate symbol to the same watchlist', async () => {
      const res = await request(app)
        .post(`/api/watchlists/${watchlistId}/items`)
        .set('Authorization', `Bearer ${token}`)
        .send({ symbol: 'RELIANCE' });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error');
    });

    it('should add a second symbol to watchlist', async () => {
      const res = await request(app)
        .post(`/api/watchlists/${watchlistId}/items`)
        .set('Authorization', `Bearer ${token}`)
        .send({ symbol: 'TCS' });

      expect(res.status).toBe(201);
      expect(res.body.symbol).toBe('TCS');
    });

    it('should fetch watchlist summary and digest', async () => {
      const res = await request(app)
        .get(`/api/watchlists/${watchlistId}/summary`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('watchlist');
      expect(res.body.watchlist.items.length).toBe(2);
      expect(res.body).toHaveProperty('digest');
      expect(Array.isArray(res.body.digest)).toBe(true);
    });

    it('should acknowledge symbol view state', async () => {
      const res = await request(app)
        .post(`/api/watchlists/${watchlistId}/items/RELIANCE/ack`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.symbol).toBe('RELIANCE');
      expect(res.body).toHaveProperty('lastViewedAt');
    });

    it('should remove a symbol from watchlist', async () => {
      const res = await request(app)
        .delete(`/api/watchlists/${watchlistId}/items/RELIANCE`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify removal from summary
      const summaryRes = await request(app)
        .get(`/api/watchlists/${watchlistId}/summary`)
        .set('Authorization', `Bearer ${token}`);

      expect(summaryRes.body.watchlist.items.length).toBe(1);
      expect(summaryRes.body.watchlist.items[0].symbol).toBe('TCS');
    });
  });
});
