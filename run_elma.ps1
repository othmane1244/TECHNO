$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $projectRoot "backend"

Write-Host "ELMA - demarrage du serveur FastAPI" -ForegroundColor Cyan
Write-Host "Dossier backend : $backendDir" -ForegroundColor DarkGray

Set-Location $backendDir

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
