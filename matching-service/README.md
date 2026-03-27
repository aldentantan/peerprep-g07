# Matching Service API Contract

## Overview
The matching service exposes a single external API over WebSocket.

- API type: WebSocket
- Base path: /
- Authentication: none at matching-service handshake level
- Transport: JSON messages over one persistent socket per user

This document is intended for api-gateway/backend integration.

## Endpoint

### WebSocket Connect
- Protocol: `ws` (or `wss` behind TLS ingress)
- URL format (local): `ws://localhost:<MATCHING_SERVICE_PORT>/?userId=<string>`
- URL format (Docker compose network): `ws://matching-service:<MATCHING_SERVICE_PORT>/?userId=<string>`
- Default port in service code if env missing: `3002`
- Port is normally provided by `MATCHING_SERVICE_PORT`

### Required Query Parameters
| Name | Type | Required | Description |
|---|---|---|---|
| `userId` | `string` | Yes | Unique user identifier used as queue identity and WebSocket connection key. |

### Handshake Rejection / Close Conditions
| Condition | Close Code | Reason |
|---|---|---|
| Missing or non-string `userId` | `1008` | `Missing or invalid userId` |
| Duplicate active connection for same `userId` | `1008` | `User already has an active matching request` |

## Message Protocol
All frames are JSON text frames.

## Inbound Messages (Client -> Matching Service)

### 1) Enqueue
Add current user to matching queue for a specific topic/difficulty/language.

```json
{
  "type": "enqueue",
  "topic": "arrays",
  "difficulty": "easy",
  "language": "javascript"
}
```

Validation values:
- `topic`: `arrays | linked-lists | trees | graphs | dynamic-programming | algorithms | system-design | strings | data-structures`
- `difficulty`: `easy | medium | hard`
- `language`: `javascript | python | java | cpp | typescript | go | ruby | csharp`

Possible responses:
- `queued`
- `error` (example: user already queued)

### 2) Cancel
Cancel pending queue request for current user.

```json
{
  "type": "cancel"
}
```

Possible responses:
- `cancelled` (if user was still queued)
- no message if already not queued / already matched

### Invalid/Unknown Client Messages
- Invalid JSON -> `{"type":"error","message":"Invalid JSON"}`
- Unknown `type` -> `{"type":"error","message":"Unknown message type: <value>"}`

## Outbound Messages (Matching Service -> Client)

### 1) Queued
```json
{
  "type": "queued",
  "queueKey": "arrays-easy-javascript"
}
```

### 2) Matched
```json
{
  "type": "matched",
  "match": {
    "users": ["userA", "userB"],
    "roomId": "uuid",
    "topic": "arrays",
    "difficulty": "easy",
    "language": "javascript",
    "createdAt": 1710000000000
  }
}
```

### 3) Timeout
```json
{
  "type": "timeout"
}
```

### 4) Cancelled
```json
{
  "type": "cancelled"
}
```

### 5) Error
```json
{
  "type": "error",
  "message": "User is already in a queue."
}
```

## Connection and Lifecycle Behavior

1. Client opens socket with required `userId` query param.
2. Client sends `enqueue`.
3. Server replies `queued` if accepted.
4. Then one of these terminal outcomes occurs:
   - `matched` when a pair is formed.
   - `timeout` when queue wait exceeds configured timeout.
   - `cancelled` after client sends `cancel` while still queued.
5. On disconnect (`close`), server attempts cancel cleanup for that user.

## Timing and Matching Behavior
- Queue polling interval: every 10 seconds.
- Timeout cleanup interval: every 10 seconds.
- Current timeout in code: 10 seconds (testing value).
- Production-intended timeout comment exists in code: 2 minutes.

## Environment Variables Relevant to Gateway Integration
| Variable | Example | Purpose |
|---|---|---|
| `MATCHING_SERVICE_PORT` | `3002` | Port exposed by matching service. |
| `MATCHING_SERVICE_URL` | `http://matching-service:3002` or gateway-configured host | Base service URL known by gateway env. For WebSocket calls use `ws://` or `wss://` with same host/port and include `?userId=`. |
| `REDIS_HOST` | `redis` | Internal dependency, not called by gateway directly. |
| `REDIS_PORT` | `6379` | Internal dependency, not called by gateway directly. |

## Gateway Integration Notes
- One active socket per user is enforced. Reusing same user in parallel connections will be rejected.
- There is no auth token validation in matching-service handshake; enforce auth/identity at gateway before opening WS to matching-service.
- No heartbeat/ping contract is defined by the service API. Gateway/client should implement reconnect policy on socket close.
- Queue identity is derived from (`topic`,`difficulty`,`language`) and returned as `queueKey` format: `<topic>-<difficulty>-<language>`.
