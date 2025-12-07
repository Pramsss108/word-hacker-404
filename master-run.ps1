# Word Hacker 404 master reset + launch script
# Usage: Right-click this file in Explorer and choose "Run with PowerShell"

$project = "D:\A scret project\Word hacker 404"
$desktop = Join-Path $project "desktop-downloader"

function Stop-ProcessIfRunning {
    param ($name)
    Get-Process -Name $name -ErrorAction SilentlyContinue |
        Stop-Process -Force -ErrorAction SilentlyContinue
}

Write-Host "`n[1/4] Stopping old dev servers..."
"node","npm","electron","vite","code","powershell" | ForEach-Object { Stop-ProcessIfRunning $_ }

Write-Host "[2/4] Installing root dependencies..."
Push-Location $project
npm install
Pop-Location

Write-Host "[3/4] Installing desktop app dependencies..."
Push-Location $desktop
npm install

Write-Host "[4/4] Launching desktop app..."
npm start
