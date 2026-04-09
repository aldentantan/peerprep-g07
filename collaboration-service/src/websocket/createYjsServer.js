const WebSocket = require('ws');
const crypto = require('crypto');

const CHAT_LOG_LIMIT = 200;
const COLLAB_USER_ROOM_MAP_KEY = 'collab.users.room';
const ROOM_DELETE_GRACE_MS = 60 * 1000;
const YJS_UPDATE_LOG_LIMIT = 500;

function createYjsServer({ port, redisClient }) {
    const yjsRooms = {};
    const yjsUpdateCache = {};
    const chatRooms = {};

    // 
    const roomDeletionTimers = {};

    const getYjsUpdatesKey = (roomId) => `room:${roomId}:yjs:updates`;

    const normalizeWsMessageToBuffer = (message) => {
        if (Buffer.isBuffer(message)) {
            return message;
        }

        if (message instanceof ArrayBuffer) {
            return Buffer.from(message);
        }

        // ws may provide ArrayBufferView in some runtimes
        if (ArrayBuffer.isView(message)) {
            return Buffer.from(message.buffer, message.byteOffset, message.byteLength);
        }

        return Buffer.from(message);
    };

    const loadYjsUpdatesForRoom = async (roomId) => {
        if (yjsUpdateCache[roomId]) {
            return yjsUpdateCache[roomId];
        }

        const encodedUpdates = await redisClient.lRange(getYjsUpdatesKey(roomId), 0, -1);
        const decoded = encodedUpdates
            .map((entry) => {
                try {
                    return Buffer.from(entry, 'base64');
                } catch {
                    return null;
                }
            })
            .filter(Boolean);

        yjsUpdateCache[roomId] = decoded;
        return decoded;
    };

    const appendYjsUpdateForRoom = async (roomId, messageBuffer) => {
        if (!yjsUpdateCache[roomId]) {
            yjsUpdateCache[roomId] = [];
        }

        yjsUpdateCache[roomId].push(messageBuffer);
        if (yjsUpdateCache[roomId].length > YJS_UPDATE_LOG_LIMIT) {
            yjsUpdateCache[roomId] = yjsUpdateCache[roomId].slice(-YJS_UPDATE_LOG_LIMIT);
        }

        const encoded = messageBuffer.toString('base64');
        await redisClient.rPush(getYjsUpdatesKey(roomId), encoded);
        await redisClient.lTrim(getYjsUpdatesKey(roomId), -YJS_UPDATE_LOG_LIMIT, -1);
    };

    const cancelRoomDeletion = (roomId) => {
        const timer = roomDeletionTimers[roomId];
        if (!timer) {
            return;
        }

        clearTimeout(timer);
        delete roomDeletionTimers[roomId];
        console.log(`Cancelled pending room deletion for room ${roomId}`);
    };

    const scheduleRoomDeletion = (roomId) => {
        if (roomDeletionTimers[roomId]) {
            return;
        }

        roomDeletionTimers[roomId] = setTimeout(async () => {
            delete roomDeletionTimers[roomId];

            const activeChatSockets = chatRooms[roomId]
                ? Array.from(chatRooms[roomId]).filter((client) => client.readyState === WebSocket.OPEN).length
                : 0;
            const activeYjsSockets = yjsRooms[roomId]
                ? Array.from(yjsRooms[roomId]).filter((client) => client.readyState === WebSocket.OPEN).length
                : 0;

            if (activeChatSockets > 0 || activeYjsSockets > 0) {
                console.log(`Skipped room deletion for ${roomId}: active sockets found`);
                return;
            }

            const roomKey = `room:${roomId}`;
            const roomData = await redisClient.hGetAll(roomKey);
            const currentParticipants = roomData && roomData.participantUserIds
                ? JSON.parse(roomData.participantUserIds)
                : [];

            if (Array.isArray(currentParticipants) && currentParticipants.length > 0) {
                console.log(`Skipped room deletion for ${roomId}: participants rejoined`);
                return;
            }

            let initialUserIds = [];
            if (roomData && roomData.initialUserIds) {
                try {
                    const parsedInitialUserIds = JSON.parse(roomData.initialUserIds);
                    if (Array.isArray(parsedInitialUserIds)) {
                        initialUserIds = parsedInitialUserIds.filter((item) => typeof item === 'string');
                    }
                } catch (err) {
                    console.error(`Invalid initialUserIds in redis for room ${roomId}:`, err);
                }
            }

            if (initialUserIds.length > 0) {
                await redisClient.hDel(COLLAB_USER_ROOM_MAP_KEY, ...initialUserIds);
            }

            const chatKey = `room:${roomId}:chat`;
            const yjsUpdatesKey = getYjsUpdatesKey(roomId);
            await redisClient.del(roomKey, chatKey, yjsUpdatesKey);
            delete yjsUpdateCache[roomId];
            console.log(`Deleted empty room data for room ${roomId} after ${ROOM_DELETE_GRACE_MS}ms grace period`);
        }, ROOM_DELETE_GRACE_MS);

        console.log(`Scheduled room deletion for room ${roomId} in ${ROOM_DELETE_GRACE_MS}ms`);
    };

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
        let initialUserIds = [];

        if (roomData && roomData.initialUserIds) {
            try {
                const parsedInitialUserIds = JSON.parse(roomData.initialUserIds);
                if (Array.isArray(parsedInitialUserIds)) {
                    initialUserIds = parsedInitialUserIds.filter((item) => typeof item === 'string');
                }
            } catch (err) {
                console.error(`Invalid initialUserIds in redis for room ${roomId}:`, err);
            }
        }

        if (!Array.isArray(currentParticipants)) {
            return null;
        }

        const updatedParticipants = currentParticipants.filter(
            (participant) => participant !== departingUser
        );

        // participantUserIds is saved in redis hSet as username
        await redisClient.hSet(roomKey, {
            participantUserIds: JSON.stringify(updatedParticipants),
        });

        return { updatedParticipants, initialUserIds };
    };

    const wss = new WebSocket.Server({ port }, () => {
        console.log(`Yjs WebSocket server is running on ws://localhost:${port}`);
    });

    wss.on('connection', async (ws, req) => {
        const requestPath = req.url || '';
        const requestUrl = new URL(requestPath, `ws://${req.headers.host}`);
        const pathParts = requestUrl.pathname.split('/').filter(Boolean);
        const namespace = pathParts[0];
        const roomId = pathParts[1] || 'default';

        if (namespace === 'chat') {
            console.log(`New chat connection for room: ${roomId}`);
            cancelRoomDeletion(roomId);

            if (!chatRooms[roomId]) {
                chatRooms[roomId] = new Set();
            }

            const room = chatRooms[roomId];
            room.add(ws);

            const hasAnotherActiveSocketForUser = (username, excludingSocket) => {
                for (const client of room) {
                    if (client === excludingSocket) {
                        continue;
                    }

                    if (client.readyState === WebSocket.OPEN && client.chatUsername === username) {
                        return true;
                    }
                }

                return false;
            };

            const hasAnyOtherActiveSocketInRoom = (excludingSocket) => {
                for (const client of room) {
                    if (client === excludingSocket) {
                        continue;
                    }

                    if (client.readyState === WebSocket.OPEN) {
                        return true;
                    }
                }

                return false;
            };

            const handleUserDepartureIfLastSocket = async (departingUser, excludingSocket) => {
                if (hasAnotherActiveSocketForUser(departingUser, excludingSocket)) {
                    return;
                }

                try {
                    const result = await removeParticipant(roomId, departingUser);

                    // Delete room data only if no participants remain and there are no
                    // other active sockets in this room (prevents multi-tab false cleanup).
                    if (
                        result &&
                        result.updatedParticipants.length === 0 &&
                        !hasAnyOtherActiveSocketInRoom(excludingSocket)
                    ) {
                        scheduleRoomDeletion(roomId);
                    }
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
            };

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

                        await handleUserDepartureIfLastSocket(departingUser, ws);
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

                    await handleUserDepartureIfLastSocket(departingUser, ws);
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

                    await handleUserDepartureIfLastSocket(departingUser, ws);
                }

                room.delete(ws);
            });

            return;
        }

        if (namespace === 'yjs') {
            console.log(`New Yjs connection for room: ${roomId}`);
            cancelRoomDeletion(roomId);

            if (!yjsRooms[roomId]) {
                yjsRooms[roomId] = new Set();
            }

            const room = yjsRooms[roomId];
            room.add(ws);

            console.log(`Yjs client joined room: ${roomId} (${room.size} clients)`);

            // Replay persisted Yjs updates so refreshed/reconnected clients recover state.
            try {
                const existingUpdates = await loadYjsUpdatesForRoom(roomId);
                for (const update of existingUpdates) {
                    if (ws.readyState !== WebSocket.OPEN) {
                        break;
                    }
                    ws.send(update);
                }
            } catch (err) {
                console.error(`Failed to replay Yjs updates for room ${roomId}:`, err);
            }

            ws.on('message', async (message) => {
                const messageBuffer = normalizeWsMessageToBuffer(message);

                try {
                    await appendYjsUpdateForRoom(roomId, messageBuffer);
                } catch (err) {
                    console.error(`Failed to persist Yjs update for room ${roomId}:`, err);
                }

                room.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(messageBuffer);
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
