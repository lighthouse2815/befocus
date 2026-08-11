# Development seed data

The backend includes an idempotent development/demo seed guarded by `SEED_ENABLED`. It is disabled by default and must remain disabled in staging and production.

To seed an empty Docker database:

```bash
SEED_ENABLED=true docker compose up --build
```

PowerShell:

```powershell
$env:SEED_ENABLED = 'true'
docker compose up --build
```

The seed runs through the same persistence rules as the application and checks stable identifiers before inserting, so restarting a seeded development environment does not intentionally duplicate records. The seeded account and dataset are defined in `DevelopmentSeedConfig` in the backend source; do not reuse those credentials for a real account.

Development-only account:

- Email: `demo@befocus.local`
- Password: `BeFocusDemo2026!`

The dataset includes three habit types, scheduled entries, reminders, one project, open/completed tasks, linked completed focus sessions, and an interruption. This makes Dashboard, Project, Habit, and Analytics screens useful immediately without enabling seed data for normal production users.

After the first successful seed, turn the flag off again:

```powershell
Remove-Item Env:SEED_ENABLED
```

To reset all local data, stop the stack and explicitly remove the Compose volume:

```bash
docker compose down --volumes
```

This permanently deletes the local PostgreSQL volume. It does not affect a managed or remote database.

Production images contain the seed code only as a guarded development facility; `render.yaml` explicitly sets `SEED_ENABLED=false`.
