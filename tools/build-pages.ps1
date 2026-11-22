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

$config = 'window.POS_API_URL = "";'
[IO.File]::WriteAllText((Join-Path $docs 'js\00-api-url.js'), $config, [System.Text.UTF8Encoding]::new($false))

$indexPath = Join-Path $docs 'index.html'
$html = [IO.File]::ReadAllText($indexPath, [System.Text.Encoding]::UTF8)
$html = [regex]::Replace($html, 'js/00-api-url\.js\?v=[^"]+', 'js/00-api-url.js?v=public')
[IO.File]::WriteAllText($indexPath, $html, [System.Text.UTF8Encoding]::new($false))

New-Item -ItemType File -Path (Join-Path $docs '.nojekyll') -Force | Out-Null

Write-Output "Built static GitHub Pages site in: $docs"
Write-Output 'API URL is runtime-only; no tunnel URL is written to the public repo.'
