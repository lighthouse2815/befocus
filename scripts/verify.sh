#!/usr/bin/env sh
set -eu

(cd frontend && npm ci && npm run lint && npm test && npm run build)
(cd backend && ./mvnw --batch-mode --no-transfer-progress verify)
docker compose config --quiet

echo "Frontend, backend, and Compose validation passed."
