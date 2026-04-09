import { randomUUID } from "crypto";
import { WebSocket } from "ws";
import {
  LUA_ACCEPT_PENDING_MATCH,
  LUA_CANCEL_IF_QUEUED,
  LUA_CLEANUP_TIMEOUT_IF_QUEUED,
  LUA_CREATE_PENDING_MATCH,
  LUA_ENQUEUE_IF_ABSENT,
  LUA_EXPIRE_PENDING_MATCH_IF_UNCHANGED,
  LUA_FINALIZE_PENDING_MATCH,
} from "../lua-scripts/luaScripts";
import { collabRedis } from "../redis/collabRedisClient";
import { redis } from "../redis/redisClient";
import {
  ACTIVE_QUEUES_KEY,
  COLLAB_USER_ROOM_MAP_KEY,
  PENDING_MATCHES_KEY,
  QUEUED_USERS_KEY,
  USER_PENDING_MATCH_KEY,
} from "../redis/redisKeys";
import { wsConnectionStore } from "../store/matchingStore";
import {
  Difficulty,
  Language,
  Match,
  OutboundMessage,
  PendingMatch,
  Topic,
} from "../types";
import { toQueueKey } from "../utils";

// const TIMEOUT_MS = 2 * 60 * 1000; // in ms for production
const TIMEOUT_MS = 30 * 1000; // in ms for testing
const PENDING_ACCEPT_TIMEOUT_MS = 20 * 1000;

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

/** ─────────────────────────────────────
 *  WebSocket Message Helper
 *  ─────────────────────────────────────
 */
function pushToWs(ws: WebSocket | undefined, message: OutboundMessage) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/** ─────────────────────────────────────
 *  User Queueing Logic (Pre-Match)
 *  ─────────────────────────────────────
 */

function parseQueuedUserState(rawState: string): QueuedUserState | null {
  try {
    const parsed = JSON.parse(rawState) as Partial<QueuedUserState>;
    if (
      typeof parsed.queueKey !== "string" ||
      typeof parsed.enqueuedAt !== "number"
    ) {
      return null;
    }

    return parsed as QueuedUserState;
  } catch {
    return null;
  }
}

export async function handleEnqueue(
  userId: string,
  topic: Topic,
  difficulty: Difficulty,
  language: Language,
  ws: WebSocket,
) {
  const queueKey = toQueueKey({ topic, difficulty, language });
  const queuedState = JSON.stringify({ enqueuedAt: Date.now(), queueKey });

  const enqueueResult = (await redis.eval(
    LUA_ENQUEUE_IF_ABSENT,
    3,
    QUEUED_USERS_KEY,
    queueKey,
    ACTIVE_QUEUES_KEY,
    userId,
    queuedState,
  )) as number;

  if (enqueueResult === 0) {
    pushToWs(ws, { type: "error", message: "User is already in a queue." });
    return;
  }

  pushToWs(ws, { type: "queued", queueKey });
  console.log(`User ${userId} enqueued into ${queueKey}`);
}

export async function handleCancel(userId: string) {
  const rawState = await redis.hget(QUEUED_USERS_KEY, userId);
  if (!rawState) return;

  const state = parseQueuedUserState(rawState);
  if (!state) {
    await redis.hdel(QUEUED_USERS_KEY, userId);
    console.error(
      `Invalid queued state for user ${userId}; removed stale state`,
    );
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
    pushToWs(ws, { type: "cancelled" });
    removeWsConnection(userId);
    console.log(`User ${userId} cancelled and removed from ${queueKey}`);
    return;
  }

  if (cancelResult === -1) {
    console.log(
      `Skipped cancel for user ${userId}; user was already removed from queue ${queueKey}`,
    );
  }
}

