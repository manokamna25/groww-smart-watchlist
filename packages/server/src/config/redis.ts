import Redis from 'ioredis';
import { env } from './env';

export const redisPub = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

export const redisSub = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

export async function initRedis() {
  if (redisPub.status === 'ready' || redisPub.status === 'connecting') return;
  try {
    await redisPub.connect();
    await redisSub.connect();
    console.log('⚡ Connected to Redis successfully');
  } catch (err) {
    console.warn('⚠️ Could not connect to Redis server. Falling back to local memory pub/sub for tests/dev.', err);
  }
}
