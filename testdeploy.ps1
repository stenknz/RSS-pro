param(
    [Parameter(Mandatory = $false)]
    [int]$Port = 8383,

    [Parameter(Mandatory = $false)]
    [string]$BackendPort = 8001,

    [Parameter(Mandatory = $false)]
    [switch]$SkipBuild,

    [Parameter(Mandatory = $false)]
    [switch]$RunTests
)

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

Write-Host "=== RSS Reader Pro - Acceptance Test Deploy ===" -ForegroundColor Cyan
Write-Host "Frontend port: $Port" -ForegroundColor Gray
Write-Host "Backend port:  $BackendPort" -ForegroundColor Gray
Write-Host ""

# Step 1: Run backend tests if requested
if ($RunTests) {
    Write-Host "[1/5] Running backend tests..." -ForegroundColor Yellow
    $PY = "python"
    if (Test-Path "graphify-out/.graphify_python") {
        $PY = Get-Content "graphify-out/.graphify_python" -Raw | ForEach-Object { $_.Trim() }
    }
    Push-Location "backend"
    & $PY -m pytest tests/ -v
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Backend tests failed. Aborting." -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
    Write-Host "Backend tests passed." -ForegroundColor Green
    Write-Host ""
}

# Step 2: Build Docker images
if (-not $SkipBuild) {
    Write-Host "[2/5] Building Docker images..." -ForegroundColor Yellow
    docker compose build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Docker build failed. Aborting." -ForegroundColor Red
        exit 1
    }
    Write-Host "Build complete." -ForegroundColor Green
} else {
    Write-Host "[2/5] Skipping build (--SkipBuild flag set)." -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Stop any existing containers
Write-Host "[3/5] Stopping existing containers..." -ForegroundColor Yellow
docker compose down -v 2>$null
Write-Host "Existing containers stopped." -ForegroundColor Green
Write-Host ""

# Step 4: Start containers on custom ports
Write-Host "[4/5] Starting containers on frontend=:$Port backend=:$BackendPort..." -ForegroundColor Yellow
$env:FRONTEND_PORT = $Port.ToString()
$env:BACKEND_PORT = $BackendPort.ToString()

docker compose -f docker-compose.yml up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker compose failed. Aborting." -ForegroundColor Red
    exit 1
}
Write-Host "Containers started." -ForegroundColor Green
Write-Host ""

# Step 5: Health check
Write-Host "[5/5] Running health check..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

$healthy = $false
for ($i = 0; $i -lt 10; $i++) {
    try {
        $resp = Invoke-RestMethod -Uri "http://localhost:$BackendPort/api/v1/health" -TimeoutSec 5 -ErrorAction Stop
        if ($resp.status -eq "ok") {
            $healthy = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 2
    }
}

if ($healthy) {
    Write-Host "Health check PASSED. Backend is healthy." -ForegroundColor Green
} else {
    Write-Host "Health check FAILED. Check container logs with 'docker compose logs'." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:$Port" -ForegroundColor Green
Write-Host "Backend:  http://localhost:$BackendPort" -ForegroundColor Green
Write-Host "API Docs: http://localhost:$BackendPort/docs" -ForegroundColor Green
Write-Host ""
Write-Host "To stop:   docker compose down" -ForegroundColor Gray
Write-Host "To logs:   docker compose logs -f" -ForegroundColor Gray