export async function cleanupTimedOutUsers() {
  const now = Date.now();

  const queuedUsers = await redis.hgetall(QUEUED_USERS_KEY);
  for (const [userId, rawState] of Object.entries(queuedUsers)) {
    const state = parseQueuedUserState(rawState);
    if (!state) {
      await redis.hdel(QUEUED_USERS_KEY, userId);
      console.error(
        `Invalid queued state for user ${userId}; removed stale state`,
      );
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
        pushToWs(ws, { type: "timeout" });
        removeWsConnection(userId);
        console.log(
          `User ${userId} timed out and removed from ${state.queueKey}`,
        );
      } else if (timeoutCleanupResult === -1) {
        console.log(
          `Skipped timeout for user ${userId}; user was already removed from queue ${state.queueKey}`,
        );
      }
    }
  }

  await cleanupTimedOutPendingMatches(now);
}

/** ─────────────────────────────────────
 *  Matching Users and Pending Accept Match Logic
 *  ─────────────────────────────────────
 */

function parsePendingMatchState(rawState: string): PendingMatchState | null {
  try {
    const parsed = JSON.parse(rawState) as Partial<PendingMatchState>;
    if (
      typeof parsed.pendingMatchId !== "string" ||
      typeof parsed.user1Id !== "string" ||
      typeof parsed.user2Id !== "string" ||
      typeof parsed.topic !== "string" ||
      typeof parsed.difficulty !== "string" ||
      typeof parsed.language !== "string" ||
      typeof parsed.createdAt !== "number" ||
      typeof parsed.acceptedByUser1 !== "boolean" ||
      typeof parsed.acceptedByUser2 !== "boolean"
    ) {
      return null;
    }

    return parsed as PendingMatchState;
  } catch {
    return null;
  }
}

export async function handleMatchEvent(rawMessage: string) {
  let event: PendingMatch;
  try {
    event = JSON.parse(rawMessage) as PendingMatch;
  } catch {
    console.error(
      "[MatchingController] Failed to parse match event:",
      rawMessage,
    );
    return;
  }

  if (
    !event.pendingMatchId ||
    !Array.isArray(event.users) ||
    event.users.length !== 2 ||
    !event.topic ||
    !event.difficulty ||
    !event.language ||
    typeof event.createdAt !== "number"
  ) {
    console.error(
      "[MatchingController] Invalid pending match event payload:",
      rawMessage,
    );
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

  // Stores the pending match info into pending.matches Redis hash and creates user -> pending match mappings in users.pending.match hash
  // Notifies both users of the pending match via their WS connections.
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
    console.error(
      `Failed to create pending match state for ${event.pendingMatchId}`,
    );
    return;
  }

  // Send match pending WS msg to users and wait for them to accept
  for (const userId of event.users) {
    await redis.hdel(QUEUED_USERS_KEY, userId);
    const ws = wsConnectionStore.get(userId);
    pushToWs(ws, { type: "match_pending", pendingMatch: event });
  }

  console.log(
    `Pending match delivered: ${event.users[0]} and ${event.users[1]} with id ${event.pendingMatchId}`,
  );
}

async function removeUserPendingMappingsByPendingMatchId(
  pendingMatchId: string,
) {
  const userMappings = await redis.hgetall(USER_PENDING_MATCH_KEY);
  const usersToClear = Object.entries(userMappings)
    .filter(
      ([, mappedPendingMatchId]) => mappedPendingMatchId === pendingMatchId,
    )
    .map(([userId]) => userId);

  if (usersToClear.length > 0) {
    await redis.hdel(USER_PENDING_MATCH_KEY, ...usersToClear);
  }
}

async function cleanupTimedOutPendingMatches(now: number) {
  const pendingMatches = await redis.hgetall(PENDING_MATCHES_KEY);

  for (const [pendingMatchId, rawPendingState] of Object.entries(
    pendingMatches,
  )) {
    const pendingState = parsePendingMatchState(rawPendingState);
    if (!pendingState) {
      await redis.hdel(PENDING_MATCHES_KEY, pendingMatchId);
      await removeUserPendingMappingsByPendingMatchId(pendingMatchId);
      console.error(
        `Invalid pending match state for ${pendingMatchId}; removed stale state`,
      );
      continue;
    }

    if (now - pendingState.createdAt < PENDING_ACCEPT_TIMEOUT_MS) {
      continue;
    }

    const expireResult = (await redis.eval(
      LUA_EXPIRE_PENDING_MATCH_IF_UNCHANGED,
      2,
      PENDING_MATCHES_KEY,
      USER_PENDING_MATCH_KEY,
      pendingMatchId,
      rawPendingState,
    )) as number;

    if (expireResult !== 1) {
      continue;
    }

    for (const pendingUserId of [pendingState.user1Id, pendingState.user2Id]) {
      const ws = wsConnectionStore.get(pendingUserId);
      pushToWs(ws, { type: "pending_accept_timeout" });
      removeWsConnection(pendingUserId);
    }

    console.log(
      `Pending match ${pendingMatchId} timed out and users ${pendingState.user1Id}, ${pendingState.user2Id} were disconnected`,
    );
  }
}

