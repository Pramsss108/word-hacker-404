$ErrorActionPreference = "Continue"

$Root = Resolve-Path "$PSScriptRoot\..\ai-gateway"
Write-Host "Target Project: $Root" -ForegroundColor Gray

# 1. Check for Node Modules
$NodeModulesPath = Join-Path $Root "node_modules"

if (-not (Test-Path $NodeModulesPath)) {
    Write-Host "⚠️  Dependencies missing! Installing now..." -ForegroundColor Yellow
    Set-Location $Root
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Install failed!" -ForegroundColor Red
        Read-Host "Press Enter to exit..."
        exit
    }
    Write-Host "✅ Dependencies installed." -ForegroundColor Green
} else {
    Write-Host "✅ Dependencies found. Skipping install." -ForegroundColor Green
}

# 2. Start Dev Server
Write-Host "🚀 Starting AI Gateway..." -ForegroundColor Cyan
Set-Location $Root
npx wrangler dev

Read-Host "Press Enter to exit..."
