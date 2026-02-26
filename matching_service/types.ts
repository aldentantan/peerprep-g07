export const TOPICS = ["arrays", "linked-lists", "trees", "graphs", "dynamic-programming"] as const;
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const LANGUAGES = ["javascript", "python", "java", "cpp"] as const;

export type Topic = typeof TOPICS[number];
export type Difficulty = typeof DIFFICULTIES[number];
export type Language = typeof LANGUAGES[number];
export type QueueKeyString = `${Topic}-${Difficulty}-${Language}`;

export type QueueEntry = {
    userId: string;
    enqueuedAt: number;
}

export type QueueRequest = {
    userId: string;
    topic: Topic;
    difficulty: Difficulty;
    language: Language;
}

export type Match = {
  matchId: string;
  users: [string, string];
  createdAt: number;
  topic: Topic;
  difficulty: Difficulty;
  language: Language;
};

export type EnqueueResult =
| { status: "queued"; queueKey: string }
| { status: "matched"; match: Match }
| { status: "error"; message: string };

export type UserStateResponse =
  | { state: "queued"; queueKey: string; elapsedMs: number; queueLength: number }
  | { state: "matched"; match: Match }
  | { state: "timeout" };