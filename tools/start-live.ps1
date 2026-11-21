$ErrorActionPreference = 'Stop'

$root        = Split-Path -Parent $PSScriptRoot
$app         = Join-Path $root 'app'
$cloudflared = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
$log         = Join-Path $env:TEMP 'pos-cloudflared.log'
$urlFile     = Join-Path $app 'live-url.txt'
$apiFile     = Join-Path $app 'api-url.txt'

if (-not (Test-Path $cloudflared)) {
    throw "Cloudflare Tunnel not found at: $cloudflared"
}

Write-Host 'Starting XAMPP (Apache + MySQL)...'
Start-Process 'C:\xampp\xampp_start.exe'
Start-Sleep -Seconds 8

Write-Host 'Starting Cloudflare HTTPS tunnel for /daniels-pos ...'
Get-CimInstance Win32_Process -Filter "Name = 'cloudflared.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'daniels-pos' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Remove-Item $log, "$log.err" -ErrorAction SilentlyContinue

$tunnel = Start-Process `
    -FilePath $cloudflared `
    -ArgumentList @('tunnel', '--no-autoupdate', '--url', 'http://localhost/daniels-pos') `
    -RedirectStandardOutput $log `
    -RedirectStandardError "$log.err" `
    -PassThru `
    -WindowStyle Hidden

$url = $null
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 500
    $text = ((Get-Content $log, "$log.err" -Raw -ErrorAction SilentlyContinue) -join "`n")
    $match = [regex]::Match($text, 'https://[a-z0-9-]+\.trycloudflare\.com')
    if ($match.Success) {
        $url = $match.Value
        break
    }
}

if (-not $url) {
    throw "Tunnel URL not found. Check: $log"
}

$apiUrl       = "$url/daniels-pos/api.php"
$tunnelAppUrl = "$url/daniels-pos/index.html?v=20"

$apiUrl | Set-Content $apiFile -Encoding ASCII

Write-Host 'Updating GitHub Pages API config...'
& (Join-Path $root 'tools\build-pages.ps1')

$changed = $false
Push-Location $root
try {
    git add docs/index.html docs/js/00-api-url.js
    git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) { $changed = $true }
    if ($changed) {
        git commit -m "chore: update live API URL"
        git push origin main
    }
    $commit = (git rev-parse --short HEAD)
}
finally {
    Pop-Location
}

if ($changed) {
    Write-Host 'Waiting for GitHub Pages build...'
    try {
        for ($i = 0; $i -lt 20; $i++) {
            $build = gh api repos/welbert23/daniels-pos/pages/builds/latest 2>$null | ConvertFrom-Json -ErrorAction SilentlyContinue
            if ($build -and $build.status -eq 'built' -and $build.commit -like "$commit*") { break }
            Start-Sleep -Seconds 3
        }
    }
    catch {
        Write-Host "Could not confirm Pages build: $($_.Exception.Message)"
    }
}

$token    = [guid]::NewGuid().ToString('N').Substring(0, 6)
$pagesUrl = "https://welbert23.github.io/daniels-pos/?r=$token"
$pagesUrl | Set-Content $urlFile -Encoding ASCII

Write-Host ''
Write-Host '============================================================'
Write-Host " LIVE URL : $pagesUrl"
Write-Host " API      : $apiUrl"
Write-Host " DIRECT   : $tunnelAppUrl"
Write-Host " Saved to : $urlFile"
Write-Host '============================================================'
Write-Host ''
Write-Host 'The LIVE URL is the one to open/share. It uses your local MySQL.'
Write-Host 'It changes on every tunnel restart because the API URL changes.'
Write-Host 'Press Ctrl+C to stop the launcher (the tunnel keeps running).'

try { Set-Clipboard -Value $pagesUrl } catch { Write-Host '(Clipboard unavailable)' }
Start-Process $pagesUrl
