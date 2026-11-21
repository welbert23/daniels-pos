$ErrorActionPreference = 'Stop'

$root   = Split-Path -Parent $PSScriptRoot
$app    = Join-Path $root 'app'
$public = Join-Path $root 'public'

Remove-Item $public -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory $public -Force | Out-Null

Copy-Item (Join-Path $app 'index.html') (Join-Path $public 'index.html')
Copy-Item (Join-Path $app 'styles.css') (Join-Path $public 'styles.css')
New-Item -ItemType Directory (Join-Path $public 'js') -Force | Out-Null
Copy-Item (Join-Path $app 'js\*.js') (Join-Path $public 'js') -Force

$urlFile = Join-Path $app 'live-url.txt'
if (Test-Path $urlFile) {
    $liveUrl = (Get-Content $urlFile -Raw).Trim()
    if ($liveUrl -match '^(https?://[^/]+)/daniels-pos/') {
        $apiUrl = $Matches[1] + '/daniels-pos/api.php'
        $config = "window.POS_API_URL = '$apiUrl';`n"
        Set-Content -Path (Join-Path $public 'js\00-api-config.js') -Value $config -Encoding ASCII
    }
}

Write-Host "Static frontend ready: $public"
