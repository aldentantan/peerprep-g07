import { Request, Response, Router } from "express";
import { cancelMatchRequest, enqueue, getUserState } from "../matchingEngine";
import { QueueRequestSchema, UserIdRequestSchema } from "../validators/match.schema";

const router = Router();

// POST /match/queue - Enqueue a user into the matching queue
router.post("/queue", (req: Request, res: Response) => {
    const parsed = QueueRequestSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Invalid request body", details: parsed.error });
        return;
    }

    const result = enqueue({
        ...parsed.data,
    });

    if (result.status === "error") {
        res.status(409).json({ error: result.message });
        return;
    }

    if (result.status === "matched") {
        res.status(200).json({ status: "matched", match: result.match });
        return;
    }

    res.status(200).json({ status: "queued", queueKey: result.queueKey });
});

// POST /match/cancel - Cancel a user's match request
router.post("/cancel", (req: Request<{ userId: string }>, res: Response) => {
    const parsed = UserIdRequestSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Invalid userId parameter", details: parsed.error });
        return;
    }

    try {
        cancelMatchRequest(parsed.data.userId);
        res.status(200).json({ message: "Match request cancelled successfully" });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// GET /match/:userId - Get the queue/match status of a user
router.get("/:userId", (req: Request<{ userId: string }>, res: Response) => {
    const parsed = UserIdRequestSchema.safeParse(req.params);
    if (!parsed.success) {
        res.status(400).json({ error: "Invalid userId parameter", details: parsed.error });
        return;
    }

    const userState = getUserState(parsed.data.userId);
    if (!userState) {
        res.status(404).json({ error: "User not found in any queue" });
        return;
    }

    res.status(200).json(userState);
});

router.get("/", (req: Request, res: Response) => {
    res.status(200).json({ message: "Matching service is up and running!" });
});

export default router;
