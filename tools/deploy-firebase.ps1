$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot

Write-Host 'Building static frontend...'
& (Join-Path $PSScriptRoot 'build-static.ps1')

Push-Location $root
try {
    firebase deploy --only hosting
} finally {
    Pop-Location
}
