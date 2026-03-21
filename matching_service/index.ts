import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import matchingRoutes from "./routes/matchingRoutes";
import { abandonMatch, cleanupTimedOutUsers, clearUserState, enqueue, cancelMatchRequest } from "./matchingEngine";
import { QueueRequestSchema } from "./validators/match.schema";

const app = express();
const PORT = process.env.MATCHING_SERVICE_PORT || 3002;

app.use(express.json());
app.use("/match", matchingRoutes);

const server = createServer(app);
const wss = new WebSocketServer({ server });

// Map userId -> WebSocket for pushing match/timeout results
const clientMap = new Map<string, WebSocket>();

export function getClientMap() {
  return clientMap;
}

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "", `http://localhost:${PORT}`);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    ws.send(JSON.stringify({ type: "error", message: "Missing userId query param" }));
    ws.close();
    return;
  }

  // If this user already has an open connection, close the old one and clean up
  const existingWs = clientMap.get(userId);
  if (existingWs && existingWs.readyState <= WebSocket.OPEN) {
    existingWs.close();
  }
  clearUserState(userId);

  clientMap.set(userId, ws);
  console.log(`[WS] connected: ${userId}`);

  ws.on("message", (raw) => {
    let msg: unknown;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    const data = msg as Record<string, unknown>;

    if (data.type === "enqueue") {
      const parsed = QueueRequestSchema.safeParse({
        userId,
        topic: data.topic,
        difficulty: data.difficulty,
        language: data.language,
      });

      if (!parsed.success) {
        ws.send(JSON.stringify({ type: "error", message: "Invalid enqueue payload", details: parsed.error.flatten() }));
        return;
      }

      const result = enqueue(parsed.data);

      if (result.status === "error") {
        ws.send(JSON.stringify({ type: "error", message: result.message }));
      } else if (result.status === "matched") {
        // Notify both matched users
        for (const uid of result.match.users) {
          const client = clientMap.get(uid);
          if (client && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "matched", match: result.match }));
          }
        }
      } else {
        ws.send(JSON.stringify({ type: "queued", queueKey: result.queueKey }));
      }
    } else if (data.type === "cancel") {
      try {
        cancelMatchRequest(userId);
        ws.send(JSON.stringify({ type: "cancelled" }));
      } catch {
        // No message if user was not queued, per spec
      }
    } else if (data.type === "abandon") {
      const partnerId = abandonMatch(userId);
      ws.send(JSON.stringify({ type: "abandoned" }));
      if (partnerId) {
        const partnerWs = clientMap.get(partnerId);
        if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
          partnerWs.send(JSON.stringify({ type: "match_abandoned" }));
        }
      }
    } else {
      ws.send(JSON.stringify({ type: "error", message: `Unknown message type: ${data.type}` }));
    }
  });

  ws.on("close", () => {
    // Only remove from clientMap if this socket is still the active one
    // (a newer connection may have already replaced it)
    if (clientMap.get(userId) === ws) {
      clientMap.delete(userId);
      clearUserState(userId);
    }
    console.log(`[WS] disconnected: ${userId}`);
  });
});

server.listen(PORT, () => {
  console.log(`Matching service running on port ${PORT}`);
});

// Poll to clean up timed-out users and notify them via WS
setInterval(() => {
  const timedOutUserIds = cleanupTimedOutUsers();
  for (const userId of timedOutUserIds) {
    const client = clientMap.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "timeout" }));
    }
  }
}, 1000);

export default app;
