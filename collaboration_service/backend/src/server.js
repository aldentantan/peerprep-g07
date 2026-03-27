const { createRedisClient, connectRedis } = require('./redis/client');
const { createApiServer } = require('./api/createApiServer');
const { createMatchingServer } = require('./websocket/createMatchingServer');
const { createYjsServer } = require('./websocket/createYjsServer');

const HTTP_PORT = 3000;
const MATCHING_WS_PORT = 8080;
const YJS_WS_PORT = 8081;

async function startServer() {
    const redisClient = createRedisClient();
    await connectRedis(redisClient);

    createMatchingServer({
        port: MATCHING_WS_PORT,
        redisClient
    });

    createYjsServer({
        port: YJS_WS_PORT,
        redisClient
    });

    const app = createApiServer(redisClient);
    app.listen(HTTP_PORT, () => {
        console.log(`HTTP server running on http://localhost:${HTTP_PORT}`);
    });
}

startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

