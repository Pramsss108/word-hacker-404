# Autonomous Deployment Agent for Word Hacker 404
# Zero-prompt production deployment with NASA-grade quality assurance

param(
    [string]$Message = "feat: Autonomous deployment update"
)

Write-Host ""
Write-Host "GitHub Copilot Autonomous Deployment Agent" -ForegroundColor Magenta
Write-Host "===========================================" -ForegroundColor Magenta
Write-Host ""

# Navigate to project directory
Write-Host "Navigating to project directory..." -ForegroundColor Cyan
Set-Location "D:\A scret project\Word hacker 404"

# Phase 1: Quality Assurance
Write-Host "Phase 1: Running TypeScript validation..." -ForegroundColor Cyan
npm run type-check
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: TypeScript validation failed" -ForegroundColor Red
    exit 1
}
Write-Host "SUCCESS: TypeScript validation passed" -ForegroundColor Green

Write-Host "Phase 2: Running production build..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Production build failed" -ForegroundColor Red
    exit 1
}
Write-Host "SUCCESS: Production build completed" -ForegroundColor Green

# Phase 2: Autonomous Git Operations
Write-Host "Phase 3: Configuring git for autonomous operation..." -ForegroundColor Cyan
git config --local user.name "GitHub Copilot Agent"
git config --local user.email "copilot-agent@github.com"
git config --local push.default simple
git config --local core.autocrlf true

# Check for changes
$status = git status --porcelain
if ([string]::IsNullOrEmpty($status)) {
    Write-Host "No changes detected. Nothing to deploy." -ForegroundColor Yellow
    exit 0
}

Write-Host "Changes detected. Preparing deployment..." -ForegroundColor Cyan

# Stage and commit
Write-Host "Staging changes..." -ForegroundColor Cyan
git add .

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$commitMsg = "$Message - Autonomous Agent - $timestamp"

Write-Host "Committing changes..." -ForegroundColor Cyan
git commit -m $commitMsg

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to create commit" -ForegroundColor Red
    exit 1
}

# Push to production
Write-Host "Pushing to production..." -ForegroundColor Cyan
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to push to repository" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "===================" -ForegroundColor Green
Write-Host ""
Write-Host "Live Site: https://pramsss108.github.io/word-hacker-404/" -ForegroundColor Yellow
Write-Host "GitHub Actions will complete deployment in 2-3 minutes" -ForegroundColor Cyan
Write-Host ""
Write-Host "Autonomous Agent Status: MISSION ACCOMPLISHED" -ForegroundColor Magenta

# Open live site
Start-Process "https://pramsss108.github.io/word-hacker-404/"