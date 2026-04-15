[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/HpD0QZBI)

# PeerPrep (CS3219 Project) - AY2526S2

Group: G07

PeerPrep is a microservices-based collaborative coding platform. Users can authenticate, find a matched peer by topic and difficulty, solve questions in a real-time shared workspace, run code in a sandbox, and view their attempt history.

This repository contains all services required to run the full system end-to-end.

**Live deployment:** [http://peerprep.ap-southeast-1.elasticbeanstalk.com/](http://peerprep.ap-southeast-1.elasticbeanstalk.com/)

---

## Table of Contents

- [System Overview](#system-overview)
- [Architecture and Services](#architecture-and-services)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Quick Start (Docker Compose)](#quick-start-docker-compose)
- [Development Workflow](#development-workflow)
- [API and WebSocket Entry Points](#api-and-websocket-entry-points)
- [Data Stores and Persistence](#data-stores-and-persistence)
- [Useful Commands](#useful-commands)
- [Troubleshooting](#troubleshooting)
- [Service Documentation](#service-documentation)
- [AI Use Summary](#ai-use-summary)

---

## System Overview

Core product capabilities:

- Account registration, login, role-based access, and profile management.
- Question retrieval and administration (including image support and LeetCode ingestion).
- Real-time user matching over WebSocket.
- Real-time collaborative editor and chat.
- Sandboxed code execution through Piston.
- Attempt history capture with question snapshotting.

High-level user flow:

1. User signs in through the frontend.
2. Frontend communicates with the API Gateway for all HTTP requests.
3. User enters matching queue via WebSocket.
4. On successful match, room metadata is created and collaboration starts.
5. Users code together, chat, run code, and optionally save attempt history.

---

## Architecture and Services

The system is split into independently deployable services:

| Service | Default Port | Purpose |
|---|---:|---|
| `frontend` | `80` (host) / `3038` (container) | React SPA served by Nginx |
| `api-gateway` | `3004` | Single public backend entry point, HTTP/WS proxy, auth middleware |
| `user-service` | `3000` | User accounts, authentication, role checks |
| `question-service` | `3001` | Question CRUD, topic filters, random selection, image handling, scheduler |
| `matching-service` | `3002` | Queue management and peer matching via WebSocket + Redis |
| `collaboration-service` | `3003` (HTTP), `8081` (WS) | Room retrieval, chat, Yjs synchronization |
| `code-execution-service` | `3005` | Sandboxed execution proxy to Piston |
| `attempt-history-service` | `3006` | Persist and fetch user attempt history |
| `redis` | `6379` | Matching queue/pending state |
| `collab-redis` | `6379` (internal) | Collaboration room/chat/Yjs persistence |
| `piston` | `2000` (internal) | Runtime engine for code execution |
| `leetcode-api` | internal | Upstream source for scheduled question sync |

### Request routing

- Frontend sends API requests to gateway under `/api/...`.
- Gateway routes to downstream services and forwards JWT where needed.
- Gateway also proxies WebSocket paths (prefix-matched):
	- `/ws/match`
	- `/ws/yjs/<roomId>`
	- `/ws/chat/<roomId>`

---

## Repository Structure

```text
.
|-- api-gateway/
|-- attempt-history-service/
|-- code-execution-service/
|-- collaboration-service/
|-- frontend/
|-- matching-service/
|-- question-service/
|-- user-service/
|-- ai/
|   `-- usage-log.md
|-- docker-compose.yml
|-- eslint.config.js
|-- .env.example
|-- LICENSE
|-- package.json
`-- README.md
```

Each service has its own `Dockerfile`, dependencies, and README.

---

## Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin)
- Node.js 20+ (only needed for local non-Docker service development)
- An external PostgreSQL instance (not included in Docker Compose)
- A configured `.env` file at repository root
- AWS credentials and bucket (required for question image upload features)

---

## Environment Setup

1. Create a local env file from template.

```bash
cp .env.example .env
```

PowerShell equivalent:

```powershell
Copy-Item .env.example .env
```

2. Fill in required values in `.env`:

- `DB_HOST`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET`
- `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, `AWS_REGION`

3. Confirm service URLs/ports are consistent if you customize defaults.

Important default ports from `.env.example`:

- `USER_SERVICE_PORT=3000`
- `QUESTION_SERVICE_PORT=3001`
- `MATCHING_SERVICE_PORT=3002`
- `COLLAB_SERVICE_PORT=3003`
- `GATEWAY_PORT=3004`
- `CODE_EXECUTION_PORT=3005`
- `ATTEMPT_HISTORY_SERVICE_PORT=3006`
- `FRONTEND_PORT=3038`

---

## Quick Start (Docker Compose)

From repository root:

```bash
docker compose up --build
```

To run in background:

```bash
docker compose up -d --build
```

Stop all services:

```bash
docker compose down
```

Stop and remove volumes (full reset):

```bash
docker compose down -v
```

After startup, access:

- Frontend: `http://localhost` (port 80)
- API Gateway: `http://localhost:3004`

Health checks/examples (only reachable from within the Docker network or during local hybrid development):

- `GET http://localhost:3001/health` (question service)
- `GET http://localhost:3005/health` (code execution service)
- `GET http://localhost:3006/health` (attempt history service)
- `GET http://localhost:3004/api/health` (API gateway)

---

## Development Workflow

### Option A: Full stack in Docker (recommended)

Use this for integration testing and team-wide consistency.

```bash
docker compose up --build
```

### Option B: Hybrid local development

Run shared dependencies in Docker, then run selected services locally for faster iteration.

Typical pattern:

1. Start infrastructure and supporting services via Docker.
2. Enter one service folder.
3. Install dependencies.
4. Run local dev command (`npm run dev` where available).

Examples:

```bash
cd matching-service
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

---

## API and WebSocket Entry Points

Public backend base URL:

- `http://localhost:3004/api`

Main gateway route groups:

- `/api/health`
- `/api/auth`
- `/api/users`
- `/api/questions`
- `/api/match`
- `/api/collab`
- `/api/execute`
- `/api/attempt-history`

WebSocket endpoints (through gateway, prefix-matched):

- `ws://localhost:3004/ws/match`
- `ws://localhost:3004/ws/yjs/<roomId>`
- `ws://localhost:3004/ws/chat/<roomId>`

---

## Data Stores and Persistence

- PostgreSQL is used by user, question, and attempt history services. The database is **not** provisioned by Docker Compose — you must provide an external PostgreSQL instance via the `DB_HOST` environment variable.
- Redis (primary) is used by matching service for queue and pending-match state.
- Redis (collaboration) is used for room metadata, chat logs, and Yjs update persistence.
- Piston runtime packages are persisted in the `piston-data` Docker volume.

If you need a clean slate, run `docker compose down -v`.

---

## Useful Commands

Run from repository root unless stated otherwise.

Install root tooling dependencies:

```bash
npm install
```

Lint TypeScript/React source configured at root:

```bash
npm run lint
```

Build selected services via root script:

```bash
npm run build
```

View compose logs:

```bash
docker compose logs -f
```

View one service logs:

```bash
docker compose logs -f api-gateway
```

---

## Troubleshooting

### 1) Container fails due to missing environment values

- Re-check `.env` exists at repository root.
- Validate required secrets and database values are set.

### 2) Port already in use

- Change the conflicting port in `.env`.
- Recreate with `docker compose up --build`.

### 3) Question images fail to upload

- Verify AWS credentials and bucket name.
- Ensure IAM permissions for S3 read/write are granted.

### 4) Matching/collaboration issues

- Check both `redis` and `collab-redis` containers are healthy.
- Check gateway WebSocket proxy routes are reachable.

### 5) Need full data reset

- Use `docker compose down -v` to remove volumes and bootstrap fresh state.

---

## Service Documentation

For detailed API contracts and internal behavior, refer to:

- `api-gateway/README.md`
- `user-service/README.md`
- `question-service/README.md`
- `matching-service/README.md`
- `collaboration-service/README.md`
- `code-execution-service/README.md`
- `attempt-history-service/README.md`
- `frontend/README.md`

---

## AI Use Summary

**Tools:** GitHub Copilot (GPT-5.3-Codex), GitHub Copilot (Claude Opus 4.6)

**Prohibited phases avoided:** Requirements elicitation; architecture/design decisions.

**Allowed uses:**
- Generated README documentation for code-execution-service, frontend, and api-gateway based on existing codebase (boilerplate/documentation generation).
- Debugging and explanation assistance for understanding code execution service architecture, Piston sandbox, Docker setup, and request flow.
- Generated presentation-ready bullet points explaining service functionality (learning support/documentation).
- Verified architecture diagram accuracy against codebase (debugging assistance).
- Minor UI label change in navigation header (implementation code).

**Verification:** All AI outputs were reviewed, edited where necessary, and tested by the authors. Prompts and key exchanges are logged in [`/ai/usage-log.md`](ai/usage-log.md).
