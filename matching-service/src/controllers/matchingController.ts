import { WebSocket } from 'ws';
import { redis } from '../redis/redisClient';
import { wsConnectionStore } from '../store/matchingStore';
import { Difficulty, Language, Topic } from '../types';
import { toQueueKey } from '../utils';
import { ACTIVE_QUEUES_KEY, QUEUED_USERS_KEY } from '../redis/redisKeys';

// const TIMEOUT_MS = 2 * 60 * 1000; // in ms for production
const TIMEOUT_MS = 30 * 1000; // in ms for testing

// KEYS[1] = queued users hash key
// KEYS[2] = queue list key
// KEYS[3] = active queues set key
// ARGV[1] = user ID
// ARGV[2] = queued state JSON string
const LUA_ENQUEUE_IF_ABSENT = `
  if redis.call('HEXISTS', KEYS[1], ARGV[1]) == 1 then
    return 0
  end

  redis.call('RPUSH', KEYS[2], ARGV[1])
  redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
  redis.call('SADD', KEYS[3], KEYS[2])
  return 1
`;


// KEYS[1] = queued users hash key
// KEYS[2] = queue list key
// KEYS[3] = active queues set key
// ARGV[1] = user ID
// ARGV[2] = snapshot of queued state JSON string
const LUA_CLEANUP_TIMEOUT_IF_QUEUED = `
  local currentState = redis.call('HGET', KEYS[1], ARGV[1])
  if not currentState then
    return 0
  end

  -- Snapshot mismatch means the state changed after HGETALL and should be ignored.
  if currentState ~= ARGV[2] then
    return 0
  end

  -- Remove user from queue and remove queue if no users left
  local removed = redis.call('LREM', KEYS[2], 0, ARGV[1])
  if removed > 0 then
    redis.call('HDEL', KEYS[1], ARGV[1])
    if redis.call('LLEN', KEYS[2]) == 0 then
      redis.call('SREM', KEYS[3], KEYS[2])
    end
    return 1
  end

  -- User was no longer in queue (likely already dequeued for match); clear stale hash only.
  redis.call('HDEL', KEYS[1], ARGV[1])

  if redis.call('LLEN', KEYS[2]) == 0 then
    redis.call('SREM', KEYS[3], KEYS[2])
  end
  return -1
`;

// KEYS[1] = queued users hash key
// KEYS[2] = queue list key
// KEYS[3] = active queues set key
// ARGV[1] = user ID
// ARGV[2] = snapshot of queued state JSON string
const LUA_CANCEL_IF_QUEUED = `
  local currentState = redis.call('HGET', KEYS[1], ARGV[1])
  if not currentState then
    return 0
  end

  if currentState ~= ARGV[2] then
    return 0
  end

  local removed = redis.call('LREM', KEYS[2], 0, ARGV[1])
  if removed > 0 then
    redis.call('HDEL', KEYS[1], ARGV[1])
    if redis.call('LLEN', KEYS[2]) == 0 then
      redis.call('SREM', KEYS[3], KEYS[2])
    end
    return 1
  end

  redis.call('HDEL', KEYS[1], ARGV[1])

  -- If no users are left in the queue, remove the queue from active.queues set
  if redis.call('LLEN', KEYS[2]) == 0 then
    redis.call('SREM', KEYS[3], KEYS[2])
  end
  return -1
`;

type QueuedUserState = {
  enqueuedAt: number;
  queueKey: string;
};

function pushToWs(ws: WebSocket, message: Object) {
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function parseQueuedUserState(rawState: string): QueuedUserState | null {
  try {
    const parsed = JSON.parse(rawState) as Partial<QueuedUserState>;
    if (typeof parsed.queueKey !== 'string' || typeof parsed.enqueuedAt !== 'number') {
      return null;
    }

    return parsed as QueuedUserState;
  } catch {
    return null;
  }
}

async function removeUser(userId: string) {
  await redis.hdel(QUEUED_USERS_KEY, userId);
  removeWsConnection(userId);
}

function removeWsConnection(userId: string) {
  const ws = wsConnectionStore.get(userId);
  wsConnectionStore.delete(userId);
  ws?.close();
}

export async function handleEnqueue(userId: string, topic: Topic, difficulty: Difficulty, language: Language, ws: WebSocket) {
  const queueKey = toQueueKey({ topic, difficulty, language });
  const queuedState = JSON.stringify({ enqueuedAt: Date.now(), queueKey });

  const enqueueResult = (await redis.eval(
    LUA_ENQUEUE_IF_ABSENT,
    3,
    QUEUED_USERS_KEY,
    queueKey,
    ACTIVE_QUEUES_KEY,
    userId,
    queuedState
  )) as number;

  if (enqueueResult === 0) {
    pushToWs(ws, { type: 'error', message: 'User is already in a queue.' });
    return;
  }

  pushToWs(ws, { type: 'queued', queueKey });
  console.log(`User ${userId} enqueued into ${queueKey}`);
}

export async function handleCancel(userId: string) {
  const rawState = await redis.hget(QUEUED_USERS_KEY, userId);
  if (!rawState) return;

  const state = parseQueuedUserState(rawState);
  if (!state) {
    await redis.hdel(QUEUED_USERS_KEY, userId);
    console.error(`Invalid queued state for user ${userId}; removed stale state`);
    return;
  }

  const { queueKey } = state;
  const cancelResult = (await redis.eval(
    LUA_CANCEL_IF_QUEUED,
    3,
    QUEUED_USERS_KEY,
    queueKey,
    ACTIVE_QUEUES_KEY,
    userId,
    rawState,
  )) as number;

  if (cancelResult === 1) {
    const ws = wsConnectionStore.get(userId);
    pushToWs(ws, { type: 'cancelled' });
    removeWsConnection(userId);
    console.log(`User ${userId} cancelled and removed from ${queueKey}`);
    return;
  }

  if (cancelResult === -1) {
    console.log(`Skipped cancel for user ${userId}; user was already removed from queue ${queueKey}`);
  }
}

export async function cleanupTimedOutUsers() {
  const now = Date.now();

  const queuedUsers = await redis.hgetall(QUEUED_USERS_KEY);
  for (const [userId, rawState] of Object.entries(queuedUsers)) {
    const state = parseQueuedUserState(rawState);
    if (!state) {
      await redis.hdel(QUEUED_USERS_KEY, userId);
      console.error(`Invalid queued state for user ${userId}; removed stale state`);
      continue;
    }

    if (now - state.enqueuedAt >= TIMEOUT_MS) {
      const timeoutCleanupResult = (await redis.eval(
        LUA_CLEANUP_TIMEOUT_IF_QUEUED,
        3,
        QUEUED_USERS_KEY,
        state.queueKey,
        ACTIVE_QUEUES_KEY,
        userId,
        rawState,
      )) as number;

      if (timeoutCleanupResult === 1) {
        const ws = wsConnectionStore.get(userId);
        pushToWs(ws, { type: 'timeout' });
        removeWsConnection(userId);
        console.log(`User ${userId} timed out and removed from ${state.queueKey}`);
      } else if (timeoutCleanupResult === -1) {
        console.log(`Skipped timeout for user ${userId}; user was already removed from queue ${state.queueKey}`);
      }
    }
  }
}

export async function handleMatchEvent(channel: string, rawMessage: string) {
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
    await removeUser(userId);
  }

  console.log(`Match delivered: ${event.users[0]} and ${event.users[1]} into room ${event.roomId}`);
}
