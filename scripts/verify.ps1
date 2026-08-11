$ErrorActionPreference = 'Stop'

Push-Location frontend
try {
  npm ci
  npm run lint
  npm test
  npm run build
} finally {
  Pop-Location
}

Push-Location backend
try {
  .\mvnw.cmd --batch-mode --no-transfer-progress verify
} finally {
  Pop-Location
}

docker compose config --quiet
Write-Host 'Frontend, backend, and Compose validation passed.'
