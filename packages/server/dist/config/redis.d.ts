import Redis from 'ioredis';
export declare const redisPub: Redis;
export declare const redisSub: Redis;
export declare function initRedis(): Promise<void>;
