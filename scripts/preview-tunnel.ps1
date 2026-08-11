param(
  [int]$Port = 5173
)

$ErrorActionPreference = 'Stop'
$healthUrl = "http://127.0.0.1:$Port/health"

node "$PSScriptRoot\wait-for-url.mjs" $healthUrl

Write-Host "Opening a temporary public tunnel to http://127.0.0.1:$Port"
Write-Host 'The generated URL is public until this process is stopped with Ctrl+C.'

if (Get-Command cloudflared -ErrorAction SilentlyContinue) {
  cloudflared tunnel --no-autoupdate --url "http://127.0.0.1:$Port"
  exit $LASTEXITCODE
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Neither cloudflared nor Docker is available.'
}

docker run --rm --init cloudflare/cloudflared:latest tunnel --no-autoupdate --url "http://host.docker.internal:$Port"
exit $LASTEXITCODE
