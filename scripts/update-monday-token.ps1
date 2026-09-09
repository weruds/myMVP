# update-monday-token.ps1
# Updates MONDAY_API_TOKEN in this workspace's scripts/.env.
# Usage: .\scripts\update-monday-token.ps1 -Token "your-token-here"

param(
  [Parameter(Mandatory=$true)]
  [string]$Token
)

$envFile = "$PSScriptRoot\.env"

if (-not (Test-Path $envFile)) {
  Write-Host "ERROR: $envFile not found." -ForegroundColor Red
  exit 1
}

$content = Get-Content $envFile -Raw
if ($content -notmatch 'MONDAY_API_TOKEN=') {
  Write-Host "ERROR: MONDAY_API_TOKEN key not found in $envFile." -ForegroundColor Red
  exit 1
}

$newContent = $content -replace '(?m)^MONDAY_API_TOKEN=.*', "MONDAY_API_TOKEN=$Token"
Set-Content -Path $envFile -Value $newContent -NoNewline

Write-Host "OK  Updated MONDAY_API_TOKEN in $envFile" -ForegroundColor Green
