import { randomUUID } from "crypto";
import { collabRedis } from "../redis/collabRedisClient";
import { redis } from "../redis/redisClient";
import { ACTIVE_QUEUES_KEY, QUEUED_USERS_KEY } from "../redis/redisKeys";
import { DIFFICULTIES, Difficulty, Language, LANGUAGES, Topic, TOPICS } from "../types";
import { toQueueKey } from "../utils";
const RELAXED_MATCH_WAIT_MS = 20 * 1000;

const DIFFICULTY_RANK: Record<Difficulty, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};

const LUA_POLL_QUEUES = `
  local activeQueues = redis.call('SMEMBERS', KEYS[1])
  for i, queueKey in ipairs(activeQueues) do
    if redis.call('LLEN', queueKey) >= 2 then
      return queueKey
    end
  end
  return nil
`;

const LUA_DEQUEUE_PAIR = `
  if redis.call('LLEN', KEYS[1]) >= 2 then
    local user1 = redis.call('LPOP', KEYS[1])
    local user2 = redis.call('LPOP', KEYS[1])
    if redis.call('LLEN', KEYS[1]) == 0 then
      redis.call('SREM', KEYS[2], KEYS[1])
    end
    return {user1, user2}
  else
    return nil
  end
`;

const LUA_DEQUEUE_RELAXED_PAIR = `
  if KEYS[1] == KEYS[2] then
    return nil
  end

  if redis.call('LLEN', KEYS[1]) < 1 or redis.call('LLEN', KEYS[2]) < 1 then
    return nil
  end

  local user1 = redis.call('LINDEX', KEYS[1], 0)
  local user2 = redis.call('LINDEX', KEYS[2], 0)
  if not user1 or not user2 then
    return nil
  end

  local state1Raw = redis.call('HGET', KEYS[3], user1)
  local state2Raw = redis.call('HGET', KEYS[3], user2)
  if not state1Raw or not state2Raw then
    return nil
  end

  local ok1, state1 = pcall(cjson.decode, state1Raw)
  local ok2, state2 = pcall(cjson.decode, state2Raw)
  if not ok1 or not ok2 then
    return nil
  end

  if type(state1.enqueuedAt) ~= 'number' or type(state2.enqueuedAt) ~= 'number' then
    return nil
  end

  if state1.queueKey ~= KEYS[1] or state2.queueKey ~= KEYS[2] then
    return nil
  end

  local nowMs = tonumber(ARGV[1])
  local waitMs = tonumber(ARGV[2])
  local waited1 = (nowMs - state1.enqueuedAt) >= waitMs
  local waited2 = (nowMs - state2.enqueuedAt) >= waitMs
  if not waited1 and not waited2 then
    return nil
  end

  local popped1 = redis.call('LPOP', KEYS[1])
  local popped2 = redis.call('LPOP', KEYS[2])
  if not popped1 or not popped2 then
    return nil
  end

  if redis.call('LLEN', KEYS[1]) == 0 then
    redis.call('SREM', KEYS[4], KEYS[1])
  end
  if redis.call('LLEN', KEYS[2]) == 0 then
    redis.call('SREM', KEYS[4], KEYS[2])
  end

  return {popped1, popped2}
`;

type ParsedQueueKey = {
  queueKey: string;
  topic: Topic;
  difficulty: Difficulty;
  language: Language;
};

function isTopic(value: string): value is Topic {
  return (TOPICS as readonly string[]).includes(value);
}

function isDifficulty(value: string): value is Difficulty {
  return (DIFFICULTIES as readonly string[]).includes(value);
}

function isLanguage(value: string): value is Language {
  return (LANGUAGES as readonly string[]).includes(value);
}

function parseQueueKey(queueKey: string): ParsedQueueKey | null {
  const [topic, difficulty, language] = queueKey.split(":");
  if (!topic || !difficulty || !language) {
    return null;
  }

  if (!isTopic(topic) || !isDifficulty(difficulty) || !isLanguage(language)) {
    return null;
  }

  return { queueKey, topic, difficulty, language };
}

function getAdjacentDifficulties(difficulty: Difficulty): Difficulty[] {
  if (difficulty === "easy") return ["medium"];
  if (difficulty === "hard") return ["medium"];
  return ["easy", "hard"];
}

function lowerDifficulty(first: Difficulty, second: Difficulty): Difficulty {
  return DIFFICULTY_RANK[first] <= DIFFICULTY_RANK[second] ? first : second;
}

