const express = require('express');
const cors = require('cors');

function createApiServer(redisClient) {
    const app = express();
    app.use(cors());

    app.get('/room/:roomId', async (req, res) => {
        const { roomId } = req.params;

        try {
            const room = await redisClient.hGetAll(`room:${roomId}`);

            if (!room || !room.question || !room.programmingLanguage) {
                return res.status(404).json({ error: 'Room not found' });
            }

            return res.json({
                question: room.question,
                programmingLanguage: room.programmingLanguage
            });
        } catch (err) {
            console.error('Failed to fetch room from redis:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

    return app;
}

module.exports = {
    createApiServer
};
