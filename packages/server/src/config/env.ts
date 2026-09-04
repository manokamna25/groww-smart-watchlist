import dotenv from 'dotenv';
import path from 'path';

// Load .env from workspace root if available
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const env = {
  PORT: process.env.PORT || '3001',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/smart_watchlist?schema=public',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-groww-hackathon-jwt-key-2026',
  DEV_MODE: process.env.DEV_MODE !== 'false',
};
