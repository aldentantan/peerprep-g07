# User Service (Docker Only)

This service manages user accounts, authentication, and user roles for PeerPrep.

## Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin)

## Run the service

From the `user-service` folder:

```bash
docker compose up --build
```

Service URLs:

- User service: `http://localhost:3000`
- Postgres: `localhost:5432`

All configuration is already defined in `docker-compose.yml` (no `.env` needed).

## Reset database (fresh init)

Use this when you want to recreate schema and seed data from scratch:

```bash
docker compose down -v
docker compose up --build
```

- `-v` removes the Postgres volume.
- On next startup, `src/database/init.sql` runs automatically.

## Default root admin (for first login)

The `user-service` container seeds/updates a root admin user at startup using values in `docker-compose.yml`:

- `ADMIN_EMAIL=admin@example.com`
- `ADMIN_PASSWORD=admin123`
- `ADMIN_USERNAME=admin`

Change these in `docker-compose.yml` if needed, then run `docker compose down -v` and `docker compose up --build`.

## Common commands

Start in background:

```bash
docker compose up -d --build
```

View logs:

```bash
docker compose logs -f user-service
```

Stop services:

```bash
docker compose down
```

## API quick reference

Base URL: `http://localhost:3000`

### Auth

- `POST /auth/login`
  - Body:
    ```json
    {
      "email": "admin@example.com",
      "password": "admin123"
    }
    ```
  - Returns JWT token.

- `GET /auth/internal/role-check`
  - Header: `Authorization: Bearer <token>`
  - Returns role for authenticated user.

### Users

- `POST /users`
  - Create user
  - Body:
    ```json
    {
      "email": "user@example.com",
      "username": "user1",
      "password": "password123"
    }
    ```

- `GET /users/me`
  - Header: `Authorization: Bearer <token>`

- `PATCH /users/me`
  - Header: `Authorization: Bearer <token>`
  - Body:
    ```json
    {
      "username": "newName"
    }
    ```

- `GET /users/by-email/:email` (root admin only)
  - Header: `Authorization: Bearer <token>`

- `PATCH /users/:email/role` (root admin only)
  - Header: `Authorization: Bearer <token>`
  - Body:
    ```json
    {
      "role": "user"
    }
    ```

## Notes

- JWT secret and DB credentials are set in `docker-compose.yml`.
- If login fails after changing admin credentials, reset with `docker compose down -v` and restart.
