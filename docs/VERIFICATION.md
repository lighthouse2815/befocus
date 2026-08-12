# Definition-of-Done verification

This file maps the product specification to authoritative evidence. A green build alone is not enough: browser behavior, persistence, authorization, migrations, and deployment health must all be observed.

## Release record — 2026-08-12

- Verified implementation/runtime commit: `4a41b3bdefa74630de7500f2c1737e7ed9267f10`. The following verification-only commit adds security tests and this release record without changing runtime code.
- Runtime: Java 21, Node.js 22 image, PostgreSQL 16.14, Chromium via Playwright.
- Primary deployed surface: local production Compose stack at `http://127.0.0.1:5173` with frontend, backend, and PostgreSQL healthy.
- Public smoke surface: an ephemeral Cloudflare Quick Tunnel was verified for both the frontend and `/api/v1/auth/login`. Its generated URL is intentionally not treated as stable production hosting because it has no uptime guarantee and depends on the local stack remaining online.
- Stable provider deployment remains an operator step because no authenticated Render, Railway, Vercel, or Cloudflare account was available in this environment. `render.yaml` is the full-stack deployment contract.

## Automated gates

| Requirement | Evidence | Command / CI job | Current status |
| --- | --- | --- | --- |
| Frontend strict compilation and production bundle | TypeScript/Vite exit code and emitted `dist` | `cd frontend && npm run build`; CI `frontend` | PASS — 2,626 modules transformed |
| Frontend lint | ESLint exit code | `cd frontend && npm run lint`; CI `frontend` | PASS — no ESLint errors |
| Frontend component/forms/timer/auth tests | Vitest report | `cd frontend && npm test`; CI `frontend` | PASS — 9 files, 22 tests |
| Backend unit/service/security/integration tests | Maven Surefire/Failsafe reports | `cd backend && ./mvnw verify`; CI `backend` | PASS — 36 tests, 0 failures/errors |
| Backend production package | Spring Boot JAR from Maven verify | `cd backend && ./mvnw verify`; CI `backend` | PASS — executable JAR repackaged |
| Compose model | Compose parser accepts all interpolation/dependencies | `docker compose config --quiet`; CI `compose` | PASS |
| PostgreSQL migration from empty database | Healthy API after a fresh isolated Compose volume | `docker compose -p befocus-verify-4a41b3b up --build --wait` | PASS — V1 applied to PostgreSQL 16.14; isolated volume removed afterward |
| API and frontend health | HTTP 2xx responses | `/actuator/health`, `/health`, and Compose health checks | PASS — all three services healthy |
| Required browser flows | Playwright report | `cd e2e && npm test`; CI `compose` | PASS — 3 Chromium flows against the real Compose API/PostgreSQL |

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

Executed coverage is provided by `AuthServiceIntegrationTest`, `HabitControllerSecurityIntegrationTest`, `FocusControllerSecurityIntegrationTest`, `HabitScheduleServiceTest`, `HabitServiceIntegrationTest`, `FocusServiceIntegrationTest`, `ProjectTaskServiceIntegrationTest`, and `AnalyticsSettingsServiceIntegrationTest`. Together they cover malformed/expired access tokens, expired/rotated/revoked refresh tokens, owner scoping, validation envelopes, schedule-aware streaks, timezone boundaries, timestamp/state transitions, duplicate active-session prevention, linked duration progress, cancellation/interruption aggregation, and honest empty analytics.

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

Observed browser QA for this release:

- Dashboard, Analytics, and Settings rendered from real persisted API data at desktop width.
- Analytics exposed accessible labels for project/task/habit breakdowns and Recharts timing charts.
- A 390 x 844 mobile viewport had no horizontal overflow; the bottom navigation and account menu were usable.
- Browser console inspection returned no warnings or errors during the inspected routes.
- The seeded account `demo@befocus.local` authenticated successfully locally and through the public HTTPS smoke surface; credentials remain development-only.

## Deployment evidence

The implementation commit was pushed successfully and `git ls-remote origin refs/heads/main` returned its full SHA before the verification-only addendum. The local production Compose deployment and temporary public HTTPS smoke deployment are proven. GitHub Actions could not be read anonymously because the repository returned 404 outside its authenticated context; no CI result is inferred from that response.

Provider-ready manifests are present, but no provider credential variables or authenticated deployment CLI were available on this workstation. A durable live provider deployment therefore remains unproven until the Render/Railway/Vercel/Cloudflare dashboard or API reports healthy services. Do not treat an account-less Quick Tunnel as permanent production hosting.
