$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$app  = Join-Path $root 'app'
$docs = Join-Path $root 'docs'

if (-not (Test-Path -LiteralPath $docs)) {
    New-Item -ItemType Directory -Path $docs -Force | Out-Null
}

foreach ($rel in @('index.html', 'styles.css', 'js', '.nojekyll')) {
    $target = Join-Path $docs $rel
    if (Test-Path -LiteralPath $target) {
        Remove-Item -LiteralPath $target -Recurse -Force
    }
}

New-Item -ItemType Directory -Path (Join-Path $docs 'js') -Force | Out-Null

Copy-Item -LiteralPath (Join-Path $app 'index.html') -Destination $docs
Copy-Item -LiteralPath (Join-Path $app 'styles.css') -Destination $docs
Get-ChildItem -LiteralPath (Join-Path $app 'js') -Filter '*.js' | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $docs 'js')
}

$apiFile = Join-Path $app 'api-url.txt'
$apiUrl = ''
if (Test-Path -LiteralPath $apiFile) {
    $apiUrl = (Get-Content -LiteralPath $apiFile -Raw).Trim()
}
$config = 'window.POS_API_URL = ' + (ConvertTo-Json -InputObject $apiUrl -Compress) + ';'
[IO.File]::WriteAllText((Join-Path $docs 'js\00-api-url.js'), $config, [System.Text.UTF8Encoding]::new($false))

$hash = 'none'
if ($apiUrl) {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($apiUrl)
        $hash = (-join ($sha.ComputeHash($bytes) | ForEach-Object { $_.ToString('x2') })).Substring(0, 8)
    }
    finally {
        $sha.Dispose()
    }
}
$indexPath = Join-Path $docs 'index.html'
$html = [IO.File]::ReadAllText($indexPath, [System.Text.Encoding]::UTF8)
$html = $html.Replace('js/00-api-url.js?v=25', "js/00-api-url.js?v=$hash")
[IO.File]::WriteAllText($indexPath, $html, [System.Text.UTF8Encoding]::new($false))

New-Item -ItemType File -Path (Join-Path $docs '.nojekyll') -Force | Out-Null

Write-Output "Built static GitHub Pages site in: $docs"
