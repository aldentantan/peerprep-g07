# Collaboration Service

This service powers collaborative coding sessions for PeerPrep.

It provides:
- HTTP APIs for resolving and loading collaboration rooms.
- WebSocket channels for chat and collaborative editor sync.
- Redis-backed room state, chat history, user-room mapping, and Yjs update persistence.

## What This Service Does

At a high level:
- Matching service creates a room and seeds initial room metadata in Redis.
- Collaboration service serves room metadata and chat history over HTTP.
- Collaboration service hosts WebSocket endpoints for chat presence/messages and Yjs document updates.
- API gateway authenticates users and proxies collaboration-service routes to clients.

## Responsibilities and Boundaries

This service is responsible for:
- Room lookup by username.
- Room payload assembly and lazy question initialization.
- Chat event fanout and persistence.
- Yjs binary update fanout and persistence.
- Participant tracking and delayed room cleanup.

Auth is enforced at API gateway level (`verifyToken`) before requests reach this service.

## Tech Stack

- Node.js (CommonJS)
- Express 5
- ws (WebSocket server)
- Redis 7

## Directory Structure

```text
collaboration-service/
  src/
    index.js
    api/
      createApiServer.js
    websocket/
      createYjsServer.js
    redis/
      client.js
  Dockerfile
  package.json
```

## Runtime Ports

From current code:
- HTTP API port: `3003`
- WebSocket port: `8081`

## Environment Variables

Used directly by this service:
- `REDIS_URL` 
- `QUESTION_SERVICE_URL` 

Set in compose for this service:
- `PORT`
- `REDIS_URL`
- `QUESTION_SERVICE_URL`

## How To Run

### Local (without Docker)

1. Install dependencies.
2. Ensure Redis is running and reachable.
3. Start the service.

```bash
cd collaboration-service
npm install
node src/index.js
```

Quick syntax/build check:

```bash
npm run build
```

### Docker Compose (project root)

```bash
docker compose up -d --build collaboration-service collab-redis
```

Default compose mapping in this repo:
- API is exposed as `${COLLAB_SERVICE_PORT}:${COLLAB_SERVICE_PORT}`
- WS is exposed as `${COLLAB_YJS_WS_PORT}:8081`

## HTTP API Contract

Base URL (internal): `http://collaboration-service:3003`

### 1) Get room by username

`GET /room/by-user/:username`

Behavior:
- Reads mapping from Redis hash `collab.users.room`.
- Returns `404` if mapping does not exist.
- If mapping exists but room hash is missing, it removes stale mapping and returns `404`.

Success response:

```json
{ "roomId": "<uuid>" }
```

Error responses:
- `400`: username missing
- `404`: user does not belong to a room or room not found
- `500`: internal error

### 2) Get full room payload

`GET /room/:roomId`

Behavior:
- Loads room hash from Redis (`room:<roomId>`).
- Loads chat log list (`room:<roomId>:chat`).
- Lazily initializes question content if missing via question-service random endpoint.
- Returns normalized room payload for frontend consumption.

Success response shape:

```json
{
  "question": "<title + description>",
  "questionId": "<string>",
  "questionTitle": "<string>",
  "questionDescription": "<string>",
  "programmingLanguage": "<string>",
  "questionTopic": "<string>",
  "questionDifficulty": "<string>",
  "participantUsernames": ["userA", "userB"],
  "imageUrls": ["https://..."],
  "chatLog": [
    {
      "id": "<uuid>",
      "user": "<username>",
      "message": "<text>",
      "timestamp": 1710000000000
    }
  ]
}
```

Error responses:
- `404`: room missing or incomplete required fields
- `500`: internal error

### 3) Delete user-room mapping

`DELETE /room/:roomId/user/:username/mapping`

Behavior:
- Deletes only the hash entry from `collab.users.room` for the specified `username`.
- `roomId` is validated for presence but not used to verify ownership in this handler.

Success response:

```json
{ "message": "User-room mapping deleted" }
```

Error responses:
- `400`: missing roomId/username
- `500`: internal error

## WebSocket Contract

Single WS server (port `8081`) supports two namespaces:

- Chat namespace: `/chat/:roomId`
- Yjs namespace: `/yjs/:roomId`

### Chat namespace (`/chat/:roomId`)

Client -> server message types:
- `user_joined`
- `user_left`
- `chat_message`

Examples:

```json
{ "type": "user_joined", "user": "alice" }
```

```json
{ "type": "user_left", "user": "alice" }
```

```json
{ "type": "chat_message", "user": "alice", "message": "hello" }
```

Server -> client message types:
- `user_joined` with payload `{ user, timestamp }`
- `user_left` with payload `{ user, timestamp }`
- `chat_message` with payload `{ id, user, message, timestamp }`

