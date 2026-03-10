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
  roomId: string;
  users: [string, string];
  createdAt: number;
  topic: Topic;
  difficulty: Difficulty;
  language: Language;
};

export type InboundMessage =
 | { type: "enqueue"; topic: Topic; difficulty: Difficulty; language: Language; }
 | { type: "cancel"; };

 export type OutboundMessage =
 | { type: "queued"; queueKey: QueueKeyString }
 | { type: "matched"; match: Match }
 | { type: "timeout" }
 | { type: "cancelled" }
 | { type: "error"; message: string };