param(
    [ValidateSet('win', 'mac', 'linux', 'all')]
    [string]$Target = 'win'
)

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $projectDir

if (-not (Test-Path 'package-lock.json')) {
    Write-Host 'Installing dependencies (first run)…' -ForegroundColor Cyan
    npm install
}

switch ($Target) {
    'win'   { npm run package:win }
    'mac'   { npm run package:mac }
    'linux' { npm run package:linux }
    'all'   { npm run package }
}

Pop-Location