Chat persistence:
- Stored in Redis list `room:<roomId>:chat`
- Trimmed to the latest `CHAT_LOG_LIMIT` (200) messages

Presence behavior:
- Tracks username per socket.
- On disconnect/error, treats non-explicit disconnect as implicit leave.
- Avoids removing participant if the same username still has another open socket in the same room.

### Yjs namespace (`/yjs/:roomId`)

Behavior:
- Accepts binary Yjs updates from clients.
- Broadcasts updates to other clients in the same room.
- Persists updates in Redis list `room:<roomId>:yjs:updates` as base64.
- Replays persisted updates to newly connected clients.
- In-memory cache plus Redis list capped by `YJS_UPDATE_LOG_LIMIT` (500 updates).

## Redis Data Model

### Hash: `collab.users.room`

Purpose:
- Mapping from username to roomId.

Example:

```text
alice -> 123e4567-e89b-12d3-a456-426614174000
bob   -> 123e4567-e89b-12d3-a456-426614174000
```

### Hash: `room:<roomId>`

Core fields expected by collaboration-service:
- `programmingLanguage`
- `questionTopic`
- `questionDifficulty`
- `initialUsername` (JSON array string)
- `participantUsername` (JSON array string)

Lazily added/updated fields:
- `questionId`
- `questionTitle`
- `questionDescription`
- `question`
- `imageUrls` (JSON array string)

### List: `room:<roomId>:chat`

- JSON-serialized chat messages
- Trimmed to latest 200 entries

### List: `room:<roomId>:yjs:updates`

- Base64-encoded binary Yjs updates
- Trimmed to latest 500 entries

### Lock key: `room:<roomId>:question-init-lock`

- Short-lived lock (10s TTL) to prevent duplicate question initialization races

## Room Lifecycle and Cleanup

The WebSocket layer includes delayed cleanup:
- If a room becomes empty, it schedules deletion after `ROOM_DELETE_GRACE_MS` (60s).
- If sockets reconnect before timer fires, deletion is canceled.
- Before deletion, it re-checks:
  - open sockets in chat/yjs rooms
  - `participantUsername` is empty

If still eligible for deletion, it removes:
- `room:<roomId>`
- `room:<roomId>:chat`
- `room:<roomId>:yjs:updates`

Current behavior also attempts to delete user-room mappings for `initialUserIds` in this cleanup path.

## Integration With Other Services

### Matching service

Matching service creates room and mapping in Redis (`matching-service/src/controllers/matchingController.ts`):
- Writes room metadata into `room:<roomId>`
- Writes username -> roomId into `collab.users.room`

### API gateway

Gateway route file: `api-gateway/src/routes/collaborationRoutes.js`

Proxy mapping:
- `GET /api/collab/my-room` -> collaboration `GET /room/by-user/:username`
- `GET /api/collab/room/:roomId` -> collaboration `GET /room/:roomId`
- `DELETE /api/collab/room/:roomId/leave` -> collaboration `DELETE /room/:roomId/user/:username/mapping`

## Known Caveats

- `PORT` env is currently unused due hardcoded HTTP/WS ports in `src/index.js`.
- Delete-mapping endpoint does not validate that `username` belongs to `roomId`.
- Field naming uses `*UserIds` though current values are usernames in matching flow.
- Question initialization relies on question-service random endpoint availability.

## Observability and Logs

Useful logs emitted by the service include:
- HTTP startup
- Redis connection state
- Chat and Yjs connection/join/leave events
- Room deletion scheduling/cancellation/execution
- Question initialization failures

Follow logs in Docker:

```bash
docker logs -f collaboration-service
```

## Quick Troubleshooting

### Check user-room mapping

```bash
docker exec collab-redis redis-cli HGETALL collab.users.room
```

### Check a room hash

```bash
docker exec collab-redis redis-cli HGETALL room:<roomId>
```

### Check chat log

```bash
docker exec collab-redis redis-cli LRANGE room:<roomId>:chat 0 -1
```

### Check persisted Yjs updates

```bash
docker exec collab-redis redis-cli LLEN room:<roomId>:yjs:updates
```

## Development Notes

- Code style is CommonJS modules.
- Main entrypoint: `src/index.js`.
- API server factory: `src/api/createApiServer.js`.
- WebSocket server factory: `src/websocket/createYjsServer.js`.

## Future Improvements

- Read HTTP/WS ports from environment variables.
- Add explicit health endpoint (HTTP + Redis readiness).
- Enforce room ownership check in delete-mapping endpoint.
- Clarify username vs userId naming in Redis fields.
- Add automated tests for room cleanup and reconnect race conditions.
