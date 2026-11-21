$ErrorActionPreference = 'Stop'

$root        = Split-Path -Parent $PSScriptRoot
$app         = Join-Path $root 'app'
$cloudflared = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
$log         = Join-Path $env:TEMP 'pos-cloudflared.log'
$urlFile     = Join-Path $app 'live-url.txt'

if (-not (Test-Path $cloudflared)) {
    throw "Cloudflare Tunnel not found at: $cloudflared"
}

Write-Host 'Starting XAMPP (Apache + MySQL)...'
Start-Process 'C:\xampp\xampp_start.exe'
Start-Sleep -Seconds 8

Write-Host 'Starting Cloudflare HTTPS tunnel for /daniels-pos ...'
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

$url | Set-Content $urlFile -Encoding ASCII
$liveUrl = "$url/daniels-pos/index.html?v=16"

Write-Host ''
Write-Host '============================================================'
Write-Host " LIVE URL : $liveUrl"
Write-Host " Saved to: $urlFile"
Write-Host '============================================================'
Write-Host ''
Write-Host 'Open this URL on any device. It uses your local MySQL.'
Write-Host 'The URL changes every time the tunnel restarts.'
Write-Host 'Press Ctrl+C to stop the launcher (the tunnel keeps running).'

Start-Process $liveUrl
