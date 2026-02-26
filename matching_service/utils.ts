import { QueueRequest, QueueKeyString } from "./types";

function toQueueKey(req: QueueRequest): QueueKeyString {
    return `${req.topic}-${req.difficulty}-${req.language}`;
}

export { toQueueKey };