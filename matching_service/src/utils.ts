import { Topic, Difficulty, Language, QueueKeyString } from "./types";

function toQueueKey(req: { topic: Topic; difficulty: Difficulty; language: Language }): QueueKeyString {
    return `${req.topic}-${req.difficulty}-${req.language}`;
}

export { toQueueKey };