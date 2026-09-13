const Redis = require('ioredis');

let redisClient = null;

const connectRedis = async () => {
  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('⚠️  Redis not available — caching disabled');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });

    await redisClient.connect();
    console.log('✅ Redis connected');

    redisClient.on('error', (err) => {
      console.warn('Redis error:', err.message);
    });
  } catch (error) {
    console.warn('⚠️  Redis not available — running without cache:', error.message);
    redisClient = null;
  }
};

const getRedis = () => redisClient;

// Generic cache helpers
const cacheGet = async (key) => {
  if (!redisClient) return null;
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch { return null; }
};

const cacheSet = async (key, value, ttlSeconds = 3600) => {
  if (!redisClient) return;
  try {
    await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
  } catch { /* silent */ }
};

const cacheDel = async (key) => {
  if (!redisClient) return;
  try { await redisClient.del(key); } catch { /* silent */ }
};

const cacheDelPattern = async (pattern) => {
  if (!redisClient) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length) await redisClient.del(...keys);
  } catch { /* silent */ }
};

module.exports = { connectRedis, getRedis, cacheGet, cacheSet, cacheDel, cacheDelPattern };
