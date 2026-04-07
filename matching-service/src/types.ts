export const TOPICS = ["arrays", "graphs", "dynamic-programming", "strings", "algorithms", "data-structures", "mathematics", "bit-manipulation", "brainteaser", "databases", "hash-table", "recursion"] as const;
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const LANGUAGES = ["javascript", "python", "java", "cpp", "typescript", "go", "ruby", "csharp"] as const;

export type Topic = typeof TOPICS[number];
export type Difficulty = typeof DIFFICULTIES[number];
export type Language = typeof LANGUAGES[number];
export type QueueKeyString = `${Topic}:${Difficulty}:${Language}`;

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

export type PendingMatch = {
  pendingMatchId: string;
  users: [string, string];
  createdAt: number;
  topic: Topic;
  difficulty: Difficulty;
  language: Language;
};

export type InboundMessage =
 | { type: "enqueue"; topic: Topic; difficulty: Difficulty; language: Language; }
 | { type: "cancel"; }
 | { type: "accept_match"; pendingMatchId: string; };

 export type OutboundMessage =
 | { type: "queued"; queueKey: QueueKeyString }
 | { type: "matched"; match: Match }
 | { type: "match_pending"; pendingMatch: PendingMatch }
 | { type: "match_confirmed"; match: Match }
 | { type: "pending_accept_timeout" }
 | { type: "timeout" }
 | { type: "cancelled" }
 | { type: "error"; message: string };