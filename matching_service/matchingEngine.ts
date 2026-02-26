import { randomUUID } from "crypto";
import { queueMap, userStateMap } from "./inMemoryStore";
import {
  EnqueueResult,
  Match,
  QueueEntry,
  QueueKeyString,
  QueueRequest,
  UserStateResponse,
} from "./types";
import { toQueueKey } from "./utils";

// const TIMEOUT_MS = 2 * 60 * 1000; // 2 mins timeout
const TIMEOUT_MS = 10 * 1000; // 10 seconds timeout for testing purposes
const STALE_TTL_MS = 1 * 60 * 1000; // 1 mins before terminal state entries are purged

function enqueue(req: QueueRequest): EnqueueResult {
  const queueKey = toQueueKey(req);
  const queue = queueMap.get(queueKey);

  // Check if the user is already enqueued in any queue to prevent duplicate enqueueing
  if (!canUserQueue(req.userId)) {
    return { status: "error", message: "User is already in a queue or a match." };
  }

  const enqueuedAt = Date.now();
  if (!queue) {
    queueMap.set(queueKey, [{ userId: req.userId, enqueuedAt }]);
  } else {
    queue.push({ userId: req.userId, enqueuedAt });
  }

  // Update user state to indicate they are in a queue
  userStateMap.set(req.userId, {
    queueKey,
    enqueuedAt,
    state: "queued",
  });

  // Attempt to match 2 users after enqueueing the new user
  if (canMatch(queueKey)) {
    const match = createMatch(req);
    if (match) return { status: "matched", match };
  }

  return { status: "queued", queueKey };
}

function dequeue(queueKey: QueueKeyString): QueueEntry | null {
  const queue = queueMap.get(queueKey);
  if (!queue || queue.length === 0) {
    return null;
  }
  const matchedUser = queue.shift();
  if (queue.length === 0) {
    queueMap.delete(queueKey);
  }
  return matchedUser || null;
}

function canMatch(queueKey: QueueKeyString) {
  const queue = queueMap.get(queueKey);
  return !!queue && queue.length >= 2;
}

function createMatch(req: QueueRequest): Match | null {
  const queueKey = toQueueKey(req);
  const queue = queueMap.get(queueKey);
  if (!queue || queue.length < 2) return null;

  const firstEntry = queue[0];
  const secondEntry = queue[1];
  const firstUserState = userStateMap.get(firstEntry.userId);
  const secondUserState = userStateMap.get(secondEntry.userId);
  if (!firstUserState || !secondUserState) return null;

  const firstUser = dequeue(queueKey)!;
  const secondUser = dequeue(queueKey)!;

  const match: Match = {
    matchId: randomUUID(),
    users: [firstUser.userId, secondUser.userId],
    createdAt: Date.now(),
    topic: req.topic,
    difficulty: req.difficulty,
    language: req.language,
  };

  // Replace user states atomically with "matched" state and match object
  userStateMap.set(firstUser.userId, {
    ...firstUserState,
    state: "matched",
    match,
  });
  userStateMap.set(secondUser.userId, {
    ...secondUserState,
    state: "matched",
    match,
  });

  return match;
}

function getUserState(userId: string): UserStateResponse | null {
  const userStateInfo = userStateMap.get(userId);
  if (!userStateInfo) return null;

  if (userStateInfo.state === "timeout") {
    return { state: userStateInfo.state };
  }
  if (userStateInfo.state === "matched") {
    return {
      state: userStateInfo.state,
      match: userStateInfo.match,
    };
  }

  // state === "queued"
  const queue = queueMap.get(userStateInfo.queueKey);
  const elapsedMs = Date.now() - userStateInfo.enqueuedAt;
  return {
    state: userStateInfo.state,
    queueKey: userStateInfo.queueKey,
    elapsedMs,
    queueLength: queue?.length ?? 0,
  };
}

function canUserQueue(userId: string) {
  const userState = userStateMap.get(userId);
  // Allow queuing if no state exists, or if the previous attempt timed out
  return userState === undefined || userState.state === "timeout";
}

// TODO: Figure out how to send response to frontend to handle user navigation on timeout
function cleanupTimedOutUsers() {
  const now = Date.now();

  for (const [userId, stateInfo] of userStateMap.entries()) {
    // Purge stale terminal-state entries to prevent unbounded map growth
    if (stateInfo.state !== "queued") {
      if (now - stateInfo.enqueuedAt >= STALE_TTL_MS) {
        userStateMap.delete(userId);
      }
      continue;
    }

    // Remove queued user from queue after 2 mins and mark as timed out
    if (now - stateInfo.enqueuedAt >= TIMEOUT_MS) {
      const queue = queueMap.get(stateInfo.queueKey);
      if (queue) {
        const idx = queue.findIndex((u) => u.userId === userId);
        if (idx !== -1) queue.splice(idx, 1);
        if (queue.length === 0) queueMap.delete(stateInfo.queueKey);
      }
      userStateMap.set(userId, { ...stateInfo, state: "timeout" });
      console.log(
        `User ${userId} has timed out after ${TIMEOUT_MS}ms and has been removed from queue ${stateInfo.queueKey}`,
      );
    }
  }
}

function cancelMatchRequest(userId: string) {
  const userState = userStateMap.get(userId);
  if (!userState || userState.state !== "queued") {
    throw new Error(`User ${userId} is not queued`);
  }

  const queue = queueMap.get(userState.queueKey);
  if (queue) {
    const idx = queue.findIndex((u) => u.userId === userId);
    if (idx !== -1) queue.splice(idx, 1);
    if (queue.length === 0) queueMap.delete(userState.queueKey);
  }
  userStateMap.delete(userId);
}

export { cancelMatchRequest, cleanupTimedOutUsers, enqueue, getUserState };

