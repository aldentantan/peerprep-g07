# Code Execution Service

The Code Execution Service provides sandboxed code execution for PeerPrep's collaborative coding workspace. It acts as a thin proxy between the API Gateway and [Piston](https://github.com/engineer-man/piston), an open-source code execution engine.

---

## What This Service Does

- Receives code and a language identifier from the API Gateway.
- Translates the language into the specific Piston runtime name and version.
- Forwards the code to Piston for sandboxed execution.
- Returns stdout, stderr, and exit code back to the caller.

This service is **stateless** — it has no database and stores nothing.

---

## Tech Stack

- **Runtime**: Node.js 20 (Express)
- **Execution Engine**: Piston
- **Containerisation**: Docker + Docker Compose
- **Module System**: ES Modules (`import`/`export`)

---

## Project Structure

```
code-execution-service/
├── Dockerfile
├── package.json
└── src/
    └── index.js        # Entry point – Express server, language mapping, Piston proxy
```

---

## Supported Languages

| Language   | Piston Runtime | Version  |
|------------|---------------|----------|
| JavaScript | javascript    | 18.15.0  |
| TypeScript | typescript    | 5.0.3    |
| Python     | python        | 3.10.0   |
| Java       | java          | 15.0.2   |
| C++        | c++           | 10.2.0   |
| Go         | go            | 1.16.2   |
| Ruby       | ruby          | 3.0.1    |
| C#         | csharp        | 6.12.0   |

---

## API Endpoints

### `GET /health`

Health check.

**Response**:
```json
{ "status": "ok", "service": "code-execution-service" }
```

### `POST /execute`

Execute code in a sandboxed environment.

**Request Body**:
```json
{
  "language": "python",
  "code": "print('hello')",
  "stdin": ""
}
```

| Field      | Type   | Required | Description                          |
|------------|--------|----------|--------------------------------------|
| `language` | string | Yes      | One of the 8 supported language keys |
| `code`     | string | Yes      | Source code to execute                |
| `stdin`    | string | No       | Standard input for the program       |

**Success Response** (`200`):
```json
{
  "stdout": "hello\n",
  "stderr": "",
  "exitCode": 0
}
```

**Error Responses**:

| Status | Condition                          |
|--------|------------------------------------|
| `400`  | Missing or invalid language/code   |
| `502`  | Piston engine error                |
| `504`  | Execution timed out                |
| `500`  | Internal error                     |

---

## Resource Limits

| Limit              | Value      |
|--------------------|------------|
| Run timeout        | 3 seconds  |
| Compile timeout    | 10 seconds |
| Request timeout    | 10 seconds |
| Max output size    | 1 MB       |
| Max request body   | 1 MB       |

---

## Environment Variables

| Variable     | Description                    | Default                  |
|--------------|--------------------------------|--------------------------|
| `PORT`       | Port the service listens on    | `3005`                   |
| `PISTON_URL` | URL of the Piston engine       | `http://piston:2000`     |

---

## How To Run

### With Docker Compose (recommended)

From the project root:

```bash
docker compose up --build
```

This starts the Piston engine, installs all language runtimes via the `piston-init` container, then starts the code execution service.

### Local (without Docker)

1. Ensure a Piston instance is running and reachable.
2. Install dependencies and start:

```bash
cd code-execution-service
npm install
PISTON_URL=http://localhost:2000 node src/index.js
```

The service will be available at `http://localhost:3005`.
