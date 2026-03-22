const redis = require('redis');

function createRedisClient() {
    const client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    client.on('error', (err) => console.error('Redis Client Error', err));

    return client;
}

async function connectRedis(client) {
    await client.connect();
    console.log('Connected to Redis');
}

module.exports = {
    createRedisClient,
    connectRedis
};
