# BeFocus API contract

The API is a small REST modular monolith. All timestamps are ISO-8601 UTC; dates used for habit entries are local calendar dates (`YYYY-MM-DD`). The authenticated user is resolved from the bearer token, never from a request-owned `userId`.

## Envelope and errors

Successful collection responses are JSON arrays or an object with a named collection. Errors use:

```json
{
  "timestamp": "2026-08-12T10:00:00Z",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "Please check the highlighted fields.",
  "errors": { "email": "Enter a valid email address." }
}
```

## Authentication

`POST /auth/register` `{ "name", "email", "password" }`

`POST /auth/login` `{ "email", "password" }`

Both return `{ "user": User, "accessToken": string, "refreshToken": string }`.

`POST /auth/refresh` `{ "refreshToken": string }` returns the same token shape.

`POST /auth/logout` invalidates the supplied refresh token and returns `204`.

`GET /users/me` returns `User`.

```json
{ "id": "uuid", "name": "Mai", "email": "mai@example.com", "timezone": "Asia/Ho_Chi_Minh" }
```

## Habits

`GET /habits?includeArchived=false` returns `Habit[]`.

`POST /habits` and `PUT /habits/{id}` accept:

```json
{
  "name": "Study English",
  "description": "Listening and vocabulary",
  "type": "BOOLEAN | COUNT | DURATION",
  "targetValue": 60,
  "unit": "minutes",
  "scheduleType": "DAILY | WEEKDAYS | TIMES_PER_WEEK",
  "weekdays": [1, 3, 5],
  "timesPerWeek": null,
  "reminderTime": "19:30",
  "color": "moss"
}
```

`GET /habits/{id}` returns a habit with `todayProgress`, `todayTarget`, `currentStreak`, `longestStreak`, and `entries` for the requested range.

`POST /habits/{id}/archive`, `DELETE /habits/{id}`.

`PUT /habits/{id}/entries/{date}` accepts `{ "value": number, "note": string }`; `DELETE` on the same URL undoes completion.

## Projects and tasks

`GET/POST /projects`, `PUT /projects/{id}`, `POST /projects/{id}/archive`.

`GET /tasks?projectId=uuid`, `POST /tasks` `{ "projectId", "title", "dueDate" }`, `PUT /tasks/{id}`, `POST /tasks/{id}/complete`.

## Focus sessions

`GET /focus-sessions/active` returns the current non-terminal session or `null`.

`POST /focus-sessions` accepts `{ "plannedDurationMinutes", "projectId", "taskId", "habitId" }` and persists `startedAt`, `expectedEndAt`, and `status=RUNNING`.

State transitions are `POST /focus-sessions/{id}/pause`, `/resume`, `/complete`, `/cancel`. A completion persists `actualDurationMinutes`, updates linked duration habit progress, and updates project/task metrics.

`POST /focus-sessions/{id}/interruptions` accepts `{ "kind": "PHONE | MESSAGE | NOISE | MEETING | OTHER", "note" }`.

## Dashboard and analytics

`GET /analytics/dashboard?date=YYYY-MM-DD` returns:

```json
{
  "date": "2026-08-12",
  "greeting": "Good morning, Mai",
  "habits": { "completed": 2, "total": 4, "minutes": 45 },
  "focusMinutes": 90,
  "tasks": { "completed": 1, "total": 3 },
  "currentStreak": 6,
  "weeklyFocus": [{ "date": "2026-08-06", "minutes": 35 }],
  "recentActivity": [],
  "activeSession": null
}
```

`GET /analytics/focus?from=YYYY-MM-DD&to=YYYY-MM-DD` returns prepared aggregates: total minutes, average session, completed sessions, completion rate, breakdowns by project/task/habit/weekday/hour, and interruptions.

`GET /analytics/habits?from=YYYY-MM-DD&to=YYYY-MM-DD` returns completion rate, streaks, consistency, and heatmap cells.

## Settings

`GET /settings` and `PUT /settings` support `defaultFocusMinutes`, `defaultBreakMinutes`, `longBreakMinutes`, `sessionsBeforeLongBreak`, `timezone`, `notificationsEnabled`, and `theme`.

