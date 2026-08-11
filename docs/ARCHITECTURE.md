# BeFocus architecture

BeFocus is a modular monolith: a Vite React client, a Spring Boot REST API, and PostgreSQL. Server state stays in TanStack Query; Zustand only holds client preferences and active-timer presentation state. The backend follows controller → service → repository with DTOs at the HTTP boundary.

## Runtime

- `frontend/`: React + TypeScript + Vite + React Router + TanStack Query + Zustand + Tailwind + Recharts.
- `backend/`: Java 21 + Spring Boot + Spring Web/Data JPA/Security + Flyway + JWT + Bean Validation.
- `postgres`: PostgreSQL 16.

The timer source of truth is `startedAt`/`expectedEndAt` on the server. The browser derives remaining time from timestamps and rehydrates the active session after refresh.

## Security boundaries

Every repository query is scoped to the authenticated user. Entities are never serialized directly. Validation occurs at the DTO boundary and in services. Refresh tokens are hashed at rest and rotated on use.

## Delivery increments

1. Foundation and shell
2. Authentication
3. Habit tracking and schedule-aware streaks
4. Focus sessions and linked habit progress
5. Projects/tasks and dashboard
6. Analytics, tests, Docker, and production deployment

