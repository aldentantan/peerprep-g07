import { redis } from '../redis/redisClient';
import { userStateStore, wsConnectionStore } from '../store/matchingStore';
import { Topic, Difficulty, Language } from '../types';
import { toQueueKey } from '../utils';
import { WebSocket } from 'ws';

// const TIMEOUT_MS = 2 * 60 * 1000; // 2 mins for production
const TIMEOUT_MS = 10 * 1000; // 10 seconds for testing

function pushToWs(ws: WebSocket, message: Object) {
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function removeUser(userId: string) {
  userStateStore.delete(userId);
  const ws = wsConnectionStore.get(userId);
  wsConnectionStore.delete(userId);
  ws?.close();
}

export async function handleEnqueue(userId: string, topic: Topic, difficulty: Difficulty, language: Language, ws: WebSocket) {
  // TODO: Store user state in Redis hash to allow multiple matching service instances to work
  if (userStateStore.has(userId)) {
    pushToWs(ws, { type: 'error', message: 'User is already in a queue or a match.' });
    return;
  }

  const queueKey = toQueueKey({ topic, difficulty, language });
  await redis.rpush(`${queueKey}`, userId);
  userStateStore.set(userId, { enqueuedAt: Date.now(), queueKey });

  pushToWs(ws, { type: 'queued', queueKey });
  console.log(`User ${userId} enqueued into ${queueKey}`);
}

export async function handleCancel(userId: string) {
  const state = userStateStore.get(userId);
  if (!state) return;

  const { queueKey } = state;
  await redis.lrem(`${queueKey}`, 0, userId);

  const ws = wsConnectionStore.get(userId);
  pushToWs(ws, { type: 'cancelled' });
  removeUser(userId);
  console.log(`User ${userId} cancelled and removed from ${queueKey}`);
}

export async function cleanupTimedOutUsers() {
  const now = Date.now();

  for (const [userId, state] of userStateStore.entries()) {
    if (now - state.enqueuedAt >= TIMEOUT_MS) {
      await redis.lrem(`${state.queueKey}`, 0, userId);
      const ws = wsConnectionStore.get(userId);
      pushToWs(ws, { type: 'timeout' });
      removeUser(userId);
      console.log(`User ${userId} timed out and removed from ${state.queueKey}`);
    }
  }
}

export function handleMatchEvent(channel: string, rawMessage: string) {
  let event;
  try {
    event = JSON.parse(rawMessage);
  } catch {
    console.error('[BFF] Failed to parse match event:', rawMessage);
    return;
  }

  for (const userId of event.users) {
    const ws = wsConnectionStore.get(userId);
    pushToWs(ws, { type: 'matched', match: event });
    removeUser(userId);
  }

  console.log(`Match delivered: ${event.users[0]} and ${event.users[1]} into room ${event.roomId}`);
}
