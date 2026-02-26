import { QueueEntry, QueueKeyString, Match } from "./types";

type BaseState = { enqueuedAt: number; queueKey: QueueKeyString };
export type UserState =
  | (BaseState & { state: "queued" })
  | (BaseState & { state: "matched"; match: Match })
  | (BaseState & { state: "timeout" });

export const queueMap = new Map<string, QueueEntry[]>();

export const userStateMap = new Map<string, UserState>();