# PeerPrep – Question Service

The Question Service is a REST API that manages the storage, retrieval, administration, and scheduled ingestion of coding questions for the PeerPrep platform.

---

## Tech Stack

- **Runtime**: Node.js 20 (Express)
- **Database**: PostgreSQL 16
- **Image Storage**: AWS S3
- **Containerisation**: Docker + Docker Compose
- **Module System**: ES Modules (`import`/`export`)

---

## Project Structure

```
question-service/
├── Dockerfile                  # Container image for the service
├── package.json
└── src/
    ├── index.js                # Entry point - Express setup & DB wait loop
    ├── db/
    │   ├── index.js            # pg Pool connection
    │   └── init.sql            # Schema creation + seed data (20 questions)
    ├── middleware/
    │   └── auth.js             # requireAdmin – calls User Service to verify role
    ├── services/
    │   ├── leetcodeScheduler.js # Periodic LeetCode sync job
    │   └── s3Service.js        # AWS S3 client – upload and delete images
    ├── controllers/
    │   └── questionController.js  # CRUD business logic
    │   └── imageController.js     # Standalone image upload/delete
    └── routes/
        └── questions.js        # Route definitions
```

---

## Getting Started

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- AWS account with an S3 bucket created 

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
The service also includes a scheduler that can periodically fetch LeetCode problems, extract their details, and store them in the questions table.

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
| `PORT` | `3001` | Port the service listens on |
| `DB_HOST` | `postgres` | PostgreSQL host (`localhost` when running outside Docker) |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `peerprep_questions` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |
| `USER_SERVICE_URL` | URL of the User Service for admin verification |
| `AWS_REGION` | AWS region of your S3 bucket (e.g. `ap-southeast-1`) |
| `AWS_ACCESS_KEY_ID` | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `S3_BUCKET_NAME` | Name of your S3 bucket |
| `LEETCODE_API_URL` | `http://leetcode-api:3000` | Base URL used by the scheduler to fetch LeetCode problems |
| `LEETCODE_SYNC_CRON` | `* * * * *` | Cron schedule for the sync job. Use `* * * * *` for testing and `0 * * * *` for hourly runs |
| `LEETCODE_FETCH_LIMIT` | `2` | Maximum number of questions processed in one scheduler run |
| `LEETCODE_BATCH_SIZE` | `5` | Number of list results fetched before per-question detail requests |
| `LEETCODE_REQUEST_DELAY_MS` | `5000` | Delay between question detail fetches |
| `LEETCODE_MAX_RETRIES` | `3` | Maximum retry attempts for failed requests |
| `LEETCODE_RETRY_DELAY_MS` | `10000` | Delay between retries for non-rate-limit failures |
| `LEETCODE_RATE_LIMIT_DELAY_MS` | `300000` | Backoff delay after an HTTP 429 response |
| `LEETCODE_RUN_ON_START` | `false` | Whether to trigger one sync shortly after startup |


---

## LeetCode Scheduler

The scheduler is started with the Question Service and is implemented in `src/services/leetcodeScheduler.js`.

### What it does

- Fetches LeetCode problem stubs in batches from the configured API.
- Fetches per-problem detail payloads and extracts:
  description, constraints, example inputs/outputs, difficulty, topics, and the LeetCode link.
- Inserts new questions into Postgres.
- Updates existing rows when they still contain placeholder or incomplete LeetCode details.
- Persists the current pagination offset so syncing can continue after restarts.

### Running schedule

- Testing configuration in this repo:
  `LEETCODE_SYNC_CRON=* * * * *`
- Hourly configuration:
  `LEETCODE_SYNC_CRON=0 * * * *`

Restart `question-service` after changing the cron expression so the new schedule takes effect.

### Operational notes

- Only one sync runs at a time. If a cron tick happens while a sync is still running, one follow-up run is queued instead of starting overlapping jobs.
- When the upstream API returns HTTP 429, the scheduler waits for `LEETCODE_RATE_LIMIT_DELAY_MS` before retrying.
- The scheduler supplements the seeded questions; it does not remove them.
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

```sql
CREATE TABLE scheduler_state (
    key        VARCHAR(100) PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- `test_cases` is stored as **JSONB** so Postgres understands the structure, validates it, and allows future querying inside the field.
- `image_urls` stores only URLs. Actual images are hosted on a third-party service.
- `updated_at` is automatically updated via a Postgres trigger on every row update.
- `scheduler_state` stores the persistent LeetCode pagination offset for the scheduler.

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
http://localhost:3001
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

### Get All Topics

| Method | Path | Auth |
|--------|------|------|
| GET | `/questions/topics` | None |

Returns every unique topic currently present in the question database, sorted alphabetically.

**Response 200**
```json
{
  "count": 4,
  "topics": ["Algorithms", "Arrays", "Data Structures", "Strings"]
}
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

### Get Random Question by Topic and Difficulty

| Method | Path | Auth |
|--------|------|------|
| GET | `/questions/random` | None |

**Query Parameters** - both required

| Param | Type | Description |
|-------|------|-------------|
| `topic` | string | Exact topic to match, e.g. `Arrays` |
| `difficulty` | string | `Easy`, `Medium`, or `Hard` |

**Examples**
```
GET /questions/random?topic=Arrays&difficulty=Medium
GET /questions/random?topic=Algorithms&difficulty=Hard
```

