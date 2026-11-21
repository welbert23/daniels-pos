$ErrorActionPreference = 'Stop'

$root  = Split-Path -Parent $PSScriptRoot
$app   = Join-Path $root 'app'
$pages = Join-Path $root 'pages'

if (Test-Path -LiteralPath $pages) {
    Get-ChildItem -LiteralPath $pages -Force | Remove-Item -Recurse -Force
}
New-Item -ItemType Directory -Path $pages -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $pages 'js') -Force | Out-Null

Copy-Item -LiteralPath (Join-Path $app 'index.html') -Destination $pages
Copy-Item -LiteralPath (Join-Path $app 'styles.css') -Destination $pages
Get-ChildItem -LiteralPath (Join-Path $app 'js') -Filter '*.js' | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $pages 'js')
}

New-Item -ItemType File -Path (Join-Path $pages '.nojekyll') -Force | Out-Null

Write-Output "Built static GitHub Pages site in: $pages"
