# start-debug.ps1
# Switch to App/WebApp, ensure Docker Desktop is running, then run `docker compose up --build`

$targetRelative = "App/WebApp"
$target = Join-Path -Path $PSScriptRoot -ChildPath $targetRelative

if (-not (Test-Path -Path $target)) {
    Write-Error "Target folder not found: $target"
    exit 1
}

Set-Location -Path $target

function Test-DockerReady {
    & docker info > $null 2>&1
    return $LASTEXITCODE -eq 0
}

# If Docker is not ready, try to start Docker Desktop (common locations)
if (-not (Test-DockerReady)) {
    $candidates = @(
        "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
        "$env:ProgramFiles\Docker\Docker\DockerDesktop.exe",
        "$env:ProgramW6432\Docker\Docker\Docker Desktop.exe",
        "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    )

    $started = $false
    foreach ($path in $candidates) {
        if (Test-Path $path) {
            try {
                Start-Process -FilePath $path -ErrorAction Stop
                $started = $true
                break
            }
            catch {
                # ignore and try next
            }
        }
    }

    if (-not $started) {
        Write-Host "Docker does not appear to be running and Docker Desktop executable was not found. Attempting to continue; you may need to start Docker Desktop manually."
    }

    # wait for Docker daemon to become available
    $timeoutSec = 120
    $interval = 2
    $elapsed = 0
    while (-not (Test-DockerReady) -and ($elapsed -lt $timeoutSec)) {
        Write-Host "Waiting for Docker to become ready... ($elapsed/$timeoutSec s)"
        Start-Sleep -Seconds $interval
        $elapsed += $interval
    }

    if (-not (Test-DockerReady)) {
        Write-Error "Docker did not become ready within $timeoutSec seconds."
        exit 1
    }
}

# Ensure bower dependencies are installed (e.g. jquery, font-awesome, bootstrap)
& bower install

# Run docker compose up --build in the current folder (will stream logs)
Write-Host "Starting: docker compose up --build"
& docker 'compose' 'up' '--build' '-d'

Set-Location -Path $PSScriptRoot

Start-Process "http://localhost:4000"

$exitCode = $LASTEXITCODE
exit $exitCode