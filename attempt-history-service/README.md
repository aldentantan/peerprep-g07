# PeerPrep - Attempt History Service

The Attempt History Service records user-specific question attempt snapshots for PeerPrep and returns a user's saved attempt history.

It stores the submitted code together with a frozen snapshot of the question at the time of saving, so past attempts remain viewable even if the live question is later edited or deleted.

---

## Tech Stack

- **Runtime**: Node.js 20 (Express)
- **Database**: PostgreSQL 16
- **Authentication**: JWT verification with shared `JWT_SECRET`
- **Containerisation**: Docker + Docker Compose
- **Module System**: ES Modules (`import`/`export`)

---

## Project Structure
└──
├──
```text
attempt-history-service/
├── Dockerfile
├── package.json
├── README.md
├── src/
   ├── index.js                    # Express setup, health check, DB bootstrap, schema init
   ├── controllers/
   |  └── attemptController.js    # Create attempt + get current user's attempts
   ├── db/
   |  └── bootstrap.js            # Creates the target DB if it does not exist yet
   |  └── index.js                # pg Pool connection
   |  └── schema.js               # Table and index creation
   ├── middleware/
   |  └── auth.js                 # Bearer token verification
   ├── routes/
      └── attemptRoutes.js        # /attempts route definitions
```

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- A root `.env` file in the repository
- A PostgreSQL user with permission to create databases if you want auto-bootstrap enabled

### Run with Docker

Run from the repository root:

```bash
docker compose up --build 
```

The service is ready when you see:

```text
Attempt history database connected successfully.
Attempt History Service running on port 3006
```

### Resetting the Database

If you need to wipe the Postgres volumes and recreate the databases:

```bash
docker compose down -v
docker compose up --build
```

### Run Locally (without Docker for API)

You can run the API locally while keeping Postgres in Docker.

```bash
# 1. Start the shared stack pieces you need
docker compose up -d question-service

# 2. In attempt-history-service/, install dependencies
npm install

# 3. Create and configure your env file
# Make sure DB_HOST points to localhost if Postgres is exposed locally

# 4. Start the service
npm run dev
# or
npm start
```

---

## Environment Variables

The service itself reads the generic variables below. In the repository root `docker-compose.yml`, these are wired from `ATTEMPT_HISTORY_*` variables in the root `.env`.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3006` | Port the service listens on |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `peerprep_attempt_history` | Target database name for attempt history |
| `DB_BOOTSTRAP_DB` | `postgres` | Database used first to check/create `DB_NAME` |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |
| `JWT_SECRET` | none | Secret used to verify Bearer tokens |
| `QUESTION_SERVICE_URL` | none | Base URL used to check current question state for archive detection |

### Root Compose Mapping

From the repository root, the important `.env` variables are:

| Root `.env` Variable | Example |
|----------------------|---------|
| `ATTEMPT_HISTORY_SERVICE_PORT` | `3006` |
| `ATTEMPT_HISTORY_DB_NAME` | `attempthistorydb` |
| `ATTEMPT_HISTORY_BOOTSTRAP_DB` | `postgres` |
| `ATTEMPT_HISTORY_SERVICE_URL` | `http://attempt-history-service:3006` |

---

## How It Works

### Saving an attempt

1. The frontend sends a `POST /attempt-history` request to the API Gateway.
2. The gateway forwards the request to this service as `POST /attempts` with the user's Bearer token.
3. This service verifies the JWT locally using `JWT_SECRET`.
4. The service stores:
   - the authenticated user
   - the question ID
   - a frozen snapshot of the question title, description, difficulty, topics, and optional `updatedAt`
   - the submitted code
   - the submission timestamp
5. The service returns the saved attempt with its computed `attemptNumber`.

### Reading history

1. The frontend calls `GET /attempt-history/me` through the gateway.
2. The service loads the current user's attempts from Postgres.
3. For archive detection, it optionally checks the current question record from the Question Service.
4. If the live question was deleted or meaningfully changed, the attempt is returned with `question.archived: true`.

If the Question Service is temporarily unavailable, archive detection is skipped for that request instead of failing the whole history response.

---

## Database Bootstrap

On startup, the service first connects to `DB_BOOTSTRAP_DB` and checks whether `DB_NAME` exists.

- If the target database does not exist, it creates it.
- It then reconnects using `DB_NAME` and ensures the schema exists.

This is why `DB_BOOTSTRAP_DB` is usually set to `postgres`.

If your Postgres user does not have permission to create databases:

- create the target database manually first, or
- use a user with `CREATE DATABASE` permission

---

## Database Schema

```sql
CREATE TABLE question_attempt_history (
    attempt_id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    question_id INTEGER NOT NULL,
    question_title VARCHAR(255) NOT NULL,
    question_description TEXT NOT NULL,
    question_difficulty VARCHAR(10) NOT NULL CHECK (question_difficulty IN ('Easy', 'Medium', 'Hard')),
    question_topics TEXT[] NOT NULL DEFAULT '{}',
    question_updated_at TIMESTAMPTZ,
    submitted_code TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Indexes created by the service:

```sql
CREATE INDEX idx_question_attempt_history_user_submitted_at
    ON question_attempt_history (user_id, submitted_at DESC);

