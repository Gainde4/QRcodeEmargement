import dotenv from 'dotenv';
import { Pool } from 'pg';
import Redis from 'ioredis';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key_universite_2024',
  qrIntervalSec: parseInt(process.env.QR_INTERVAL_SEC || '8', 10),
  qrToleranceSec: parseInt(process.env.QR_TOLERANCE_SEC || '5', 10),
  postgres: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/emargement_db',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
};

// PostgreSQL connection pool
export const db = new Pool({
  connectionString: config.postgres.connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
});

// Redis Client
export const redis = new Redis(config.redis.url, {
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => {
  console.log('✅ Connecté au serveur Redis');
});

redis.on('error', (err) => {
  console.warn('⚠️ Avertissement Redis (mode dégradé mémoire si inaccessible):', err.message);
});
