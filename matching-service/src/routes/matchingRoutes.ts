import { parse } from 'url';
import { handleCancel, handleEnqueue } from '../controllers/matchingController';
import { wsConnectionStore } from '../store/matchingStore';
import { Topic, Difficulty, Language } from '../types';
import { WebSocket } from 'ws';

export function handleWsConnection(ws: WebSocket, req: any) {
  const { query } = parse(req.url ?? '', true);
  const userId = query.userId;

  if (!userId || typeof userId !== 'string') {
    ws.close(1008, 'Missing or invalid userId');
    return;
  }

  // Each user may only hold one active matching request
  if (wsConnectionStore.has(userId)) {
    ws.close(1008, 'User already has an active matching request');
    return;
  }

  wsConnectionStore.set(userId, ws);

  console.log(`User ${userId} is added to the matching queue`);

  ws.on('message', (raw: Buffer) => handleMessage(userId, ws, raw));

  // On disconnect, remove the user from the queue if they were waiting
  ws.on('close', () => {
    console.log(`User ${userId} is removed from the matching queue`);
    handleCancel(userId).catch(console.error);
  });
}

function handleMessage(userId: string, ws: WebSocket, raw: Buffer) {
  let msg: { type: 'enqueue' | 'cancel', topic: Topic, difficulty: Difficulty, language: Language };
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    sendError(ws, 'Invalid JSON');
    return;
  }

  const dispatch = {
    enqueue: () => handleEnqueue(userId, msg.topic, msg.difficulty, msg.language, ws),
    cancel: () => handleCancel(userId),
  };

  const action = dispatch[msg.type];
  if (!action) {
    sendError(ws, `Unknown message type: ${msg.type}`);
    return;
  }

  action().catch((err: any) => sendError(ws, err.message));
}

function sendError(ws: WebSocket, message: string) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'error', message }));
  }
}
