# stop-debug.ps1

$targetRelative = "App/WebApp"
$target = Join-Path -Path $PSScriptRoot -ChildPath $targetRelative

if (-not (Test-Path -Path $target)) {
    Write-Error "Target folder not found: $target"
    exit 1
}

Set-Location -Path $target

Write-Host "Starting: docker compose down"
& docker 'compose' 'down'

Set-Location -Path $PSScriptRoot