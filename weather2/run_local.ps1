# ==============================================================================
# National Weather Big Data Analytics Platform (MoES / IMD - SIH 2026)
# Localhost Orchestrator (Windows PowerShell)
# ==============================================================================

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "  IMD DISASTER INTELLIGENCE PLATFORM // CRISIS NODE 26069" -ForegroundColor Yellow
Write-Host "  Ministry of Earth Sciences (MoES) | SIH 2026" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Seed Database with Historical Benchmark Data
Write-Host "[1/3] Initializing Datastore & Seeding Indian Historical Records..." -ForegroundColor Green
python "$rootPath\seed_data.py"

# 2. Launch FastAPI Backend Service
Write-Host ""
Write-Host "[2/3] Launching FastAPI REST & WebSocket Engine on http://localhost:8000..." -ForegroundColor Green
$backendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootPath'; Write-Host 'IMD FASTAPI TELEMETRY ENGINE' -ForegroundColor Cyan; python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload" -PassThru

# Give backend 2 seconds to initialize
Start-Sleep -Seconds 2

# 3. Launch React Frontend
Write-Host ""
Write-Host "[3/3] Launching React Tactical Command Console on http://localhost:5173..." -ForegroundColor Green
Write-Host ""
Write-Host ">>> PLATFORM READY <<<" -ForegroundColor Yellow
Write-Host "  Frontend Dashboard : http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend API / Docs : http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "  WebSocket Stream   : ws://localhost:8000/events/stream" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to terminate frontend. Close the backend PowerShell window to stop API." -ForegroundColor Gray
Write-Host "=====================================================================" -ForegroundColor Cyan

Set-Location "$rootPath\frontend"
npm run dev
