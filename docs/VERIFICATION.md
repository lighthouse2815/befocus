# Definition-of-Done verification

This file maps the product specification to authoritative evidence. A green build alone is not enough: browser behavior, persistence, authorization, migrations, and deployment health must all be observed.

## Automated gates

| Requirement | Evidence | Command / CI job | Current status |
| --- | --- | --- | --- |
| Frontend strict compilation and production bundle | TypeScript/Vite exit code and emitted `dist` | `cd frontend && npm run build`; CI `frontend` | Awaiting final integrated run |
| Frontend lint | ESLint exit code | `cd frontend && npm run lint`; CI `frontend` | Awaiting final integrated run |
| Frontend component/forms/timer/auth tests | Vitest report | `cd frontend && npm test`; CI `frontend` | Awaiting final integrated run |
| Backend unit/service/security/integration tests | Maven Surefire/Failsafe reports | `cd backend && ./mvnw verify`; CI `backend` | Awaiting final integrated run |
| Backend production package | Spring Boot JAR from Maven verify | `cd backend && ./mvnw verify`; CI `backend` | Awaiting final integrated run |
| Compose model | Compose parser accepts all interpolation/dependencies | `docker compose config --quiet`; CI `compose` | Awaiting final integrated run |
| PostgreSQL migration from empty database | Healthy API after fresh Compose volume | `docker compose down -v && docker compose up --build --wait` | Awaiting final integrated run |
| API and frontend health | HTTP 2xx responses | `node scripts/wait-for-url.mjs ...`; CI `compose` | Awaiting final integrated run |
| Required browser flows | Playwright HTML report/traces | `cd e2e && npm test`; CI `compose` | Awaiting final integrated run |

## Required E2E flows

| Flow | Browser assertion |
| --- | --- |
| Register -> login -> create Boolean habit -> complete -> dashboard | The authenticated dashboard reflects the completed habit/progress after navigation or reload |
| Create duration habit -> run/complete linked focus session | Habit detail/progress increases from the persisted completed session |
| Create project -> create task -> run focus session -> project analytics | The project/task and its focus contribution appear in project/analytics UI |

Tests must use unique accounts, real HTTP requests through the UI, and the real PostgreSQL-backed API. They must not use mocked API responses or hard-coded production charts.

## Backend rule coverage to inspect

The Maven report must contain focused tests for:

- registration/login/refresh/logout and expired/invalid JWT handling;
- ownership/IDOR attempts across two users;
- daily, weekday, times-per-week, and custom streak schedules;
- timezone boundaries around local midnight;
- timestamp-derived focus duration and legal/illegal state transitions;
- idempotent active-session recovery (no duplicate session on refresh);
- completed linked focus session -> duration habit progress/completion;
- analytics aggregation, interruption counts, and insufficient-sample insights.

Source presence is not sufficient evidence; the named tests must execute successfully.

## Manual release smoke test

Run on the deployed HTTPS URL with a new account:

1. Register, log out, log back in, refresh the page, and verify the session is restored or cleanly refreshed.
2. Create each habit type and exercise edit, archive, delete confirmation, completion, undo, history, and schedule-aware streak display.
3. Start a focus session linked to a duration habit, refresh during the timer, pause/resume, log an interruption, complete it, and verify habit progress.
4. Create a project/task, complete a linked focus session, and verify project totals and server-generated analytics.
5. Check dashboard and analytics ranges with real records, including empty/insufficient-data messages.
6. Repeat primary navigation at desktop, tablet, and mobile widths; verify keyboard focus, labels, dialog focus, and timer announcement.
7. Attempt validation errors, offline/API failure, expired auth, and destructive confirmation paths.
8. Use a second account to verify direct IDs from the first account return forbidden/not-found without leaking data.

Record the deployed URL, commit SHA, date, test account (never its password), browser versions, and any provider logs in the release record.

## Deployment evidence

Provider-ready manifests are present, but no provider credential variables or authenticated deployment CLI were available on this workstation during initial setup. A successful live provider deployment therefore remains unproven until the Render/Railway/Vercel dashboard or API reports healthy services and the manual smoke test is recorded.
