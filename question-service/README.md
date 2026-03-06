# PeerPrep – Question Service

The Question Service is a REST API that manages the storage, retrieval, and administration of coding questions for the PeerPrep platform.

---

## Tech Stack

- **Runtime**: Node.js 20 (Express)
- **Database**: PostgreSQL 16
- **Containerisation**: Docker + Docker Compose
- **Module System**: ES Modules (`import`/`export`)

---

## Project Structure

```
question-service/
├── docker-compose.yml          # Spins up Postgres + Question Service
├── Dockerfile                  # Container image for the service
├── .env                        # Local environment variables (do not commit)
├── .env.example                # Template for environment variables
├── package.json
└── src/
    ├── index.js                # Entry point - Express setup & DB wait loop
    ├── db/
    │   ├── index.js            # pg Pool connection
    │   └── init.sql            # Schema creation + seed data (20 questions)
    ├── middleware/
    │   └── auth.js             # requireAdmin – calls User Service to verify role
    ├── controllers/
    │   └── questionController.js  # All business logic
    └── routes/
        └── questions.js        # Route definitions
```

---

## Getting Started

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Run with Docker

```bash
# 1. Navigate to the project directory
cd question-service

# 2. Build and start everything
docker compose up --build

# 3. The service is ready when you see:
#    Database connected successfully.
#    Question Service running on port 3000
```

The database is seeded automatically with 20 sample questions on first run.

> **Note:** The seed only runs on the very first `docker compose up` when the volume is brand new. It will not re-run or duplicate data on subsequent starts.

### Resetting the Database

If you need to wipe all data and re-seed from scratch:

```bash
docker compose down -v
docker compose up --build
```

The `-v` flag deletes the named volume, forcing Postgres to reinitialise.

### Run Locally (without Docker)

