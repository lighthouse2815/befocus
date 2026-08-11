# BeFocus

BeFocus is a full-stack personal productivity application that connects habit tracking, persistent focus sessions, lightweight project/task management, and data-backed analytics. A completed focus session can contribute directly to a duration habit, so progress is derived from work that actually happened instead of duplicated manual check-ins.

## What is included

- JWT registration, login, refresh, logout, current-user lookup, and protected routes.
- Boolean, count, and duration habits with schedules, progress, entries, and schedule-aware streaks.
- Timestamp-based focus sessions with pause/resume/complete/cancel state transitions and interruption logging.
- Projects and tasks linked to focus sessions.
- A practical dashboard and server-computed focus/habit analytics.
- Responsive React UI with accessible states, real API data, and no production seed data.
- PostgreSQL migrations, Docker Compose, CI, Playwright E2E coverage, OpenAPI, and deployment manifests.

## Quick start with Docker

Requirements: Docker Desktop (or Docker Engine with Compose v2) and ports `5173`, `8080`, and `5432` available.

```bash
git clone https://github.com/lighthouse2815/befocus.git
cd befocus
cp .env.example .env
docker compose up --build
```

On PowerShell, replace the copy command with:

```powershell
Copy-Item .env.example .env
```

Open:

- Application: <http://localhost:5173>
- API health: <http://localhost:8080/actuator/health>
- Swagger UI: <http://localhost:8080/swagger-ui.html>
- OpenAPI JSON: <http://localhost:8080/v3/api-docs>

Flyway runs automatically before the API accepts traffic. The frontend container serves the Vite build through Nginx and proxies `/api/*` to the backend, so browser requests remain same-origin.

Stop the stack without deleting local database data:

```bash
docker compose down
```

Delete the development database volume as well:

```bash
docker compose down --volumes
```

## Native development

Requirements: Java 21, Node.js 22, npm, and Docker/PostgreSQL 16.

Start only PostgreSQL:

```bash
docker compose up -d postgres
```

Run the backend:

```bash
cd backend
./mvnw spring-boot:run
```

On Windows use `mvnw.cmd spring-boot:run`. The Maven wrapper is committed, so a system Maven installation is not required.

Run the frontend in a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

For native frontend development, set `VITE_API_URL=http://localhost:8080/api/v1` if the Vite development proxy is not being used.

## Environment configuration

Copy `.env.example` to `.env` for Compose. Never commit `.env` or real secrets.

| Variable | Purpose | Development default |
| --- | --- | --- |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Local Compose database | `befocus`, `befocus`, development-only password |
| `DB_URL` | JDBC datasource URL; takes precedence over `DATABASE_URL` | Local PostgreSQL JDBC URL |
| `DB_USERNAME`, `DB_PASSWORD` | Datasource credentials when using `DB_URL` | Local Compose credentials |
| `DATABASE_URL` | Provider URL in `postgres://` or `postgresql://` form | Unset |
| `JWT_SECRET` | Signing secret, at least 32 random bytes | Unsafe development value |
| `JWT_ACCESS_TTL_SECONDS` | Access-token lifetime | `1800` |
| `JWT_REFRESH_TTL_SECONDS` | Refresh-token lifetime | `1209600` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated direct browser API origins | Local Vite origins |
| `APP_TIMEZONE` | Server fallback zone; persisted instants remain UTC | `UTC` |
| `SEED_ENABLED` | Enables the idempotent development seed | `false` |
| `VITE_API_URL` | Browser API base URL at build time | `/api/v1` |
| `BACKEND_HOSTPORT` | Nginx upstream inside Docker/private networking | `backend:8080` |
| `POSTGRES_PORT`, `BACKEND_PORT`, `FRONTEND_PORT` | Published local ports | `5432`, `8080`, `5173` |

Generate a production secret with a password manager or a cryptographically secure generator. Do not reuse the development default.

## Architecture

```text
Browser
  -> React / Vite / Nginx (frontend, :5173 locally)
       -> /api proxy
            -> Spring Boot modular monolith (backend, :8080)
                 -> Spring Data JPA + Flyway
                      -> PostgreSQL 16
```

The backend follows `controller -> service -> repository -> PostgreSQL`; business rules stay in services and entities are not returned directly from HTTP controllers. The frontend keeps remote data in TanStack Query and uses Zustand only for appropriate client state such as authentication/timer presentation.

Focus timers use server timestamps (`startedAt`, `expectedEndAt`) as the source of truth. The browser derives the remaining time from the current clock, so tab throttling or refresh does not create a second session or corrupt the countdown.

More detail: [architecture](docs/ARCHITECTURE.md) and [API contract](docs/API_CONTRACT.md).

## Project layout

```text
backend/                 Spring Boot API, Flyway migrations, backend tests
frontend/                React application, component/unit tests, Nginx image
e2e/                     Playwright browser flows
docs/                    Architecture, API, database, deployment, verification
scripts/                 Local/CI verification and readiness helpers
.github/workflows/ci.yml Frontend, backend, Compose, and E2E CI
docker-compose.yml       PostgreSQL + backend + frontend local production stack
render.yaml              Render Blueprint for database and both web services
vercel.json              Frontend-only Vercel build configuration
```

## Database migrations and development data

Flyway SQL migrations in `backend/src/main/resources/db/migration` are the schema source of truth. Production does not use `ddl-auto=create` and does not enable seed data. See [database and Flyway guide](docs/DATABASE.md).

To load the idempotent development/demo dataset, set `SEED_ENABLED=true` before starting the backend. Keep it `false` in staging and production. Exact seed contents and cleanup steps are in [development data](docs/SEED_DATA.md).

## Testing and production builds

Frontend:

```bash
cd frontend
npm ci
npm run lint
npm test
npm run build
```

Backend:

```bash
cd backend
./mvnw --batch-mode verify
```

Full browser flows against the Docker stack:

```bash
docker compose up --build --detach --wait
cd e2e
npm ci
npx playwright install chromium
npm test
```

Windows developers can run `scripts/verify.ps1`; Unix-like systems can run `scripts/verify.sh`. CI runs the same lint, test, package, Compose, health, and Playwright gates on pushes and pull requests. The exact Definition-of-Done evidence is tracked in [verification](docs/VERIFICATION.md).

## API documentation

The API base is `/api/v1`. Interactive Swagger documentation and the raw OpenAPI document are generated by the running backend. See [OpenAPI usage](docs/OPENAPI.md) for authentication, error envelopes, and production exposure guidance.

## Deployment

`render.yaml` provisions PostgreSQL, the backend container, and the frontend container as one Render Blueprint. The frontend uses private-network proxying to the backend and does not bake a provider-specific API URL into its bundle.

Vercel and Railway alternatives, required environment variables, migration behavior, health checks, rollback notes, and the current deployment-auth limitation are documented in [deployment](docs/DEPLOYMENT.md).

## Security notes

- Passwords are hashed; refresh tokens are rotated/invalidated rather than stored as reusable plaintext credentials.
- Resource access is always scoped to the authenticated owner.
- DTO validation and centralized error handling prevent stack traces or persistence entities from leaking to clients.
- Production should use HTTPS, a unique JWT secret, restrictive CORS values, managed PostgreSQL backups, and `SEED_ENABLED=false`.

## Operational limitations

- The optional AI coach is intentionally excluded; insights are deterministic and require enough real observations before presenting a conclusion.
- Browser notifications depend on user permission and browser support; denial does not block the rest of the product.
- Free hosting plans may sleep, expire databases, or impose build/runtime quotas. Use a paid persistent database and backups for real production data.
