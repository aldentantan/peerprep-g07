const express = require('express');
const cors = require('cors');

function createApiServer(redisClient) {
    const app = express();
    app.use(cors());

    app.get('/room/:roomId', async (req, res) => {
        const { roomId } = req.params;

        try {
            const room = await redisClient.hGetAll(`room:${roomId}`);
            const rawChatLog = await redisClient.lRange(`room:${roomId}:chat`, 0, -1);

            const chatLog = rawChatLog
                .map((entry) => {
                    try {
                        return JSON.parse(entry);
                    } catch (err) {
                        console.error('Invalid chat log entry in redis:', err);
                        return null;
                    }
                })
                .filter(Boolean);

            let participantUserIds = [];
            if (room.participantUserIds) {
                try {
                    const parsed = JSON.parse(room.participantUserIds);
                    if (Array.isArray(parsed)) {
                        participantUserIds = parsed.filter((item) => typeof item === 'string');
                    }
                } catch (err) {
                    console.error('Invalid participantUserIds in redis:', err);
                }
            }

            if (!room || !room.question || !room.programmingLanguage) {
                return res.status(404).json({ error: 'Room not found' });
            }

            return res.json({
                question: room.question,
                programmingLanguage: room.programmingLanguage,
                questionTopic: room.questionTopic,
                questionDifficulty: room.questionDifficulty,
                participantUserIds,
                chatLog
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
