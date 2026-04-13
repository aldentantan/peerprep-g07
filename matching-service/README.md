# PeerPrep - Matching Service

The Matching Service is a WebSocket API that manages real-time user pairing for collaborative coding sessions.

---

## Tech Stack

- **Runtime**: Node.js 20 (Express + TypeScript)
- **WebSocket**: `ws`
- **Data and Coordination**: Redis (`ioredis`) with Lua scripts and Redis Streams
- **Room State Storage**: Dedicated collaboration Redis instance
- **Containerisation**: Docker + Docker Compose
- **Module System**: TypeScript transpiled to CommonJS

---

## Project Structure

```
matching-service/
|-- Dockerfile
|-- index.ts
|-- package.json
|-- tsconfig.json
`-- src/
    |-- types.ts
    |-- utils.ts
    |-- controllers/
    |   `-- matchingController.ts
    |-- lua-scripts/
    |   `-- luaScripts.ts
    |-- matching-worker/
    |   `-- matchingWorker.ts
    |-- redis/
    |   |-- collabRedisClient.ts
    |   |-- redisClient.ts
    |   |-- redisKeys.ts
    |   `-- redisSubscriber.ts
    |-- routes/
    |   `-- matchingRoutes.ts
    `-- store/
        `-- matchingStore.ts
```

---

## Getting Started

### Prerequisites
- Docker Desktop
- Redis (primary queue Redis)
- Redis (collaboration room-state Redis)

### Run with Docker (from repo root)

```bash
docker compose up --build matching-service redis collab-redis
```

The service is ready when you see:

```text
Matching service listening on port 3002
```

### Run Locally (without Docker)

```bash
cd matching-service
npm install
npm run dev
```

For production build/start:

```bash
npm run build
npm start
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3002` | Port exposed by the matching service. |
| `REDIS_HOST` | `localhost` | Primary Redis host for queue and pending-match state. |
| `REDIS_PORT` | `6379` | Primary Redis port. |
| `COLLAB_REDIS_URL` | `redis://localhost:6379` | Collaboration Redis URL used for room creation and user-room mapping. |
| `HOSTNAME` | `matching-service` | Prefix used in Redis Stream consumer naming. |

### Docker Compose Wiring

In this repository, `docker-compose.yml` wires:
- `PORT` from `${MATCHING_SERVICE_PORT}`
- `REDIS_HOST` and `REDIS_PORT` from compose env
- `COLLAB_REDIS_URL=redis://collab-redis:6379`

---

## API Reference

### Base URL

```text
ws://localhost:3002
```

### Connect

| Protocol | Path | Auth |
|---|---|---|
| WS/WSS | `/?userId=<string>` | None at matching-service level |

`userId` is required and is used as:
- WebSocket connection identity
- Queue identity
- Pending-match user mapping key

### Handshake Rejection and Close Conditions

| Condition | Close Code | Reason |
|---|---|---|
| Missing or non-string `userId` | `1008` | `Missing or invalid userId` |
| User already exists in queued state hash | `1008` | `User already has an active matching request` |
| Redis queue-state validation failure | `1011` | `Queue state validation failed` |

---

## Message Protocol

All frames are JSON text frames.

### Inbound Messages (Client -> Matching Service)

### 1) Enqueue

```json
{
  "type": "enqueue",
  "topic": "arrays",
  "difficulty": "easy",
  "language": "javascript"
}
```

### 2) Cancel

```json
{
  "type": "cancel"
}
```

### 3) Accept Pending Match

```json
{
  "type": "accept_match",
  "pendingMatchId": "e0f2a6ab-9f3b-4f48-83a8-8f5f2a8c8aaf"
}
```

If `pendingMatchId` is missing, the service responds with an `error` message.

### Invalid or Unknown Client Messages

- Invalid JSON: `{"type":"error","message":"Invalid JSON"}`
- Unknown message type: `{"type":"error","message":"Unknown message type: <value>"}`

---

## Outbound Messages (Matching Service -> Client)

### 1) Queued

```json
{
  "type": "queued",
  "queueKey": "arrays:easy:javascript"
}
```

### 2) Match Pending

```json
{
  "type": "match_pending",
  "pendingMatch": {
    "pendingMatchId": "e0f2a6ab-9f3b-4f48-83a8-8f5f2a8c8aaf",
    "users": ["userA", "userB"],
    "topic": "arrays",
    "difficulty": "easy",
    "language": "javascript",
    "createdAt": 1710000000000
  }
}
```

### 3) Match Confirmed

```json
{
  "type": "match_confirmed",
  "match": {
    "roomId": "2c4aa74e-43d8-4cf6-9f89-b57d2892ca86",
    "users": ["userA", "userB"],
    "createdAt": 1710000005000,
    "topic": "arrays",
    "difficulty": "easy",
    "language": "javascript"
  }
}
```

