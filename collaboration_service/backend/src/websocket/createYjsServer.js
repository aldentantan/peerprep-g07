const WebSocket = require('ws');

function createYjsServer({ port }) {
    const yjsRooms = {};

    function handleYjsConnection(ws, roomId) {
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
    }

    const wss = new WebSocket.Server({ port }, () => {
        console.log(`Yjs WebSocket server is running on ws://localhost:${port}`);
    });

    wss.on('connection', (ws, req) => {
        const requestPath = req.url || '';

        // Extract roomId from /yjs/:roomId path
        const requestUrl = new URL(requestPath, `ws://${req.headers.host}`);
        const pathParts = requestUrl.pathname.split('/').filter(Boolean);
        const roomId = pathParts[1] || 'default';

        console.log(`New Yjs connection for room: ${roomId}`);
        handleYjsConnection(ws, roomId);
    });

    return wss;
}

module.exports = {
    createYjsServer
};