export async function reconcilePendingMatches() {
  const deletedCount = await redis.del(
    PENDING_MATCHES_KEY,
    USER_PENDING_MATCH_KEY,
  );
  if (deletedCount > 0) {
    console.log(
      `[Startup] Cleared stale pending match state keys (${deletedCount} keys removed)`,
    );
  }
}

/** ─────────────────────────────────────
 *  Match Acceptance and Match Creation Logic (Post-Match)
 *  ─────────────────────────────────────
 */

export async function handleAcceptMatch(
  userId: string,
  pendingMatchId: string,
) {
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
    pushToWs(ws, {
      type: "error",
      message: "No pending match found for this user.",
    });
    return;
  }

  if (acceptResult === -1) {
    const ws = wsConnectionStore.get(userId);
    pushToWs(ws, { type: "error", message: "Pending match ID mismatch." });
    return;
  }

  if (acceptResult === -2) {
    const ws = wsConnectionStore.get(userId);
    pushToWs(ws, {
      type: "error",
      message: "User is not part of this pending match.",
    });
    return;
  }

  if (acceptResult === 1) {
    console.log(
      `User ${userId} accepted pending match ${pendingMatchId}; waiting for peer.`,
    );
    return;
  }

  const rawPendingState = await redis.hget(PENDING_MATCHES_KEY, pendingMatchId);
  if (!rawPendingState) {
    console.error(
      `Pending match ${pendingMatchId} disappeared before finalization`,
    );
    return;
  }

  const pendingState = parsePendingMatchState(rawPendingState);
  if (!pendingState) {
    await redis.hdel(PENDING_MATCHES_KEY, pendingMatchId);
    await redis.hdel(USER_PENDING_MATCH_KEY, userId);
    console.error(
      `Invalid pending match state for ${pendingMatchId}; removed stale state`,
    );
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
    console.log(
      `Skipped finalization for pending match ${pendingMatchId}; state changed`,
    );
    return;
  }

  const match = await createRoomForAcceptedMatch(pendingState);

  for (const matchedUserId of match.users) {
    const ws = wsConnectionStore.get(matchedUserId);
    pushToWs(ws, { type: "match_confirmed", match });
    removeWsConnection(matchedUserId);
  }

  console.log(
    `Pending match ${pendingMatchId} confirmed for ${match.users[0]} and ${match.users[1]} into room ${match.roomId}`,
  );
}

async function createRoomForAcceptedMatch(
  state: PendingMatchState,
): Promise<Match> {
  const roomId = randomUUID();

  // initialUserIds is for tracking which users were part of the match at the time of room creation
  // participantUserIds is for tracking the current users in the room
  // both uses username instead of userId even though it is named userId
  await collabRedis.hset(`room:${roomId}`, {
    programmingLanguage: state.language,
    questionTopic: state.topic,
    questionDifficulty: state.difficulty,
    initialUserIds: JSON.stringify([state.user1Id, state.user2Id]),
    participantUserIds: JSON.stringify([state.user1Id, state.user2Id]),
  });

  // username : roomId mapping
  await collabRedis.hset(COLLAB_USER_ROOM_MAP_KEY, {
    [state.user1Id]: roomId,
    [state.user2Id]: roomId,
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

/** ─────────────────────────────────────
 *  Match Cleanup Logic
 *  ─────────────────────────────────────
 */

function removeWsConnection(userId: string) {
  const ws = wsConnectionStore.get(userId);
  wsConnectionStore.delete(userId);
  ws?.close();
}