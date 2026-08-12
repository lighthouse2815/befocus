# BeFocus architecture

BeFocus is a modular monolith with two clients: a Vite React web client and an Expo Router React Native mobile client. Both consume one Spring Boot REST API backed by PostgreSQL. Server state stays in TanStack Query; Zustand only holds client preferences and active-timer presentation state. The backend follows controller → service → repository with DTOs at the HTTP boundary.

## Runtime

- `frontend/`: React + TypeScript + Vite + React Router + TanStack Query + Zustand + Tailwind + Recharts.
- `mobile/`: React Native + TypeScript + Expo Router + TanStack Query + Zustand + React Hook Form/Zod + Expo SecureStore/Notifications.
- `backend/`: Java 21 + Spring Boot + Spring Web/Data JPA/Security + Flyway + JWT + Bean Validation.
- `postgres`: PostgreSQL 16.

The timer source of truth is `startedAt`/`expectedEndAt` on the server. Each client derives remaining time from timestamps and rehydrates the active session after refresh or app restart. Mobile additionally reconciles the active session when it foregrounds or reconnects, and local notifications are presentation aids rather than authority over session state.

```text
Web client -------------------+
                              +--> /api/v1 --> Spring Boot --> PostgreSQL
Physical-device mobile client +
```

The mobile client does not connect to the database or reproduce streak, analytics, project, task, or focus-transition rules. Mutations go through the existing API, and affected TanStack Query keys are invalidated after server acknowledgement. Cached data may remain readable offline, but the client does not fabricate successful writes.

## Security boundaries

Every repository query is scoped to the authenticated user. Entities are never serialized directly. Validation occurs at the DTO boundary and in services. Refresh tokens are hashed at rest and rotated on use. On native mobile, the access/refresh pair is stored in Expo SecureStore with device-only accessibility; public Expo build variables contain configuration only and must never contain secrets.

## Delivery increments

1. Foundation and shell
2. Authentication
3. Habit tracking and schedule-aware streaks
4. Focus sessions and linked habit progress
5. Projects/tasks and dashboard
6. Analytics, tests, Docker, and production deployment
7. Expo mobile foundation and secure authentication
8. Mobile habits, focus lifecycle, projects/tasks, and local notifications
9. Mobile insights, accessibility, automated verification, EAS configuration, and physical-device release QA
