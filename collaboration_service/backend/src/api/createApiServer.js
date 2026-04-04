const express = require('express');
const cors = require('cors');

const QUESTION_SERVICE_URL = process.env.QUESTION_SERVICE_URL || 'http://question-service:3001';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const toTitleCase = (value) => {
    if (!value || typeof value !== 'string') {
        return '';
    }
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

async function fetchRandomQuestion(questionTopic, questionDifficulty) {
    const normalizedDifficulty = toTitleCase(questionDifficulty);
    const topicCandidates = [questionTopic, toTitleCase(questionTopic)]
        .map((item) => (item || '').trim())
        .filter((item, index, arr) => item && arr.indexOf(item) === index);

    for (const topicCandidate of topicCandidates) {
        const response = await fetch(
            `${QUESTION_SERVICE_URL}/questions/random?topic=${encodeURIComponent(topicCandidate)}&difficulty=${encodeURIComponent(normalizedDifficulty)}`
        );

        if (response.ok) {
            const payload = await response.json();
            return payload?.question || null;
        }

        if (response.status !== 404) {
            const text = await response.text();
            throw new Error(`Question service error (${response.status}): ${text}`);
        }
    }

    return null;
}

async function initializeRoomQuestion(redisClient, roomId, room) {
    const lockKey = `room:${roomId}:question-init-lock`;
    const lockAcquired = await redisClient.set(lockKey, '1', { NX: true, EX: 10 });

    if (lockAcquired) {
        try {
            const pickedQuestion = await fetchRandomQuestion(room.questionTopic, room.questionDifficulty);

            const fallbackTitle = `Untitled ${room.questionDifficulty || ''} ${room.questionTopic || ''} question`.trim();
            const fallbackDescription = `Solve a ${room.questionDifficulty || ''} ${room.questionTopic || ''} problem.`.trim();

            const questionTitle = pickedQuestion?.title || fallbackTitle;
            const questionDescription = pickedQuestion?.description || fallbackDescription;
            const questionId = pickedQuestion?.questionId ? String(pickedQuestion.questionId) : '';
            const questionTopics = Array.isArray(pickedQuestion?.topics) && pickedQuestion.topics.length > 0
                ? pickedQuestion.topics
                : [room.questionTopic].filter(Boolean);
            const questionUpdatedAt = pickedQuestion?.updatedAt || '';
            const question = `${questionTitle}\n\n${questionDescription}`;

            await redisClient.hSet(`room:${roomId}`, {
                questionId,
                questionTitle,
                questionDescription,
                questionTopics: JSON.stringify(questionTopics),
                questionUpdatedAt,
                question,
            });
        } catch (err) {
            console.error('Failed to initialize room question:', err);

            const fallbackTitle = `Untitled ${room.questionDifficulty || ''} ${room.questionTopic || ''} question`.trim();
            const fallbackDescription = `Solve a ${room.questionDifficulty || ''} ${room.questionTopic || ''} problem.`.trim();
            await redisClient.hSet(`room:${roomId}`, {
                questionId: '',
                questionTitle: fallbackTitle,
                questionDescription: fallbackDescription,
                questionTopics: JSON.stringify([room.questionTopic].filter(Boolean)),
                questionUpdatedAt: '',
                question: `${fallbackTitle}\n\n${fallbackDescription}`,
            });
        } finally {
            await redisClient.del(lockKey);
        }
    } else {
        // Another request is initializing the question; wait briefly and read back.
        for (let i = 0; i < 10; i += 1) {
            await sleep(100);
            const current = await redisClient.hGetAll(`room:${roomId}`);
            if (current.questionTitle || current.questionDescription || current.question) {
                return current;
            }
        }
    }

    return redisClient.hGetAll(`room:${roomId}`);
}

function createApiServer(redisClient) {
    const app = express();
    app.use(cors());

    app.get('/room/:roomId', async (req, res) => {
        const { roomId } = req.params;

        try {
            let room = await redisClient.hGetAll(`room:${roomId}`);
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

            let questionTopics = [];
            if (room.questionTopics) {
                try {
                    const parsed = JSON.parse(room.questionTopics);
                    if (Array.isArray(parsed)) {
                        questionTopics = parsed.filter((item) => typeof item === 'string' && item.trim() !== '');
                    }
                } catch (err) {
                    console.error('Invalid questionTopics in redis:', err);
                }
            }

            if (!room || Object.keys(room).length === 0 || !room.programmingLanguage || !room.questionTopic || !room.questionDifficulty) {
                return res.status(404).json({ error: 'Room not found' });
            }

            if (!room.questionTitle && !room.questionDescription && !room.question) {
                room = await initializeRoomQuestion(redisClient, roomId, room);
            }

            return res.json({
                question: room.question || `${room.questionTitle || ''}\n\n${room.questionDescription || ''}`,
                questionId: room.questionId || '',
                questionTitle: room.questionTitle || '',
                questionDescription: room.questionDescription || room.question || '',
                questionTopics,
                questionUpdatedAt: room.questionUpdatedAt || '',
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
