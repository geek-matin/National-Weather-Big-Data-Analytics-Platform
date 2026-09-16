# ==============================================================================
# National Weather Big Data Analytics Platform — Local Launch Script
# Starts FastAPI Backend (Port 8000) and Vite React Frontend (Port 5173)
# ==============================================================================

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " NATIONAL WEATHER BIG DATA PLATFORM // LAUNCHING LOCAL ENGINE   " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Check / Seed Databases if needed
Write-Host "[*] Checking Database Seed Status..." -ForegroundColor Yellow
python -m backend.seed
python -m weather2.seed_data

# 2. Start FastAPI Backend in background job
Write-Host "[*] Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
}

# 3. Start Vite Frontend
Write-Host "[*] Starting Vite Frontend on http://localhost:5173..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\frontend"
npm run dev