```bash
# 1. Start Postgres via Docker only
docker compose up postgres -d

# 2. Install dependencies
npm install

# 3. Copy and configure the env file
cp .env.example .env
# Change DB_HOST=postgres to DB_HOST=localhost

# 4. Start the service
npm run dev   # hot-reload via nodemon
# or
npm start
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port the service listens on |
| `DB_HOST` | `postgres` | PostgreSQL host (`localhost` when running outside Docker) |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `peerprep_questions` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |


---

## Database Schema

```sql
CREATE TABLE questions (
    question_id   SERIAL PRIMARY KEY,
    title         VARCHAR(255) NOT NULL,
    description   TEXT NOT NULL,
    constraints   TEXT,
    test_cases    JSONB NOT NULL DEFAULT '[]',
    leetcode_link VARCHAR(500),
    difficulty    VARCHAR(10) NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    topics        TEXT[] NOT NULL DEFAULT '{}',
    image_urls    TEXT[] DEFAULT '{}',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

- `test_cases` is stored as **JSONB** so Postgres understands the structure, validates it, and allows future querying inside the field.
- `image_urls` stores only URLs. Actual images are hosted on a third-party service.
- `updated_at` is automatically updated via a Postgres trigger on every row update.

### Test Case Format

For standard algorithm questions:
```json
[
  { 
    "input": "s = [\"h\",\"e\",\"l\",\"l\",\"o\"]",
    "output": "[\"o\",\"l\",\"l\",\"e\",\"h\"]" 
  }
]
```

For database questions with multiple input tables:
```json
[
  {
    "input": {
      "Person": [
        { "personId": 1, "lastName": "Wang", "firstName": "Allen" }
      ],
      "Address": [
        { "addressId": 1, "personId": 2, "city": "New York City", "state": "New York" }
      ]
    },
    "output": [
      { "firstName": "Allen", "lastName": "Wang", "city": null, "state": null }
    ]
  }
]
```

---

## API Reference

### Base URL
```
http://localhost:3000
```

---

### Health Check

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | None |

**Response 200**
```json
{ "status": "ok", "service": "question-service", "db": "connected" }
```

---

### Get All Questions

| Method | Path | Auth |
|--------|------|------|
| GET | `/questions` | None |

**Query Parameters** - all optional, can be combined

| Param | Type | Description |
|-------|------|-------------|
| `topics` | string | Comma-separated list of topics e.g. `Strings,Arrays` |
| `difficulty` | string | `Easy`, `Medium`, or `Hard` |

**Topic filtering uses OR logic** — `?topics=Strings,Arrays` returns questions tagged with Strings OR Arrays.

**Examples**
```
GET /questions
GET /questions?difficulty=Easy
GET /questions?topics=Strings
GET /questions?topics=Strings,Arrays
GET /questions?topics=Algorithms&difficulty=Medium
```

**Response 200**
```json
{
  "count": 2,
  "questions": [
    {
      "questionId": 1,
      "title": "Reverse a String",
      "description": "Write a function that reverses a string...",
      "constraints": "1 <= s.length <= 10^5",
      "testCases": [
        { 
            "input": "s = [\"h\",\"e\",\"l\",\"l\",\"o\"]",
            "output": "[\"o\",\"l\",\"l\",\"e\",\"h\"]" 
        }
      ],
      "leetcodeLink": "https://leetcode.com/problems/reverse-string/",
      "difficulty": "Easy",
      "topics": ["Strings", "Algorithms"],
      "imageUrls": [],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Get Question by ID

| Method | Path | Auth |
|--------|------|------|
| GET | `/questions/:id` | None |

**Response 200** — single question object (same shape as above).

**Response 404**
```json
{ "error": "Not Found", "message": "Question with ID 99 not found." }
```

---

### Create Question *(Admin only)*

| Method | Path | Auth (To be implemented) |
|--------|------|------|
| POST | `/questions` | `Authorization: Bearer <token>` |

**Required fields:** `title`, `description`, `difficulty`, `topics`, `testCases`

**Request Body**
```json
{
  "title": "Two Sum",
  "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
  "constraints": "2 <= nums.length <= 10^4",
  "testCases": [
    { "input": "nums = [2,7,11,15], target = 9", "output": "[0,1]" }
  ],
  "leetcodeLink": "https://leetcode.com/problems/two-sum/",
  "difficulty": "Easy",
  "topics": ["Arrays", "Hash Table"],
  "imageUrls": []
}
```

**Response 201** — created question object.

**Response 400** — missing or invalid fields:
```json
{
  "error": "Validation Error",
  "message": "The following required fields are missing or invalid.",
  "missingFields": ["title", "difficulty"]
}
```

---

### Update Question *(Admin only)*

| Method | Path | Auth (To be implemented) |
|--------|------|------|
| PUT | `/questions/:id` | `Authorization: Bearer <token>` |

Send only the fields you want to update. All fields are optional — unset fields keep their existing values.

**Response 200** — updated question object.

---

### Delete Question *(Admin only)*

| Method | Path | Auth (To be implemented)|
|--------|------|------|
| DELETE | `/questions/:id` | `Authorization: Bearer <token>` |

**Response 200**
```json
{ "message": "Question \"Reverse a String\" (ID: 1) deleted successfully." }
```

---

## Admin Authentication

Admin-only routes (`POST`, `PUT`, `DELETE`) require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <token>
```

The middleware calls the **User Service** at `GET /users/me` to verify the token and check that the user's role is `admin`. The User Service must return:

```json
{ "id": "123", "role": "admin" }
```

**While the User Service is not yet running**, admin routes will return:
```json
{
  "error": "Service Unavailable",
  "message": "User Service is not reachable..."
}
```

To test admin routes locally before the User Service is ready, temporarily remove `requireAdmin` from the routes in `src/routes/questions.js`:

```javascript
// Temporarily remove requireAdmin for local testing
router.post('/', createQuestion);
router.put('/:id', updateQuestion);
router.delete('/:id', deleteQuestion);
```

Remember to add it back before integrating with other services.

---

## Testing the API

Use **Postman**, **Thunder Client** (VS Code extension), or `curl`.

Make sure Docker is running first:
```bash
docker compose up
```

### Quick curl examples

```bash
# Health check
curl http://localhost:3000/health

# Get all questions
curl http://localhost:3000/questions

# Filter by difficulty
curl "http://localhost:3000/questions?difficulty=Easy"

# Filter by multiple topics
curl "http://localhost:3000/questions?topics=Strings,Algorithms"

# Filter by topic and difficulty
curl "http://localhost:3000/questions?topics=Algorithms&difficulty=Medium"

# Get question by ID
curl http://localhost:3000/questions/1

# Create a question (admin auth bypassed for local testing)
curl -X POST http://localhost:3000/questions \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Two Sum",
    "description": "Given an array of integers...",
    "difficulty": "Easy",
    "topics": ["Arrays"],
    "testCases": [{"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]"}]
  }'

# Update a question
curl -X PUT http://localhost:3000/questions/1 \
  -H "Content-Type: application/json" \
  -d '{ "difficulty": "Medium" }'

# Delete a question
curl -X DELETE http://localhost:3000/questions/1
```

---

## Seeded Questions

The database is pre-loaded with 20 sample questions on first run:

| ID | Title | Difficulty | Topics |
|----|-------|------------|--------|
| 1 | Reverse a String | Easy | Strings, Algorithms |
| 2 | Linked List Cycle Detection | Easy | Data Structures, Algorithms |
| 3 | Roman to Integer | Easy | Algorithms |
| 4 | Add Binary | Easy | Bit Manipulation |
| 5 | Fibonacci Number | Easy | Recursion, Algorithms |
| 6 | Implement Stack using Queues | Easy | Data Structures |
| 7 | Combine Two Tables | Easy | Databases |
| 8 | Repeated DNA Sequences | Medium | Algorithms, Bit Manipulation, Strings |
| 9 | Course Schedule | Medium | Data Structures, Algorithms |
| 10 | LRU Cache Design | Medium | Data Structures |
| 11 | Longest Common Subsequence | Medium | Strings, Algorithms |
| 12 | Rotate Image | Medium | Arrays, Algorithms |
| 13 | Airplane Seat Assignment Probability | Medium | Brainteaser |
| 14 | Validate Binary Search Tree | Medium | Data Structures, Algorithms |
| 15 | Sliding Window Maximum | Hard | Arrays, Algorithms |
| 16 | N-Queen Problem | Hard | Algorithms |
| 17 | Serialize and Deserialize a Binary Tree | Hard | Data Structures, Algorithms |
| 18 | Wildcard Matching | Hard | Strings, Algorithms |
| 19 | Chalkboard XOR Game | Hard | Brainteaser |
| 20 | Trips and Users | Hard | Databases |

---

## Notes

- Add `.env` to your `.gitignore` - never commit it to version control.
- Images are stored externally; only the URL is stored in the database.