**Response 200**
```json
{
  "question": {
    "questionId": 12,
    "title": "Rotate Image",
    "description": "You are given an n x n 2D matrix...",
    "constraints": "n == matrix.length == matrix[i].length",
    "testCases": [
      {
        "input": "matrix = [[1,2,3],[4,5,6],[7,8,9]]",
        "output": "[[7,4,1],[8,5,2],[9,6,3]]"
      }
    ],
    "leetcodeLink": "https://leetcode.com/problems/rotate-image/",
    "difficulty": "Medium",
    "topics": ["Arrays", "Algorithms"],
    "imageUrls": [],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response 404**
```json
{
  "error": "Not Found",
  "message": "No question found for topic \"Graphs\" with difficulty \"Easy\"."
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

| Method | Path | Auth |
|--------|------|------|
| POST | `/questions` | `Authorization: Bearer <token>` |

**Content-Type:** `multipart/form-data`

**Required fields:** `title`, `description`, `difficulty`, `topics`, `testCases`

**Request Body**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | text | Yes | Question title |
| `description` | text | Yes | Full question description |
| `constraints` | text | No | Constraints string |
| `testCases` | text (JSON string) | Yes | e.g. `[{"input":"...","output":"..."}]` |
| `leetcodeLink` | text | No | URL to LeetCode problem |
| `difficulty` | text | Yes | `Easy`, `Medium`, or `Hard` |
| `topics` | text (JSON string) | Yes | e.g. `["Arrays","Hash Table"]` |
| `images` | file(s) | No | Image files (jpeg, png, gif, webp — max 5MB each) |
 
**Response 201** — created question object with `imageUrls` populated if images were uploaded.

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

| Method | Path | Auth |
|--------|------|------|
| PUT | `/questions/:id` | `Authorization: Bearer <token>` |

**Content-Type:** `multipart/form-data`

Send only the fields you want to update. All fields are optional — unset fields keep their existing values.

| Field | Type | Description |
|-------|------|-------------|
| `title` | text | Updated title |
| `description` | text | Updated description |
| `constraints` | text | Updated constraints |
| `testCases` | text (JSON string) | Updated test cases |
| `leetcodeLink` | text | Updated LeetCode link |
| `difficulty` | text | Updated difficulty |
| `topics` | text (JSON string) | Updated topics |
| `existingImageUrls` | text (JSON string) | Array of current URLs to **keep** — any not included are deleted from S3 |
| `images` | file(s) | New image files to upload and append |

**Image update behaviour:**
 
| Scenario | What to send |
|----------|-------------|
| Keep all existing images, add new ones | Send new `images` files only |
| Remove some existing images, keep others | Send `existingImageUrls` with only the URLs to keep |
| Remove all existing images | Send `existingImageUrls: []` |
| No image changes | Omit both `existingImageUrls` and `images` |

**Response 200** — updated question object.

---

### Delete Question *(Admin only)*

| Method | Path | Auth |
|--------|------|------|
| DELETE | `/questions/:id` | `Authorization: Bearer <token>` |

Deletes the question from the database **and** removes all associated images from S3.

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
curl http://localhost:3001/health

# Get all topics
curl http://localhost:3001/questions/topics

# Get all questions
curl http://localhost:3001/questions

# Filter by difficulty
curl "http://localhost:3001/questions?difficulty=Easy"

# Filter by multiple topics
curl "http://localhost:3001/questions?topics=Strings,Algorithms"

# Filter by topic and difficulty
curl "http://localhost:3001/questions?topics=Algorithms&difficulty=Medium"

# Get one random question by topic and difficulty
curl "http://localhost:3001/questions/random?topic=Arrays&difficulty=Medium"

# Get question by ID
curl http://localhost:3001/questions/1

# Create a question with no image
curl -X POST http://localhost:3001/questions \
  -H "Authorization: Bearer " \
  -F "title=Two Sum" \
  -F "description=Given an array of integers..." \
  -F "difficulty=Easy" \
  -F 'topics=["Arrays","Hash Table"]' \
  -F 'testCases=[{"input":"nums = [2,7,11,15], target = 9","output":"[0,1]"}]'

# Create a question with an image
curl -X POST http://localhost:3001/questions \
  -H "Authorization: Bearer " \
  -F "title=Two Sum" \
  -F "description=Given an array of integers..." \
  -F "difficulty=Easy" \
  -F 'topics=["Arrays","Hash Table"]' \
  -F 'testCases=[{"input":"nums = [2,7,11,15], target = 9","output":"[0,1]"}]' \
  -F "images=@/path/to/image.png"

# Update a question — text fields only
curl -X PUT http://localhost:3001/questions/1 \
  -H "Authorization: Bearer " \
  -F "difficulty=Medium"

# Update a question — remove an image (send only URLs you want to keep)
curl -X PUT http://localhost:3001/questions/1 \
  -H "Authorization: Bearer " \
  -F 'existingImageUrls=["https://s3.../image1.png"]'

# Update a question — remove all images
curl -X PUT http://localhost:3001/questions/1 \
  -H "Authorization: Bearer " \
  -F "existingImageUrls=[]"

# Update a question — add a new image
curl -X PUT http://localhost:3001/questions/1 \
  -H "Authorization: Bearer " \
  -F "images=@/path/to/newimage.png"

# Delete a question (also deletes all S3 images)
curl -X DELETE http://localhost:3001/questions/1 \
  -H "Authorization: Bearer "

# Upload images to an existing question
curl -X POST http://localhost:3001/questions/1/images \
  -H "Authorization: Bearer " \
  -F "images=@/path/to/image.png"

# Delete a specific image from a question
curl -X DELETE http://localhost:3001/questions/1/images \
  -H "Authorization: Bearer " \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://s3.../questions/uuid.png"}'
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
