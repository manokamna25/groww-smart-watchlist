import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
export declare class SocketGateway {
    private io;
    private refCountMap;
    private socketSubscriptions;
    init(httpServer: HttpServer): SocketIOServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
    private setupRedisSubscriber;
    subscribeClient(socket: Socket, symbol: string): void;
    unsubscribeClient(socket: Socket, symbol: string): void;
    private incrementRefCount;
    private decrementRefCount;
    getRefCount(symbol: string): number;
    broadcastDirect(symbol: string, eventName: 'tick' | 'change_event', payload: any): void;
}
export declare const socketGateway: SocketGateway;
