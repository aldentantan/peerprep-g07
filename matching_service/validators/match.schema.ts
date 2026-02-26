import { z } from "zod";
import { TOPICS, DIFFICULTIES, LANGUAGES } from "../types";

export const QueueRequestSchema = z.object({
    userId: z.string().min(1),
    topic: z.enum(TOPICS),
    difficulty: z.enum(DIFFICULTIES),
    language: z.enum(LANGUAGES),
});

export const UserIdRequestSchema = z.object({
    userId: z.string().min(1),
})