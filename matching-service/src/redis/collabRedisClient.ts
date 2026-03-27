import Redis from 'ioredis';

const collabRedis = new Redis(
    process.env.COLLAB_REDIS_URL || 'redis://localhost:6379'
);

export { collabRedis };
