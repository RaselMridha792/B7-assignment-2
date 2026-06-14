# DevPulse — Internal Tech Issue & Feature Tracker (Backend)

A collaborative REST API for software teams to report bugs, suggest features, and
coordinate resolutions. Built with Node.js, TypeScript, Express, and PostgreSQL
(raw SQL only — no ORM, query builder, or JOINs).

- **Live API:** https://b7-assignment-2-production.up.railway.app
- **Repository:** https://github.com/RaselMridha792/B7-assignment-2

## Features

- 🔐 JWT authentication with `contributor` / `maintainer` roles
- 👤 User registration & login with bcrypt-hashed passwords (never exposed)
- 🐛 Create bug reports and feature requests
- 📋 List issues with sorting (`newest` / `oldest`) and filtering (`type`, `status`)
- 🔎 View a single issue with its reporter details
- ✏️ Update issues with role-aware rules (contributors edit their own **open** issues; maintainers edit any)
- 🗑️ Delete issues (maintainers only)
- 🧱 Modular architecture, reusable response/error utilities, centralized error handling
- 🔒 Strict TypeScript (no `any`), typed request/response interfaces

## Tech Stack

| Layer            | Technology                          |
| ---------------- | ----------------------------------- |
| Runtime          | Node.js (LTS 24.x+)                 |
| Language         | TypeScript                          |
| Framework        | Express.js (modular routers)        |
| Database         | PostgreSQL (native `pg` driver)     |
| Queries          | Raw SQL via `pool.query()` (no ORM/JOIN) |
| Auth             | `jsonwebtoken` (standard JWT)       |
| Password hashing | `bcrypt` (salt rounds: 10)          |
| CORS             | `cors`                              |

## Project Structure

```
src/
├── config/        # env config + database pool & schema init
├── middleware/    # auth (JWT verify) + centralized error handler
├── modules/
│   ├── auth/      # signup & login (controller + routes)
│   └── issues/    # issues CRUD (controller + routes)
├── types/         # shared TypeScript interfaces
├── utils/         # response formatter + async error wrapper
└── index.ts       # app bootstrap
```

## Setup

1. **Clone & install**

   ```bash
   git clone https://github.com/RaselMridha792/B7-assignment-2.git
   cd B7-assignment-2
   npm install
   ```

2. **Configure environment** — copy `.env.example` to `.env` and fill in values:

   ```bash
   cp .env.example .env
   ```

   | Variable         | Description                                              |
   | ---------------- | -------------------------------------------------------- |
   | `DATABASE_URL`   | PostgreSQL connection string (NeonDB / Supabase / local) |
   | `DATABASE_SSL`   | `true` for hosted Postgres; auto-detected if unset       |
   | `JWT_SECRET`     | Secret used to sign JWTs                                  |
   | `JWT_EXPIRES_IN` | Token lifetime (e.g. `8h`)                               |
   | `PORT`           | Server port (default `5000`)                             |
   | `CORS_ORIGIN`    | Allowed origin (`*` or your frontend URL)                |

3. **Run**

   ```bash
   npm run dev      # development (ts-node-dev, auto-reload)
   # or
   npm run build && npm start   # production
   ```

   Tables (`users`, `issues`) are created automatically on startup.
   Server runs at `http://localhost:5000`.

## API Endpoints

Base URL (local): `http://localhost:5000`
Base URL (live): `https://b7-assignment-2-production.up.railway.app`

| #   | Method   | Endpoint            | Access                    | Description                       |
| --- | -------- | ------------------- | ------------------------- | --------------------------------- |
| 1   | `POST`   | `/api/auth/signup`  | Public                    | Register a new user               |
| 2   | `POST`   | `/api/auth/login`   | Public                    | Authenticate & receive a JWT      |
| 3   | `POST`   | `/api/issues`       | Authenticated             | Create a bug/feature issue        |
| 4   | `GET`    | `/api/issues`       | Public                    | List issues (sort/type/status)    |
| 5   | `GET`    | `/api/issues/:id`   | Public                    | Get a single issue                |
| 6   | `PATCH`  | `/api/issues/:id`   | Maintainer / own open issue | Update an issue                 |
| 7   | `DELETE` | `/api/issues/:id`   | Maintainer                | Delete an issue                   |

**Auth header** for protected routes (standard JWT, no `Bearer` prefix required):

```
Authorization: <JWT_TOKEN>
```

**Query parameters** for `GET /api/issues`:

| Param    | Values                          | Default  |
| -------- | ------------------------------- | -------- |
| `sort`   | `newest`, `oldest`              | `newest` |
| `type`   | `bug`, `feature_request`        | (none)   |
| `status` | `open`, `in_progress`, `resolved` | (none) |

### Example

```bash
# Register
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@devpulse.com","password":"securePass123","role":"contributor"}'

# Login (returns token)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@devpulse.com","password":"securePass123"}'

# Create an issue
curl -X POST http://localhost:5000/api/issues \
  -H "Content-Type: application/json" \
  -H "Authorization: <JWT_TOKEN>" \
  -d '{"title":"DB timeout under load","description":"Pool exhausts after 50+ concurrent queries","type":"bug"}'

# List open bugs, oldest first
curl "http://localhost:5000/api/issues?type=bug&status=open&sort=oldest"
```

## Database Schema

### `users`

| Column       | Type          | Notes                                                  |
| ------------ | ------------- | ------------------------------------------------------ |
| `id`         | `SERIAL` PK   | Auto-incrementing identifier                           |
| `name`       | `TEXT`        | Required                                               |
| `email`      | `TEXT`        | Required, unique                                       |
| `password`   | `TEXT`        | bcrypt hash, required, never returned                  |
| `role`       | `TEXT`        | `contributor` (default) or `maintainer`                |
| `created_at` | `TIMESTAMPTZ` | Set on insert                                          |
| `updated_at` | `TIMESTAMPTZ` | Set on insert / refreshed on update                    |

### `issues`

| Column        | Type          | Notes                                                 |
| ------------- | ------------- | ----------------------------------------------------- |
| `id`          | `SERIAL` PK   | Auto-incrementing identifier                          |
| `title`       | `TEXT`        | Required, max 150 chars                               |
| `description` | `TEXT`        | Required, min 20 chars                                |
| `type`        | `TEXT`        | `bug` or `feature_request`                            |
| `status`      | `TEXT`        | `open` (default), `in_progress`, `resolved`           |
| `reporter_id` | `INTEGER`     | References `users.id` (validated in app, no FK)       |
| `created_at`  | `TIMESTAMPTZ` | Set on insert                                         |
| `updated_at`  | `TIMESTAMPTZ` | Set on insert / refreshed on update                   |

## Response Format

**Success**

```json
{ "success": true, "message": "Operation description", "data": {} }
```

**Error**

```json
{ "success": false, "message": "Error description", "errors": "Error details" }
```

## Deployment

1. Provision a PostgreSQL database (NeonDB / Supabase / ElephantSQL) and copy its connection string.
2. Deploy to Vercel / Render / Railway.
3. Set environment variables (`DATABASE_URL`, `JWT_SECRET`, etc.) on the platform.
4. Verify each endpoint against the live URL (incognito) before submitting.
