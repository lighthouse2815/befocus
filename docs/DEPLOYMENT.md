# Deployment

## Current delivery status

The repository contains provider-ready configuration, but this workstation does not currently expose Render, Railway, Vercel, GitHub CLI, or provider API credentials. A live deployment cannot be created or its URL verified from this environment until an authenticated provider connection exists. Pushing the repository can still trigger a provider already connected to GitHub.

## Render Blueprint (recommended)

`render.yaml` defines:

- a managed PostgreSQL database;
- `befocus-api`, built from `backend/Dockerfile`;
- `befocus-web`, built from `frontend/Dockerfile`;
- health checks for `/actuator/health` and `/health`;
- generated JWT secret and private-network frontend-to-backend routing.

Deploy it:

1. Push the repository to GitHub.
2. In Render, create a **Blueprint** and select this repository.
3. Review region and plan choices. Free plans are appropriate only for evaluation.
4. Apply the Blueprint and wait for the database, API, and web health checks.
5. Open the web service URL and run the smoke checks in [VERIFICATION.md](VERIFICATION.md).

The database connection is injected as `DATABASE_URL`. The frontend receives the backend's private `hostport` as `BACKEND_HOSTPORT`, so `/api/*` stays same-origin and no public API URL is baked into JavaScript.

Keep `SEED_ENABLED=false`. For a disposable demo environment only, temporarily enable it on the backend, allow one successful boot, then disable it and redeploy.

## Immediate temporary preview

After the local Compose stack is healthy, PowerShell users can expose the frontend through a Cloudflare Quick Tunnel without a provider account:

```powershell
.\scripts\preview-tunnel.ps1
```

The script waits for `/health`, then uses an installed `cloudflared` binary or the official Cloudflare Docker image. It prints a random public URL and keeps the tunnel open until `Ctrl+C`. The URL is not stable and must never be treated as a production deployment. Anyone with the URL can reach the application, so keep development seed credentials disabled and do not use real personal data.

## Railway

Create three services in one Railway project:

1. Add PostgreSQL.
2. Add a GitHub service for the backend with root directory `backend` and Dockerfile deployment.
3. Set `DATABASE_URL` to the PostgreSQL reference variable, generate `JWT_SECRET`, set both JWT TTL values, `APP_TIMEZONE=UTC`, and `SEED_ENABLED=false`.
4. Set the backend health path to `/actuator/health` and expose port `8080`.
5. Add a second GitHub service with root directory `frontend` and Dockerfile deployment.
6. Set `BACKEND_HOSTPORT` to the backend private-network host and port (for example a Railway service reference ending in `:8080`).
7. Set the frontend health path to `/health` and generate its public domain.

If the frontend calls the public API directly instead of using the private Nginx proxy, set `VITE_API_URL` before the image build and include the exact frontend origin in `CORS_ALLOWED_ORIGINS`.

## Vercel frontend with a hosted backend

`vercel.json` builds `frontend/` as a Vite SPA. Vercel does not deploy the Java API or PostgreSQL.

1. Deploy the backend and database first.
2. Import the repository into Vercel.
3. Set `VITE_API_URL=https://YOUR_API_HOST/api/v1` in all required Vercel environments.
4. Add the Vercel production/preview origins to backend `CORS_ALLOWED_ORIGINS`.
5. Redeploy so Vite receives the API URL at build time.

The SPA rewrite excludes `/api/*`; when using a cross-origin backend, all REST requests go to `VITE_API_URL`.

## Production checklist

- Use a unique, cryptographically random `JWT_SECRET`; rotating it signs out existing sessions.
- Enforce HTTPS and set restrictive CORS origins.
- Keep seed data disabled.
- Verify Flyway success before routing traffic.
- Confirm `/actuator/health` is `UP` and `/health` returns `200`.
- Register a new user, log in, create/complete a habit, and refresh an active focus timer.
- Verify an unauthorized user cannot access another account's identifiers.
- Configure managed PostgreSQL backups, retention, alerts, and restore testing.
- Review provider log retention so tokens, passwords, and request bodies are not collected.

## Rollback

Redeploy the previous application image/commit only after checking whether the new release applied a forward-only database migration. If schema compatibility is uncertain, keep the new API offline, restore from the pre-deploy snapshot in a controlled environment, and verify data before changing production routing.