async function publishMatchAndCreateRoom(
  user1Id: string,
  user2Id: string,
  topic: Topic,
  difficulty: Difficulty,
  language: Language,
): Promise<void> {
  const roomId = randomUUID();

  try {
    await collabRedis.hset(`room:${roomId}`, {
      programmingLanguage: language,
      questionTopic: topic,
      questionDifficulty: difficulty,
      participantUserIds: JSON.stringify([user1Id, user2Id]),
    });
    console.log(`Room ${roomId} created in collab Redis`);
  } catch (err) {
    console.error(`Failed to create room ${roomId} in collab Redis:`, err);
  }

  const matchEvent = JSON.stringify({
    users: [user1Id, user2Id],
    roomId,
    topic,
    difficulty,
    language,
    createdAt: Date.now(),
  });

  console.log(`Publishing match event: ${matchEvent}`);
  await redis.publish("match.events", matchEvent);
  console.log(`Matched ${user1Id} and ${user2Id} into room ${roomId}`);
}

async function tryRelaxedMatch(): Promise<boolean> {
  const activeQueuesRaw = (await redis.smembers(ACTIVE_QUEUES_KEY)) as string[];
  const parsedQueues = activeQueuesRaw
    .map((queueKey) => parseQueueKey(queueKey))
    .filter((queue): queue is ParsedQueueKey => queue !== null);

  const queuesByTopicLanguage = new Map<string, Map<Difficulty, ParsedQueueKey>>();
  for (const queue of parsedQueues) {
    const groupKey = `${queue.topic}:${queue.language}`;
    let byDifficulty = queuesByTopicLanguage.get(groupKey);
    if (!byDifficulty) {
      byDifficulty = new Map<Difficulty, ParsedQueueKey>();
      queuesByTopicLanguage.set(groupKey, byDifficulty);
    }
    byDifficulty.set(queue.difficulty, queue);
  }

  for (const [, byDifficulty] of queuesByTopicLanguage) {
    for (const [difficulty, sourceQueue] of byDifficulty) {
      const adjacentDifficulties = getAdjacentDifficulties(difficulty);
      for (const adjacentDifficulty of adjacentDifficulties) {
        const adjacentQueue = byDifficulty.get(adjacentDifficulty);
        if (!adjacentQueue) {
          continue;
        }

        if (
          DIFFICULTY_RANK[sourceQueue.difficulty] >
          DIFFICULTY_RANK[adjacentQueue.difficulty]
        ) {
          continue;
        }

        const result = (await redis.eval(
          LUA_DEQUEUE_RELAXED_PAIR,
          4,
          sourceQueue.queueKey,
          adjacentQueue.queueKey,
          QUEUED_USERS_KEY,
          ACTIVE_QUEUES_KEY,
          Date.now(),
          RELAXED_MATCH_WAIT_MS,
        )) as [string, string] | null;

        if (!result) {
          continue;
        }

        const [user1Id, user2Id] = result;
        const eventDifficulty = lowerDifficulty(
          sourceQueue.difficulty,
          adjacentQueue.difficulty,
        );
        await publishMatchAndCreateRoom(
          user1Id,
          user2Id,
          sourceQueue.topic,
          eventDifficulty,
          sourceQueue.language,
        );
        return true;
      }
    }
  }

  return false;
}

async function pollAllQueues() {
  const queueKey = (await redis.eval(
    LUA_POLL_QUEUES,
    1,
    ACTIVE_QUEUES_KEY,
  )) as string | null;

  if (typeof queueKey === "string" && queueKey.length > 0) {
    const parsedQueue = parseQueueKey(queueKey);
    if (parsedQueue) {
      console.log(
        `Found active queue with 2+ users: ${queueKey}. Attempting exact match...`,
      );
      const matched = await tryMatch(
        parsedQueue.topic,
        parsedQueue.difficulty,
        parsedQueue.language,
      );
      if (matched) {
        return;
      }
    }
  }

  await tryRelaxedMatch();
}

async function tryMatch(
  topic: Topic,
  difficulty: Difficulty,
  language: Language,
): Promise<boolean> {
  const queueKey = toQueueKey({ topic, difficulty, language });
  const result = (await redis.eval(
    LUA_DEQUEUE_PAIR,
    2, // number of KEYS
    queueKey, // KEYS[1]
    ACTIVE_QUEUES_KEY, // KEYS[2]
  )) as [string, string] | null;

  if (!result) return false;

  const [user1Id, user2Id] = result;
  await publishMatchAndCreateRoom(user1Id, user2Id, topic, difficulty, language);
  return true;
}

export { pollAllQueues };
