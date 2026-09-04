"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketGateway = exports.SocketGateway = void 0;
const socket_io_1 = require("socket.io");
const redis_1 = require("../config/redis");
class SocketGateway {
    io = null;
    refCountMap = new Map();
    socketSubscriptions = new Map(); // socket.id -> Set<symbol>
    init(httpServer) {
        this.io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
            },
        });
        this.setupRedisSubscriber();
        this.io.on('connection', (socket) => {
            this.socketSubscriptions.set(socket.id, new Set());
            socket.on('subscribe', (data) => {
                const symbol = typeof data === 'string' ? data.trim().toUpperCase() : data.symbol.trim().toUpperCase();
                this.subscribeClient(socket, symbol);
            });
            socket.on('unsubscribe', (data) => {
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
    setupRedisSubscriber() {
        redis_1.redisSub.on('message', (channel, message) => {
            if (!this.io)
                return;
            try {
                const data = JSON.parse(message);
                if (channel.startsWith('tick:')) {
                    const symbol = channel.replace('tick:', '');
                    this.io.to(`symbol:${symbol}`).emit('tick', data);
                }
                else if (channel.startsWith('event:')) {
                    const symbol = channel.replace('event:', '');
                    this.io.to(`symbol:${symbol}`).emit('change_event', data);
                }
            }
            catch (err) {
                console.error('Error handling Redis pub/sub message:', err);
            }
        });
    }
    subscribeClient(socket, symbol) {
        const room = `symbol:${symbol}`;
        socket.join(room);
        const subs = this.socketSubscriptions.get(socket.id) || new Set();
        if (!subs.has(symbol)) {
            subs.add(symbol);
            this.socketSubscriptions.set(socket.id, subs);
            this.incrementRefCount(symbol);
        }
    }
    unsubscribeClient(socket, symbol) {
        const room = `symbol:${symbol}`;
        socket.leave(room);
        const subs = this.socketSubscriptions.get(socket.id);
        if (subs && subs.has(symbol)) {
            subs.delete(symbol);
            this.decrementRefCount(symbol);
        }
    }
    incrementRefCount(symbol) {
        const current = this.refCountMap.get(symbol) || 0;
        this.refCountMap.set(symbol, current + 1);
        if (current === 0 && redis_1.redisSub.status === 'ready') {
            // First subscriber for this symbol -> open Redis channels
            redis_1.redisSub.subscribe(`tick:${symbol}`, `event:${symbol}`);
        }
    }
    decrementRefCount(symbol) {
        const current = this.refCountMap.get(symbol) || 0;
        if (current <= 1) {
            this.refCountMap.delete(symbol);
            if (redis_1.redisSub.status === 'ready') {
                // Last subscriber disconnected -> close Redis channels
                redis_1.redisSub.unsubscribe(`tick:${symbol}`, `event:${symbol}`);
            }
        }
        else {
            this.refCountMap.set(symbol, current - 1);
        }
    }
    getRefCount(symbol) {
        return this.refCountMap.get(symbol.toUpperCase()) || 0;
    }
    broadcastDirect(symbol, eventName, payload) {
        if (this.io) {
            this.io.to(`symbol:${symbol.toUpperCase()}`).emit(eventName, payload);
        }
    }
}
exports.SocketGateway = SocketGateway;
exports.socketGateway = new SocketGateway();
