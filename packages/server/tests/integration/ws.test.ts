import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, Server as HttpServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { AddressInfo } from 'net';
import { app } from '../../src/index';
import { socketGateway } from '../../src/ws/gateway';
import { ingestionEngine } from '../../src/market/ingestion';

describe('Phase 5 Integration Tests: Real-time Socket.io Gateway & RefCount Fan-Out', () => {
  let httpServer: HttpServer;
  let serverPort: number;
  let clientA: ClientSocket;
  let clientB: ClientSocket;

  beforeAll(async () => {
    httpServer = createServer(app);
    socketGateway.init(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address() as AddressInfo;
        serverPort = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (clientA) clientA.close();
    if (clientB) clientB.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it('should allow clients to connect to WebSocket gateway', async () => {
    clientA = Client(`http://localhost:${serverPort}`);
    await new Promise<void>((resolve) => {
      clientA.on('connect', () => resolve());
    });
    expect(clientA.connected).toBe(true);
  });

  it('should track reference count per symbol on client subscribe/unsubscribe', async () => {
    expect(socketGateway.getRefCount('RELIANCE')).toBe(0);

    clientA.emit('subscribe', { symbol: 'RELIANCE' });
    await new Promise((r) => setTimeout(r, 100));
    expect(socketGateway.getRefCount('RELIANCE')).toBe(1);

    // Second client subscribes to RELIANCE
    clientB = Client(`http://localhost:${serverPort}`);
    await new Promise<void>((resolve) => {
      clientB.on('connect', () => resolve());
    });

    clientB.emit('subscribe', { symbol: 'RELIANCE' });
    await new Promise((r) => setTimeout(r, 100));
    expect(socketGateway.getRefCount('RELIANCE')).toBe(2);

    // Unsubscribe client B
    clientB.emit('unsubscribe', { symbol: 'RELIANCE' });
    await new Promise((r) => setTimeout(r, 100));
    expect(socketGateway.getRefCount('RELIANCE')).toBe(1);
  });

  it('should deliver ticks ONLY to clients subscribed to that specific symbol (fan-out isolation)', async () => {
    // Client A is subscribed to RELIANCE
    // Client B subscribes to TCS
    clientB.emit('subscribe', { symbol: 'TCS' });
    await new Promise((r) => setTimeout(r, 100));

    let clientAReceivedRelianceTick = false;
    let clientBReceivedRelianceTick = false;

    clientA.on('tick', (data) => {
      if (data.symbol === 'RELIANCE') clientAReceivedRelianceTick = true;
    });

    clientB.on('tick', (data) => {
      if (data.symbol === 'RELIANCE') clientBReceivedRelianceTick = true;
    });

    // Ingest tick for RELIANCE
    await ingestionEngine.processTick({
      symbol: 'RELIANCE',
      price: 2550.0,
      volume: 12000,
      exchangeTs: new Date(),
      source: 'TEST',
    });

    await new Promise((r) => setTimeout(r, 200));

    expect(clientAReceivedRelianceTick).toBe(true);
    expect(clientBReceivedRelianceTick).toBe(false);
  });
});