CREATE INDEX idx_question_attempt_history_user_question
    ON question_attempt_history (user_id, question_id);
```

---

## API Reference

### Base URL

```text
http://localhost:3006
```

---

### Health Check

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | None |

**Response 200**

```json
{ "status": "ok", "service": "attempt-history-service", "db": "connected" }
```

---

### Get My Attempt History

| Method | Path | Auth |
|--------|------|------|
| GET | `/attempts/me` | `Authorization: Bearer <token>` |

**Optional Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `questionId` | number | Restrict results to a single question |

**Example**

```text
GET /attempts/me
GET /attempts/me?questionId=12
```

**Response 200**

```json
{
  "count": 1,
  "attempts": [
    {
      "attemptId": 8,
      "attemptNumber": 2,
      "userId": "7",
      "username": "jasmine",
      "question": {
        "id": 12,
        "title": "Rotate Image",
        "description": "You are given an n x n 2D matrix...",
        "difficulty": "Medium",
        "topics": ["Arrays", "Algorithms"],
        "archived": false
      },
      "submittedCode": "function rotate(matrix) { ... }",
      "submittedAt": "2026-04-04T10:20:30.000Z"
    }
  ]
}
```

**Response 400**

```json
{
  "error": "Validation Error",
  "message": "questionId must be a number when provided."
}
```

---

### Create Attempt

| Method | Path | Auth |
|--------|------|------|
| POST | `/attempts` | `Authorization: Bearer <token>` |

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `questionId` | number | Yes | Question ID |
| `questionTitle` | string | Yes | Question title snapshot |
| `questionDescription` | string | Yes | Question description snapshot |
| `questionDifficulty` | string | Yes | `Easy`, `Medium`, or `Hard` |
| `questionTopics` | string[] | Yes | Topics snapshot |
| `questionUpdatedAt` | string | No | Question `updatedAt` timestamp snapshot |
| `submittedCode` | string | Yes | User's saved code; cannot be empty |

**Example Request**

```json
{
  "questionId": 12,
  "questionTitle": "Rotate Image",
  "questionDescription": "You are given an n x n 2D matrix...",
  "questionDifficulty": "Medium",
  "questionTopics": ["Arrays", "Algorithms"],
  "questionUpdatedAt": "2026-04-04T10:00:00.000Z",
  "submittedCode": "function rotate(matrix) { ... }"
}
```

**Response 201**

```json
{
  "message": "Attempt recorded successfully.",
  "attempt": {
    "attemptId": 8,
    "attemptNumber": 2,
    "userId": "7",
    "username": "jasmine",
    "question": {
      "id": 12,
      "title": "Rotate Image",
      "description": "You are given an n x n 2D matrix...",
      "difficulty": "Medium",
      "topics": ["Arrays", "Algorithms"],
      "archived": false
    },
    "submittedCode": "function rotate(matrix) { ... }",
    "submittedAt": "2026-04-04T10:20:30.000Z"
  }
}
```

**Common validation errors**

```json
{
  "error": "Validation Error",
  "message": "submittedCode cannot be empty."
}
```

```json
{
  "error": "Validation Error",
  "message": "questionTopics must contain at least one topic."
}
```

---

## Authentication

Both `/attempts` routes require:

```text
Authorization: Bearer <token>
```

The service verifies the JWT directly using `JWT_SECRET`. It reads user identity from the decoded token in this order:

- `id`
- `sub`
- `email`

The username used for display is taken from:

- `username`
- otherwise `email`
- otherwise `id`

---

## Testing the API

Use Postman, Thunder Client, or `curl`.

```bash
# Health check
curl http://localhost:3006/health

# Get all attempts for the authenticated user
curl http://localhost:3006/attempts/me \
  -H "Authorization: Bearer <token>"

# Get attempts for one question
curl "http://localhost:3006/attempts/me?questionId=12" \
  -H "Authorization: Bearer <token>"

# Save an attempt
curl -X POST http://localhost:3006/attempts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"questionId\":12,\"questionTitle\":\"Rotate Image\",\"questionDescription\":\"You are given an n x n 2D matrix...\",\"questionDifficulty\":\"Medium\",\"questionTopics\":[\"Arrays\",\"Algorithms\"],\"questionUpdatedAt\":\"2026-04-04T10:00:00.000Z\",\"submittedCode\":\"function rotate(matrix) { ... }\"}"
```

---

## Notes

- This service owns attempt history data and uses its own database.
- Attempt history is user-scoped; users only read their own attempts.
- Archived status is computed at read time by comparing the saved snapshot with the current question from the Question Service.
- Deleting a question does not delete past attempts; those attempts become archived and remain viewable.
