import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { redisPub, redisSub } from '../config/redis';

export class SocketGateway {
  private io: SocketIOServer | null = null;
  private refCountMap: Map<string, number> = new Map();
  private socketSubscriptions: Map<string, Set<string>> = new Map(); // socket.id -> Set<symbol>

  public init(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.setupRedisSubscriber();

    this.io.on('connection', (socket: Socket) => {
      this.socketSubscriptions.set(socket.id, new Set());

      socket.on('subscribe', (data: { symbol: string } | string) => {
        const symbol = typeof data === 'string' ? data.trim().toUpperCase() : data.symbol.trim().toUpperCase();
        this.subscribeClient(socket, symbol);
      });

      socket.on('unsubscribe', (data: { symbol: string } | string) => {
        const symbol = typeof data === 'string' ? data.trim().toUpperCase() : data.symbol.trim().toUpperCase();
        this.unsubscribeClient(socket, symbol);
      });

      socket.on('disconnect', () => {
        const symbols = this.socketSubscriptions.get(socket.id);
        if (symbols) {
          for (const symbol of symbols) {
            this.decrementRefCount(symbol);
          }
          this.socketSubscriptions.delete(socket.id);
        }
      });
    });

    return this.io;
  }

  private setupRedisSubscriber() {
    redisSub.on('message', (channel: string, message: string) => {
      if (!this.io) return;
      try {
        const data = JSON.parse(message);
        if (channel.startsWith('tick:')) {
          const symbol = channel.replace('tick:', '');
          this.io.to(`symbol:${symbol}`).emit('tick', data);
        } else if (channel.startsWith('options:tick:')) {
          const symbol = channel.replace('options:tick:', '');
          this.io.to(`symbol:${symbol}`).emit('options:tick', data);
        } else if (channel.startsWith('event:')) {
          const symbol = channel.replace('event:', '');
          this.io.to(`symbol:${symbol}`).emit('change_event', data);
        }
      } catch (err) {
        console.error('Error handling Redis pub/sub message:', err);
      }
    });
  }

  public subscribeClient(socket: Socket, symbol: string) {
    const room = `symbol:${symbol}`;
    socket.join(room);

    const subs = this.socketSubscriptions.get(socket.id) || new Set();
    if (!subs.has(symbol)) {
      subs.add(symbol);
      this.socketSubscriptions.set(socket.id, subs);
      this.incrementRefCount(symbol);
    }
  }

  public unsubscribeClient(socket: Socket, symbol: string) {
    const room = `symbol:${symbol}`;
    socket.leave(room);

    const subs = this.socketSubscriptions.get(socket.id);
    if (subs && subs.has(symbol)) {
      subs.delete(symbol);
      this.decrementRefCount(symbol);
    }
  }

  private incrementRefCount(symbol: string) {
    const current = this.refCountMap.get(symbol) || 0;
    this.refCountMap.set(symbol, current + 1);

    if (current === 0) {
      if (redisSub.status === 'ready') {
        redisSub.subscribe(`tick:${symbol}`);
        redisSub.subscribe(`options:tick:${symbol}`);
        redisSub.subscribe(`event:${symbol}`);
      }
    }
  }

  private decrementRefCount(symbol: string) {
    const current = this.refCountMap.get(symbol) || 0;
    if (current > 0) {
      const next = current - 1;
      if (next === 0) {
        this.refCountMap.delete(symbol);
        if (redisSub.status === 'ready') {
          redisSub.unsubscribe(`tick:${symbol}`);
          redisSub.unsubscribe(`options:tick:${symbol}`);
          redisSub.unsubscribe(`event:${symbol}`);
        }
      } else {
        this.refCountMap.set(symbol, next);
      }
    }
  }

  public getRefCount(symbol: string): number {
    return this.refCountMap.get(symbol.toUpperCase()) || 0;
  }

  public broadcastDirect(symbol: string, eventName: 'tick' | 'change_event' | 'options:tick', payload: any) {
    if (this.io) {
      this.io.to(`symbol:${symbol.toUpperCase()}`).emit(eventName, payload);
    }
  }
}

export const socketGateway = new SocketGateway();
