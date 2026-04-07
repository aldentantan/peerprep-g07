const WebSocket = require('ws');
const crypto = require('crypto');

const CHAT_LOG_LIMIT = 200;

function createYjsServer({ port, redisClient }) {
    const yjsRooms = {};
    const chatRooms = {};

    const addParticipant = async (roomId, joinedUser) => {
        const roomKey = `room:${roomId}`;
        const roomData = await redisClient.hGetAll(roomKey);
        const currentParticipants = roomData && roomData.participantUserIds
            ? JSON.parse(roomData.participantUserIds)
            : [];

        if (!Array.isArray(currentParticipants)) {
            return;
        }

        if (!currentParticipants.includes(joinedUser)) {
            await redisClient.hSet(roomKey, {
                participantUserIds: JSON.stringify([...currentParticipants, joinedUser]),
            });
        }
    };

    const removeParticipant = async (roomId, departingUser) => {
        const roomKey = `room:${roomId}`;
        const roomData = await redisClient.hGetAll(roomKey);
        const currentParticipants = roomData && roomData.participantUserIds
            ? JSON.parse(roomData.participantUserIds)
            : [];

        if (!Array.isArray(currentParticipants)) {
            return;
        }

        const updatedParticipants = currentParticipants.filter(
            (participant) => participant !== departingUser
        );

        await redisClient.hSet(roomKey, {
            participantUserIds: JSON.stringify(updatedParticipants),
        });

        if (updatedParticipants.length === 0) {
            const chatKey = `room:${roomId}:chat`;
            await redisClient.del(roomKey, chatKey);
            console.log(`Deleted empty room data for room ${roomId}`);
            return;
        }
    };

    const wss = new WebSocket.Server({ port }, () => {
        console.log(`Yjs WebSocket server is running on ws://localhost:${port}`);
    });

    wss.on('connection', (ws, req) => {
        const requestPath = req.url || '';
        const requestUrl = new URL(requestPath, `ws://${req.headers.host}`);
        const pathParts = requestUrl.pathname.split('/').filter(Boolean);
        const namespace = pathParts[0];
        const roomId = pathParts[1] || 'default';

        if (namespace === 'chat') {
            console.log(`New chat connection for room: ${roomId}`);

            if (!chatRooms[roomId]) {
                chatRooms[roomId] = new Set();
            }

            const room = chatRooms[roomId];
            room.add(ws);

            // Track username and connection state per socket for disconnect handling
            ws.chatUsername = null;
            ws.hasLeftExplicitly = false;

            ws.on('message', async (rawMessage) => {
                try {
                    const parsedMessage = JSON.parse(rawMessage.toString());

                    if (parsedMessage.type === 'user_joined') {
                        const joinedUser = typeof parsedMessage.user === 'string' ? parsedMessage.user : '';
                        if (!joinedUser) {
                            return;
                        }

                        // Store username on socket for disconnect handling
                        ws.chatUsername = joinedUser;

                        // Persist joined user so room fetches include currently present users.
                        try {
                            await addParticipant(roomId, joinedUser);
                        } catch (err) {
                            console.error(`Failed to update participants for join in room ${roomId}:`, err);
                        }

                        const outboundJoined = JSON.stringify({
                            type: 'user_joined',
                            payload: {
                                user: joinedUser,
                                timestamp: Date.now(),
                            },
                        });

                        // Broadcast join event to all clients in room
                        room.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(outboundJoined);
                            }
                        });
                        return;
                    }

                    if (parsedMessage.type === 'user_left') {
                        const departingUser = typeof parsedMessage.user === 'string' ? parsedMessage.user : '';
                        if (!departingUser) {
                            return;
                        }

                        // Mark this socket as having explicitly left to avoid double-removal on close
                        if (ws.chatUsername === departingUser) {
                            ws.hasLeftExplicitly = true;
                        }

                        try {
                            await removeParticipant(roomId, departingUser);
                        } catch (err) {
                            console.error(`Failed to update participants for room ${roomId}:`, err);
                        }

                        const outboundLeft = JSON.stringify({
                            type: 'user_left',
                            payload: {
                                user: departingUser,
                                timestamp: Date.now(),
                            },
                        });

                        room.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(outboundLeft);
                            }
                        });
                        return;
                    }

                    if (parsedMessage.type === 'chat_message') {
                        const normalizedMessage = {
                            id: crypto.randomUUID(),
                            user: parsedMessage.user || 'Anonymous',
                            message: parsedMessage.message || '',
                            timestamp: Date.now()
                        };

                        await redisClient.rPush(
                            `room:${roomId}:chat`,
                            JSON.stringify(normalizedMessage)
                        );

                        // Limit chat log to last 200 messages to prevent unbounded growth
                        await redisClient.lTrim(`room:${roomId}:chat`, -CHAT_LOG_LIMIT, -1);

                        const outbound = JSON.stringify({
                            type: 'chat_message',
                            payload: normalizedMessage
                        });

                        room.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(outbound);
                            }
                        });
                    }

                } catch (err) {
                    console.error(`Chat WS error in room ${roomId}:`, err);
                }
                
            });

            ws.on('close', async () => {
                // Handle disconnect: if user has not explicitly left, treat as implicit leave
                if (ws.chatUsername && !ws.hasLeftExplicitly) {
                    const departingUser = ws.chatUsername;

                    try {
                        await removeParticipant(roomId, departingUser);
                    } catch (err) {
                        console.error(`Failed to update participants on disconnect for room ${roomId}:`, err);
                    }

                    const outboundLeft = JSON.stringify({
                        type: 'user_left',
                        payload: {
                            user: departingUser,
                            timestamp: Date.now(),
                        },
                    });

                    room.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(outboundLeft);
                        }
                    });
                }

                room.delete(ws);
                if (room.size === 0) {
                    delete chatRooms[roomId];
                }
            });

            ws.on('error', async (err) => {
                console.error(`Chat WS connection error in room ${roomId}:`, err);

                // Handle error similar to close: treat as implicit leave if user has not explicitly left
                if (ws.chatUsername && !ws.hasLeftExplicitly) {
                    const departingUser = ws.chatUsername;

                    try {
                        await removeParticipant(roomId, departingUser);
                    } catch (err) {
                        console.error(`Failed to update participants on error for room ${roomId}:`, err);
                    }

                    const outboundLeft = JSON.stringify({
                        type: 'user_left',
                        payload: {
                            user: departingUser,
                            timestamp: Date.now(),
                        },
                    });

                    room.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(outboundLeft);
                        }
                    });
                }

                room.delete(ws);
            });

            return;
        }

        if (namespace === 'yjs') {
            console.log(`New Yjs connection for room: ${roomId}`);

            if (!yjsRooms[roomId]) {
                yjsRooms[roomId] = new Set();
            }

            const room = yjsRooms[roomId];
            room.add(ws);

            console.log(`Yjs client joined room: ${roomId} (${room.size} clients)`);

            ws.on('message', (message) => {
                room.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(message);
                    }
                });
            });

            ws.on('close', () => {
                room.delete(ws);
                console.log(`Yjs client left room: ${roomId} (${room.size} remaining)`);
                if (room.size === 0) {
                    delete yjsRooms[roomId];
                }
            });

            ws.on('error', (err) => {
                console.error(`Yjs WS error in room ${roomId}:`, err);
                room.delete(ws);
            });

            return;
        }

        ws.close(1008, 'Unsupported WebSocket namespace');
        return;
    });
    return wss;
}

module.exports = {
    createYjsServer
};