### 4) Queue Timeout

```json
{
  "type": "timeout"
}
```

### 5) Pending Accept Timeout

```json
{
  "type": "pending_accept_timeout"
}
```

### 6) Cancelled

```json
{
  "type": "cancelled"
}
```

### 7) Error

```json
{
  "type": "error",
  "message": "User is already in a queue."
}
```

Note: `matched` exists in the TypeScript outbound union type but is not emitted in the current controller flow. The active success flow emits `match_pending` and `match_confirmed`.

---

## Valid Values

### Topics

`arrays`, `graphs`, `dynamic-programming`, `strings`, `algorithms`, `data-structures`, `mathematics`, `bit-manipulation`, `brainteaser`, `databases`, `hash-table`, `recursion`

### Difficulties

`easy`, `medium`, `hard`

### Languages

`javascript`, `python`, `java`, `cpp`, `typescript`, `go`, `ruby`, `csharp`

---

## Connection and Matching Lifecycle

1. Client opens WebSocket with `userId` query parameter.
2. Client sends `enqueue`.
3. Service atomically enqueues the user and replies `queued`.
4. Background matching worker looks for candidates.
5. When paired, service emits `match_pending` to both users.
6. Each client sends `accept_match` with `pendingMatchId`.
7. After both users accept:
   - pending state is atomically finalized
   - room state is created in collaboration Redis
   - both clients receive `match_confirmed`
   - both sockets are closed by the server

Other paths:
- If queue wait exceeds timeout: client receives `timeout` and socket is closed.
- If pending acceptance expires: both users receive `pending_accept_timeout` and sockets are closed.
- If user disconnects while queued: server attempts cancel cleanup.

---

## Timing and Matching Behavior

- Queue poll interval: every 7500 ms
- Queue timeout cleanup interval: every 2000 ms
- Queue timeout threshold: 30000 ms (testing value)
- Pending acceptance timeout threshold: 20000 ms

### Matching Strategy

1. Exact match first:
   - Uses active queue keys
   - Picks queue with at least 2 users
   - Atomically dequeues 2 users and emits a pending-match stream event

2. Relaxed match fallback:
   - Grouped by topic + language
   - Pairs `medium` with adjacent `easy` or `hard`
   - Only attempts when at least one of the two front users has waited at least 20000 ms
   - Emits event difficulty as the lower of the two paired difficulties

---

## Redis Data Model

### Primary Redis

| Key | Type | Purpose |
|---|---|---|
| `active.queues` | Set | Queue keys that currently have users. |
| `users.inqueue` | Hash | `userId -> { enqueuedAt, queueKey }` JSON state. |
| `<topic>:<difficulty>:<language>` | List | Queue entries (`userId`) per dimension. |
| `pending.matches` | Hash | `pendingMatchId -> pending match state` JSON. |
| `users.pending.match` | Hash | `userId -> pendingMatchId` mapping. |
| `match.events.stream` | Stream | Pending-match events produced by matching worker. |
| `match.events.group` | Consumer Group | Stream consumer group for pending-match processing. |

### Collaboration Redis

| Key | Type | Purpose |
|---|---|---|
| `room:<roomId>` | Hash | Room metadata and participant sets. |
| `collab.users.room` | Hash | `userId -> roomId` mapping. |

---

## Startup Behavior

On service startup:
1. Pending-match keys are reconciled by clearing stale pending state.
2. Redis Stream consumer group is created if missing.
3. Background loops are started:
   - queue polling
   - timeout cleanup
   - stream subscriber loop for pending-match events

---

## Testing the API

You can test using any WebSocket client (browser, Postman, `wscat`, etc.).

### Example Flow

1. Connect two users:

```text
ws://localhost:3002/?userId=userA
ws://localhost:3002/?userId=userB
```

2. Enqueue both users with same dimension:

```json
{ "type": "enqueue", "topic": "arrays", "difficulty": "easy", "language": "javascript" }
```

3. Both users receive `match_pending`:

```json
{
  "type": "match_pending",
  "pendingMatch": {
    "pendingMatchId": "...",
    "users": ["userA", "userB"],
    "topic": "arrays",
    "difficulty": "easy",
    "language": "javascript",
    "createdAt": 1710000000000
  }
}
```

4. Both users send acceptance:

```json
{ "type": "accept_match", "pendingMatchId": "..." }
```

5. Both users receive `match_confirmed`.

---

## Integration Notes

- Matching service does not validate auth tokens at handshake. Identity and auth must be enforced upstream (for example, API gateway).
- One active queued state per user is enforced atomically.
- Queue and timeout operations rely on Lua scripts to reduce race conditions.
- Gateway/client should implement reconnect behavior for expected close events.
