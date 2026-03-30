import { randomUUID } from 'crypto';
import { WebSocket } from 'ws';
import { collabRedis } from '../redis/collabRedisClient';
import { redis } from '../redis/redisClient';
import {
  ACTIVE_QUEUES_KEY,
  PENDING_MATCHES_KEY,
  QUEUED_USERS_KEY,
  USER_PENDING_MATCH_KEY,
} from '../redis/redisKeys';
import { wsConnectionStore } from '../store/matchingStore';
import { Difficulty, Language, Match, OutboundMessage, PendingMatch, Topic } from '../types';
import { toQueueKey } from '../utils';

// const TIMEOUT_MS = 2 * 60 * 1000; // in ms for production
const TIMEOUT_MS = 30 * 1000; // in ms for testing
const QUESTION_SERVICE_URL = process.env.QUESTION_SERVICE_URL || 'http://localhost:3001';

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

// KEYS[1] = pending matches hash key
// KEYS[2] = user -> pending match hash key
// ARGV[1] = pending match ID
// ARGV[2] = pending match state JSON string
// ARGV[3] = user1 ID
// ARGV[4] = user2 ID
const LUA_CREATE_PENDING_MATCH = `
  if redis.call('HEXISTS', KEYS[2], ARGV[3]) == 1 or redis.call('HEXISTS', KEYS[2], ARGV[4]) == 1 then
    return 0
  end

  redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
  redis.call('HSET', KEYS[2], ARGV[3], ARGV[1])
  redis.call('HSET', KEYS[2], ARGV[4], ARGV[1])
  return 1
`;

// KEYS[1] = pending matches hash key
// KEYS[2] = user -> pending match hash key
// ARGV[1] = user ID
// ARGV[2] = pending match ID
const LUA_ACCEPT_PENDING_MATCH = `
  local mappedPendingMatchId = redis.call('HGET', KEYS[2], ARGV[1])
  if not mappedPendingMatchId then
    return 0
  end

  if mappedPendingMatchId ~= ARGV[2] then
    return -1
  end

  local currentState = redis.call('HGET', KEYS[1], ARGV[2])
  if not currentState then
    redis.call('HDEL', KEYS[2], ARGV[1])
    return 0
  end

  local ok, state = pcall(cjson.decode, currentState)
  if not ok then
    redis.call('HDEL', KEYS[1], ARGV[2])
    redis.call('HDEL', KEYS[2], ARGV[1])
    return 0
  end

  if ARGV[1] == state.user1Id then
    state.acceptedByUser1 = true
  elseif ARGV[1] == state.user2Id then
    state.acceptedByUser2 = true
  else
    return -2
  end

  redis.call('HSET', KEYS[1], ARGV[2], cjson.encode(state))

  if state.acceptedByUser1 and state.acceptedByUser2 then
    return 2
  end

  return 1
`;

// KEYS[1] = pending matches hash key
// KEYS[2] = user -> pending match hash key
// ARGV[1] = pending match ID
// ARGV[2] = snapshot of pending match state JSON string
const LUA_FINALIZE_PENDING_MATCH = `
  local currentState = redis.call('HGET', KEYS[1], ARGV[1])
  if not currentState then
    return 0
  end

  if currentState ~= ARGV[2] then
    return -1
  end

  local ok, state = pcall(cjson.decode, currentState)
  if not ok then
    redis.call('HDEL', KEYS[1], ARGV[1])
    return 0
  end

  redis.call('HDEL', KEYS[1], ARGV[1])
  redis.call('HDEL', KEYS[2], state.user1Id)
  redis.call('HDEL', KEYS[2], state.user2Id)
  return 1
`;

type QueuedUserState = {
  enqueuedAt: number;
  queueKey: string;
};

type PendingMatchState = {
  pendingMatchId: string;
  user1Id: string;
  user2Id: string;
  topic: Topic;
  difficulty: Difficulty;
  language: Language;
  createdAt: number;
  acceptedByUser1: boolean;
  acceptedByUser2: boolean;
};

