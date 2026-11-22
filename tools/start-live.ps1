$ErrorActionPreference = 'Stop'

$root        = Split-Path -Parent $PSScriptRoot
$app         = Join-Path $root 'app'
$privateRoot = 'C:\Users\Admin\OneDrive\Desktop\New folder\POS-Server'
$cloudflared = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
$log         = Join-Path $env:TEMP 'pos-cloudflared.log'
$urlFile     = Join-Path $app 'live-url.txt'
$apiFile     = Join-Path $privateRoot 'api-url.txt'

if (-not (Test-Path $cloudflared)) {
    throw "Cloudflare Tunnel not found at: $cloudflared"
}
if (-not (Test-Path $privateRoot)) {
    throw "Private server folder not found at: $privateRoot"
}

Write-Host 'Starting XAMPP (Apache + MySQL)...'
Start-Process 'C:\xampp\xampp_start.exe'
Start-Sleep -Seconds 8

Write-Host 'Starting Cloudflare HTTPS tunnel for /pos-inventory-management-system ...'
Get-CimInstance Win32_Process -Filter "Name = 'cloudflared.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'pos-inventory-management-system' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Remove-Item $log, "$log.err" -ErrorAction SilentlyContinue

$tunnel = Start-Process `
    -FilePath $cloudflared `
    -ArgumentList @('tunnel', '--no-autoupdate', '--url', 'http://localhost/pos-inventory-management-system') `
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

$apiUrl       = "$url/pos-inventory-management-system/api.php"
$tunnelAppUrl = "$url/pos-inventory-management-system/index.html?v=36"

$apiUrl | Set-Content $apiFile -Encoding ASCII
Write-Host 'API URL saved to the PRIVATE server folder only.'

& (Join-Path $root 'tools\build-pages.ps1')

$token     = [guid]::NewGuid().ToString('N').Substring(0, 6)
$encoded   = [uri]::EscapeDataString($apiUrl)
$pagesUrl  = "https://welbert23.github.io/pos-inventory-management-system/?r=$token&api=$encoded"
$pagesUrl | Set-Content $urlFile -Encoding ASCII

Write-Host ''
Write-Host '============================================================'
Write-Host " LIVE URL : $pagesUrl"
Write-Host " API      : $apiUrl  (private)"
Write-Host " DIRECT   : $tunnelAppUrl"
Write-Host " Saved to : $apiFile"
Write-Host '============================================================'
Write-Host ''
Write-Host 'The LIVE URL is the one to open/share. It uses your local MySQL.'
Write-Host 'It changes on every tunnel restart because the API URL changes.'
Write-Host 'Press Ctrl+C to stop the launcher (the tunnel keeps running).'

try { Set-Clipboard -Value $pagesUrl } catch { Write-Host '(Clipboard unavailable)' }
Start-Process $pagesUrl
