import { parse } from 'url';
import { WebSocket } from 'ws';
import { handleAcceptMatch, handleCancel, handleEnqueue } from '../controllers/matchingController';
import { redis } from '../redis/redisClient';
import { QUEUED_USERS_KEY } from '../redis/redisKeys';
import { wsConnectionStore } from '../store/matchingStore';
import { Difficulty, Language, Topic } from '../types';

export async function handleWsConnection(ws: WebSocket, req: Request) {
  const { query } = parse(req.url ?? '', true);
  const userId = query.userId;

  if (!userId || typeof userId !== 'string') {
    ws.close(1008, 'Missing or invalid userId');
    return;
  }

  try {
    const isAlreadyQueued = await redis.hexists(QUEUED_USERS_KEY, userId);
    if (isAlreadyQueued === 1) {
      sendError(ws, 'User is already in a queue.');
      ws.close(1008, 'User already has an active matching request');
      return;
    }
  } catch {
    sendError(ws, 'Failed to validate queue state. Please try again.');
    ws.close(1011, 'Queue state validation failed');
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
  let msg: {
    type: 'enqueue' | 'cancel' | 'abandon' | 'accept_match';
    topic?: Topic;
    difficulty?: Difficulty;
    language?: Language;
    pendingMatchId?: string;
  };
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    sendError(ws, 'Invalid JSON');
    return;
  }

  const dispatch = {
    enqueue: () => {
      if (!msg.topic || !msg.difficulty || !msg.language) {
        sendError(ws, 'Missing enqueue payload');
        return Promise.resolve();
      }

      return handleEnqueue(userId, msg.topic, msg.difficulty, msg.language, ws);
    },
    cancel: () => handleCancel(userId),
    abandon: () => handleCancel(userId),
    accept_match: () => {
      if (!msg.pendingMatchId) {
        sendError(ws, 'Missing pendingMatchId for accept_match');
        return Promise.resolve();
      }

      return handleAcceptMatch(userId, msg.pendingMatchId);
    },
  };

  const action = dispatch[msg.type];
  if (!action) {
    sendError(ws, `Unknown message type: ${msg.type}`);
    return;
  }

  action().catch((err: Error) => sendError(ws, err.message));
}

function sendError(ws: WebSocket, message: string) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'error', message }));
  }
}
