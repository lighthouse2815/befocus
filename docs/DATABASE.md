# PostgreSQL and Flyway

PostgreSQL is the only supported production database. Flyway migrations under `backend/src/main/resources/db/migration` are the source of truth for tables, foreign keys, uniqueness rules, indexes, and enum/check constraints.

## Startup behavior

Spring Boot applies pending migrations before the application becomes ready. Hibernate validates the mapped schema; it must not create or replace the production schema. A migration failure keeps the backend unhealthy so the frontend is not started by Docker Compose.

Inspect migration history locally:

```bash
docker compose exec postgres psql -U befocus -d befocus \
  -c "select installed_rank, version, description, success from flyway_schema_history order by installed_rank;"
```

On PowerShell, the same `docker compose exec` command works on one line.

## Adding a migration

1. Create the next immutable SQL file, for example `V2__add_focus_session_indexes.sql`.
2. Include database constraints and indexes with the data change; do not rely only on Java validation.
3. Test against a fresh database with `docker compose down --volumes` followed by `docker compose up --build`.
4. Test upgrading a populated development database without deleting its volume.
5. Run backend integration tests and inspect `flyway_schema_history`.

Never edit a migration already applied to a shared environment. Add a new forward migration. Avoid `flyway repair` as a normal deployment action because it can hide drift; use it only after diagnosing and documenting a checksum issue.

## Backups and rollback

Take a managed snapshot or `pg_dump` before a destructive production migration. Application rollback does not automatically roll back a schema. Prefer backward-compatible expand/migrate/contract changes when a deployment may need to run mixed application versions.

Example local backup:

```bash
docker compose exec -T postgres pg_dump -U befocus -d befocus -Fc > befocus.dump
```

Restore into an empty database with `pg_restore`; verify the target database and backup file before running any restore command.

## Provider URLs

Local/native development uses `DB_URL=jdbc:postgresql://...` plus `DB_USERNAME` and `DB_PASSWORD`. Hosted providers can supply a single `DATABASE_URL` beginning with `postgres://` or `postgresql://`; the backend normalizes it to a JDBC datasource. `DB_URL` takes precedence when both are set.