function pushToWs(ws: WebSocket | undefined, message: OutboundMessage) {
  if (ws && ws.readyState === WebSocket.OPEN) {
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

function parsePendingMatchState(rawState: string): PendingMatchState | null {
  try {
    const parsed = JSON.parse(rawState) as Partial<PendingMatchState>;
    if (
      typeof parsed.pendingMatchId !== 'string' ||
      typeof parsed.user1Id !== 'string' ||
      typeof parsed.user2Id !== 'string' ||
      typeof parsed.topic !== 'string' ||
      typeof parsed.difficulty !== 'string' ||
      typeof parsed.language !== 'string' ||
      typeof parsed.createdAt !== 'number' ||
      typeof parsed.acceptedByUser1 !== 'boolean' ||
      typeof parsed.acceptedByUser2 !== 'boolean'
    ) {
      return null;
    }

    return parsed as PendingMatchState;
  } catch {
    return null;
  }
}

async function createRoomForAcceptedMatch(state: PendingMatchState): Promise<Match> {
  const roomId = randomUUID();

  const capDifficulty =
    state.difficulty.charAt(0).toUpperCase() + state.difficulty.slice(1);
  const res = await fetch(
    `${QUESTION_SERVICE_URL}/questions?topics=${encodeURIComponent(state.topic)}&difficulty=${encodeURIComponent(capDifficulty)}`,
  );

  let questionText = `Solve a ${state.difficulty} ${state.topic} problem.`;
  if (res.ok) {
    const data = await res.json();
    if (data.questions && data.questions.length > 0) {
      const pick = data.questions[Math.floor(Math.random() * data.questions.length)];
      questionText = `${pick.title}\n\n${pick.description}`;
    }
  }

  await collabRedis.hset(`room:${roomId}`, {
    question: questionText,
    programmingLanguage: state.language,
    questionTopic: state.topic,
    questionDifficulty: state.difficulty,
    participantUserIds: JSON.stringify([state.user1Id, state.user2Id]),
  });

  return {
    roomId,
    users: [state.user1Id, state.user2Id],
    createdAt: Date.now(),
    topic: state.topic,
    difficulty: state.difficulty,
    language: state.language,
  };
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

export async function handleAcceptMatch(userId: string, pendingMatchId: string) {
  const acceptResult = (await redis.eval(
    LUA_ACCEPT_PENDING_MATCH,
    2,
    PENDING_MATCHES_KEY,
    USER_PENDING_MATCH_KEY,
    userId,
    pendingMatchId,
  )) as number;

  if (acceptResult === 0) {
    const ws = wsConnectionStore.get(userId);
    pushToWs(ws, { type: 'error', message: 'No pending match found for this user.' });
    return;
  }

  if (acceptResult === -1) {
    const ws = wsConnectionStore.get(userId);
    pushToWs(ws, { type: 'error', message: 'Pending match ID mismatch.' });
    return;
  }

  if (acceptResult === -2) {
    const ws = wsConnectionStore.get(userId);
    pushToWs(ws, { type: 'error', message: 'User is not part of this pending match.' });
    return;
  }

  if (acceptResult === 1) {
    console.log(`User ${userId} accepted pending match ${pendingMatchId}; waiting for peer.`);
    return;
  }

  const rawPendingState = await redis.hget(PENDING_MATCHES_KEY, pendingMatchId);
  if (!rawPendingState) {
    console.error(`Pending match ${pendingMatchId} disappeared before finalization`);
    return;
  }

  const pendingState = parsePendingMatchState(rawPendingState);
  if (!pendingState) {
    await redis.hdel(PENDING_MATCHES_KEY, pendingMatchId);
    await redis.hdel(USER_PENDING_MATCH_KEY, userId);
    console.error(`Invalid pending match state for ${pendingMatchId}; removed stale state`);
    return;
  }

  const finalizeResult = (await redis.eval(
    LUA_FINALIZE_PENDING_MATCH,
    2,
    PENDING_MATCHES_KEY,
    USER_PENDING_MATCH_KEY,
    pendingMatchId,
    rawPendingState,
  )) as number;

  if (finalizeResult !== 1) {
    console.log(`Skipped finalization for pending match ${pendingMatchId}; state changed`);
    return;
  }

  const match = await createRoomForAcceptedMatch(pendingState);

  for (const matchedUserId of match.users) {
    const ws = wsConnectionStore.get(matchedUserId);
    pushToWs(ws, { type: 'match_confirmed', match });
    removeWsConnection(matchedUserId);
  }

  console.log(
    `Pending match ${pendingMatchId} confirmed for ${match.users[0]} and ${match.users[1]} into room ${match.roomId}`,
  );
}

export async function handleMatchEvent(channel: string, rawMessage: string) {
  if (channel !== 'match.events') {
    return;
  }

  let event: PendingMatch;
  try {
    event = JSON.parse(rawMessage) as PendingMatch;
  } catch {
    console.error('[BFF] Failed to parse match event:', rawMessage);
    return;
  }

  if (
    !event.pendingMatchId ||
    !Array.isArray(event.users) ||
    event.users.length !== 2 ||
    !event.topic ||
    !event.difficulty ||
    !event.language ||
    typeof event.createdAt !== 'number'
  ) {
    console.error('[BFF] Invalid pending match event payload:', rawMessage);
    return;
  }

  const pendingState: PendingMatchState = {
    pendingMatchId: event.pendingMatchId,
    user1Id: event.users[0],
    user2Id: event.users[1],
    topic: event.topic,
    difficulty: event.difficulty,
    language: event.language,
    createdAt: event.createdAt,
    acceptedByUser1: false,
    acceptedByUser2: false,
  };

  const createPendingResult = (await redis.eval(
    LUA_CREATE_PENDING_MATCH,
    2,
    PENDING_MATCHES_KEY,
    USER_PENDING_MATCH_KEY,
    event.pendingMatchId,
    JSON.stringify(pendingState),
    event.users[0],
    event.users[1],
  )) as number;

  if (createPendingResult !== 1) {
    console.error(`Failed to create pending match state for ${event.pendingMatchId}`);
    return;
  }

  for (const userId of event.users) {
    await redis.hdel(QUEUED_USERS_KEY, userId);
    const ws = wsConnectionStore.get(userId);
    pushToWs(ws, { type: 'match_pending', pendingMatch: event });
  }

  console.log(
    `Pending match delivered: ${event.users[0]} and ${event.users[1]} with id ${event.pendingMatchId}`,
  );
}
