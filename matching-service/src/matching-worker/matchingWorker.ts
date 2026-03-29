import { TOPICS, DIFFICULTIES, LANGUAGES } from "../types";
import { toQueueKey } from "../utils";
import { randomUUID } from 'crypto';
import { redis } from "../redis/redisClient";
import { collabRedis } from "../redis/collabRedisClient";
import { Topic, Difficulty, Language } from "../types";

const QUESTION_SERVICE_URL = process.env.QUESTION_SERVICE_URL || 'http://localhost:3001';

// TODO: Create a set of active queue keys in Redis and iterate through and poll only active queue keys
function pollAllQueues() {
  for (const topic of TOPICS) {
    for (const difficulty of DIFFICULTIES) {
      for (const language of LANGUAGES) {
        tryMatch(topic, difficulty, language).catch(console.error);
      }
    }
  }
}

const LUA_DEQUEUE_PAIR = `
  if redis.call('LLEN', KEYS[1]) >= 2 then
    local user1 = redis.call('LPOP', KEYS[1])
    local user2 = redis.call('LPOP', KEYS[1])
    return {user1, user2}
  else
    return nil
  end
`;

async function tryMatch(topic: Topic, difficulty: Difficulty, language: Language) {
  const queueKey = toQueueKey({ topic, difficulty, language });
  const result = (await redis.eval(
    LUA_DEQUEUE_PAIR,
    1, // number of KEYS
    queueKey, // KEYS[1]
  )) as [string, string] | null;

  if (!result) return;

  const [user1Id, user2Id] = result;
  const roomId = randomUUID();

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

  // Create room data in collab Redis so collaboration service can serve it
  try {
    // Fetch a random question matching the topic and difficulty
    const capDifficulty = difficulty.charAt(0).toUpperCase() + difficulty.slice(1); // "easy" -> "Easy"
    const res = await fetch(
      `${QUESTION_SERVICE_URL}/questions?topics=${encodeURIComponent(topic)}&difficulty=${encodeURIComponent(capDifficulty)}`
    );
    let questionText = `Solve a ${difficulty} ${topic} problem.`;
    if (res.ok) {
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        const pick = data.questions[Math.floor(Math.random() * data.questions.length)];
        questionText = `${pick.title}\n\n${pick.description}`;
      }
    }

    await collabRedis.hset(`room:${roomId}`, {
      question: questionText,
      programmingLanguage: language,
      questionTopic: topic,
      questionDifficulty: difficulty,
      participantUserIds: JSON.stringify([user1Id, user2Id]),
    });
    console.log(`Room ${roomId} created in collab Redis`);
  } catch (err) {
    console.error(`Failed to create room ${roomId} in collab Redis:`, err);
  }
}

export { pollAllQueues };