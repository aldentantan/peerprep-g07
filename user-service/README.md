# User Service

The User Service manages account registration, authentication, profile updates, and role management for PeerPrep.

## Tech Stack

- Node.js 20 + Express
- PostgreSQL 16
- Docker + Docker Compose

## Project Structure

```text
user-service/
|- Dockerfile
|- package.json
|- src/
   |- index.js
   |- controllers/
   |  |- auth-controller.js
   |  |- user-controller.js
   |- routes/
   |  |- auth-routes.js
   |  |- user-routes.js
   |- middleware/
   |  |- access-control.js
   |- database/
   |  |- db.js
   |  |- init.sql
   |  |- query.js
   |- utils/
      |- view.js
```

## Prerequisites

- Docker Desktop (recommended), or Docker Engine + Compose plugin
- A root `.env` file in the repository


## Run with Docker

Run from the repository root (not from `user-service/`):

```bash
docker compose up --build user-service user-postgres
```

Service endpoints:

- User Service: `http://localhost:<USER_SERVICE_PORT>`
- Postgres: `localhost:<DEFAULT_DB_PORT>`

### Common Commands

Start in background:

```bash
docker compose up -d --build user-service user-postgres
```

View logs:

```bash
docker compose logs -f user-service
```

Stop:

```bash
docker compose down
```

Reset DB and re-run schema:

```bash
docker compose down -v
docker compose up --build user-service user-postgres
```

## Root Admin Initialization

On startup, the service attempts to create a `root-admin` user from:

- `ADMIN_EMAIL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

Important behavior:

- If the admin email already exists, the service leaves that user unchanged.
- To force re-initialization from `init.sql` and startup logic, reset volumes with `docker compose down -v`.

## Run Locally (Without Docker for API)

You can run only PostgreSQL in Docker and run the API locally.

1. Start user Postgres container from repository root:

```bash
docker compose up -d user-postgres
```

2. In `user-service/`, install dependencies:

```bash
npm install
```

3. Export environment variables in your shell so `src/index.js` can read DB and JWT settings.

4. Start the API:

```bash
npm run dev
# or
npm start
```

## API Reference

Base URL: `http://localhost:<USER_SERVICE_PORT>`

### API Summary

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Authenticate a user and return a JWT token. |
| `GET` | `/auth/internal/role-check` | Authenticated | Return the authenticated user's role. |
| `POST` | `/users` | Public | Create a new user account. |
| `GET` | `/users/me` | Authenticated | Retrieve the authenticated user's profile. |
| `PATCH` | `/users/me` | Authenticated | Update the authenticated user's profile fields. |
| `PATCH` | `/users/me/password` | Authenticated | Change the authenticated user's password. |
| `DELETE` | `/users/me` | Authenticated | Delete the authenticated user's account (not allowed for `root-admin`). |
| `GET` | `/users/by-username/:username` | Authenticated | Retrieve a user profile by username. |
| `GET` | `/users/all` | Root Admin | Retrieve a paginated list of users. |
| `PATCH` | `/users/:email/role` | Root Admin | Update a user's role to `user`, `admin`, or `root-admin`. |

### Auth Routes

`POST /auth/login`

- Request body:

```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

- Success response:

```json
{
  "token": "<jwt-token>"
}
```

`GET /auth/internal/role-check`

- Header: `Authorization: Bearer <jwt-token>`
- Success response:

```json
{
  "role": "user"
}
```

### User Routes

`POST /users` (Public)

- Creates a new user.
- Password policy: at least 8 chars, with uppercase, lowercase, and digit.

Request:

```json
{
  "email": "user@example.com",
  "username": "user1",
  "password": "Password123"
}
```

`GET /users/me` (Authenticated)

- Header: `Authorization: Bearer <jwt-token>`
- Returns profile data.

`PATCH /users/me` (Authenticated)

- Header: `Authorization: Bearer <jwt-token>`
- Returns profile data and updated jwt-token
- Request body requires `username` and may include optional fields:

```json
{
  "username": "newName",
  "preferred_language": "TypeScript",
  "topics_of_interest": ["Trees", "DP"]
}
```

`PATCH /users/me/password` (Authenticated)

- Header: `Authorization: Bearer <jwt-token>`

```json
{
  "current_password": "OldPassword123",
  "new_password": "NewPassword123"
}
```

`DELETE /users/me` (Authenticated)

- Header: `Authorization: Bearer <jwt-token>`
- `root-admin` users are blocked from self-deletion.

`GET /users/by-username/:username` (Authenticated)

- Header: `Authorization: Bearer <jwt-token>`
- Returns user profile for the given username.

`GET /users/all` (Root Admin only)

- Header: `Authorization: Bearer <jwt-token>`
- Returns a paginated list of users.

`PATCH /users/:email/role` (Root Admin only)

- Header: `Authorization: Bearer <jwt-token>`

```json
{
  "role": "admin"
}
```

- Valid roles: `user`, `admin`, `root-admin`.

## Response Shape

Most user endpoints return the mapped view below (no password hash):

```json
{
  "email": "user@example.com",
  "username": "user1",
  "access_role": "user",
  "preferred_language": "JavaScript",
  "topics_of_interest": ["Arrays", "Graphs"],
  "created_at": "2026-03-26T10:00:00.000Z"
}
```

## Notes

- `init.sql` creates the `users` table and default columns.
- The service does not currently expose a `/health` endpoint.
