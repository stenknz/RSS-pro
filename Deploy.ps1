param(
    [Parameter(Mandatory = $true)]
    [string]$DockerHubUser,

    [Parameter(Mandatory = $false)]
    [string]$ImageTag = "latest",

    [Parameter(Mandatory = $false)]
    [string]$NasHost = "192.168.0.100",

    [Parameter(Mandatory = $false)]
    [string]$NasUser = "stenk",

    [Parameter(Mandatory = $false)]
    [string]$NasDockerPath = "/volume1/Docker/rss-reader-pro",

    [Parameter(Mandatory = $false)]
    [int]$NasFrontendPort = 80,

    [Parameter(Mandatory = $false)]
    [int]$NasBackendPort = 8000,

    [Parameter(Mandatory = $false)]
    [switch]$SkipBuild,

    [Parameter(Mandatory = $false)]
    [switch]$SkipPush
)

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

$BACKEND_IMAGE = "$DockerHubUser/rss-reader-pro-backend:$ImageTag"
$FRONTEND_IMAGE = "$DockerHubUser/rss-reader-pro-frontend:$ImageTag"

Write-Host "=== RSS Reader Pro - Production Deploy ===" -ForegroundColor Cyan
Write-Host "Docker Hub user: $DockerHubUser" -ForegroundColor Gray
Write-Host "Image tag:       $ImageTag" -ForegroundColor Gray
Write-Host "NAS:             $NasUser@$NasHost" -ForegroundColor Gray
Write-Host "NAS path:        $NasDockerPath" -ForegroundColor Gray
Write-Host ""

# Step 1: Build
if (-not $SkipBuild) {
    Write-Host "[1/6] Building production images..." -ForegroundColor Yellow
    docker build -t $BACKEND_IMAGE -f backend/Dockerfile ./backend
    if ($LASTEXITCODE -ne 0) { exit 1 }
    docker build -t $FRONTEND_IMAGE -f frontend/Dockerfile ./frontend
    if ($LASTEXITCODE -ne 0) { exit 1 }
    Write-Host "Images built." -ForegroundColor Green
} else {
    Write-Host "[1/6] Skipping build (--SkipBuild)." -ForegroundColor Yellow
}

# Step 2: Push
if (-not $SkipPush) {
    Write-Host "[2/6] Pushing images to Docker Hub..." -ForegroundColor Yellow
    docker push $BACKEND_IMAGE; if ($LASTEXITCODE -ne 0) { Write-Host "Push failed. Check 'docker login'." -ForegroundColor Red; exit 1 }
    docker push $FRONTEND_IMAGE; if ($LASTEXITCODE -ne 0) { exit 1 }
    Write-Host "Images pushed." -ForegroundColor Green
} else {
    Write-Host "[2/6] Skipping push (--SkipPush)." -ForegroundColor Yellow
}

# Step 3: Prepare NAS directory
Write-Host "[3/6] Creating directories on NAS..." -ForegroundColor Yellow
ssh "$NasUser@$NasHost" "mkdir -p $NasDockerPath/data"
if ($LASTEXITCODE -ne 0) {
    Write-Host "SSH failed. Check: ssh $NasUser@$NasHost works and NAS is reachable." -ForegroundColor Red
    exit 1
}
Write-Host "Directories ready." -ForegroundColor Green

# Step 4: SCP docker-compose.yml to NAS
Write-Host "[4/6] Writing docker-compose.yml to NAS..." -ForegroundColor Yellow
$NasCompose = @"
services:
  backend:
    image: $BACKEND_IMAGE
    container_name: rss-reader-backend
    ports:
      - "$NasBackendPort`:8000"
    volumes:
      - $NasDockerPath/data:/app/data
    environment:
      - DATABASE_URL=sqlite:///app/data/rss.db
      - LOG_LEVEL=INFO
    restart: unless-stopped

  frontend:
    image: $FRONTEND_IMAGE
    container_name: rss-reader-frontend
    ports:
      - "$NasFrontendPort`:80"
    depends_on:
      - backend
    restart: unless-stopped
"@

$tmpFile = Join-Path $env:TEMP "rss-reader-docker-compose.yml"
$NasCompose | Out-File -FilePath $tmpFile -Encoding utf8 -Force
scp "$tmpFile" "$NasUser@$NasHost`:$NasDockerPath/docker-compose.yml"
Remove-Item $tmpFile -Force
Write-Host "docker-compose.yml written." -ForegroundColor Green

# Step 5: Pull and restart on NAS
Write-Host "[5/6] Pulling images and restarting containers on NAS..." -ForegroundColor Yellow
ssh "$NasUser@$NasHost" "cd $NasDockerPath && docker compose pull && docker compose down && docker compose up -d"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start containers on NAS." -ForegroundColor Red
    exit 1
}
Write-Host "Containers restarted." -ForegroundColor Green

# Step 6: Health check
Write-Host "[6/6] Running health check on NAS..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
$healthy = $false
for ($i = 0; $i -lt 10; $i++) {
    $resp = ssh "$NasUser@$NasHost" "curl -s http://localhost:$NasBackendPort/api/v1/health" 2>$null
    if ($resp -match '"ok"') { $healthy = $true; break }
    Start-Sleep -Seconds 2
}
if ($healthy) {
    Write-Host "Health check PASSED." -ForegroundColor Green
} else {
    Write-Host "Health check FAILED. Check: ssh $NasUser@$NasHost 'cd $NasDockerPath && docker compose logs'" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Production Deploy Complete ===" -ForegroundColor Cyan
Write-Host "Frontend: http://$NasHost`:$NasFrontendPort" -ForegroundColor Green
Write-Host "Backend:  http://$NasHost`:$NasBackendPort" -ForegroundColor Green
Write-Host ""
Write-Host "SSH:    ssh $NasUser@$NasHost" -ForegroundColor Gray
Write-Host "Logs:   ssh $NasUser@$NasHost 'cd $NasDockerPath && docker compose logs -f'" -ForegroundColor Gray
Write-Host "Stop:   ssh $NasUser@$NasHost 'cd $NasDockerPath && docker compose down'" -ForegroundColor Gray
Write-Host "Update: docker login && .\Deploy.ps1 -DockerHubUser $DockerHubUser" -ForegroundColor Gray
