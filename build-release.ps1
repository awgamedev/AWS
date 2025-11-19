[CmdletBinding()]
param(
    [string]$ImageName = 'onis-web-app',
    [string]$Tag = 'latest',
    # Pfad zum Verzeichnis, das das Dockerfile und die package.json enthält
    [string]$TargetRelative = 'App/WebApp',
    [string]$PublishRelative = 'App/publish' 
)

$ErrorActionPreference = 'Stop'

# Löst das Ziel-Build-Verzeichnis relativ zum Skript-Root auf
$target = Join-Path -Path $PSScriptRoot -ChildPath $TargetRelative
if (-not (Test-Path -Path $target -PathType Container)) {
    Write-Error "Target path not found: $target"
    exit 1
}

# Ensure Dockerfile exists in the target build context
$dockerfilePath = Join-Path -Path $target -ChildPath 'Dockerfile'
if (-not (Test-Path -Path $dockerfilePath -PathType Leaf)) {
    Write-Error "Dockerfile not found at: $dockerfilePath"
    exit 1
}

# Validate docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error 'Docker is not installed or not in PATH.'
    exit 1
}

# Ensure publish directory exists and write outputs there
$publishDir = Join-Path -Path $PSScriptRoot -ChildPath $PublishRelative
if (-not (Test-Path $publishDir)) {
    New-Item -Path $publishDir -ItemType Directory -Force | Out-Null
}

# Build and save image
$fullTag = "${ImageName}:${Tag}"
$outputDir = $publishDir
$tarPath = Join-Path -Path $outputDir -ChildPath "$ImageName.tar"
$gzPath = "$tarPath.gz"

# *** START KORRIGIERTER BUILD-BLOCK ***

Write-Host "Changing directory to build context: $target"
Push-Location $target # Wechselt in das Verzeichnis 'App/WebApp'

try {
    Write-Host "Starting Docker build. Context: ."
    # Führt den Build im Kontext von 'App/WebApp' aus.
    # Das Dockerfile und package.json befinden sich jetzt im aktuellen Verzeichnis ('.').
    & docker build --no-cache -t $fullTag . 
}
finally {
    Pop-Location # Kehrt zum ursprünglichen Verzeichnis zurück
}
if ($LASTEXITCODE -ne 0) { Write-Error "docker build failed." ; exit 1 }

# *** ENDE KORRIGIERTER BUILD-BLOCK ***

# Save image tar directly in publish directory
if (Test-Path $tarPath) { Remove-Item $tarPath -Force }
docker save -o $tarPath $fullTag

# Compress: use gzip if available, otherwise .NET GZipStream
if (Get-Command gzip -ErrorAction SilentlyContinue) {
    & gzip -f $tarPath
}
else {
    if (Test-Path $gzPath) { Remove-Item $gzPath -Force }
    $in = [System.IO.File]::OpenRead($tarPath)
    $out = [System.IO.File]::Create($gzPath)
    try {
        $gz = New-Object System.IO.Compression.GZipStream($out, [System.IO.Compression.CompressionLevel]::Optimal, $false)
        try {
            $in.CopyTo($gz)
        }
        finally {
            $gz.Dispose()
        }
    }
    finally {
        $in.Dispose()
        $out.Dispose()
    }
    Remove-Item $tarPath -Force
}

Write-Host "Image published to: $gzPath"