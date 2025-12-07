$ErrorActionPreference = "Continue"

Write-Host " STARTING MAGIC RELEASE SYSTEM " -ForegroundColor Magenta
Write-Host "-----------------------------------"

# 1. Build Everything
Write-Host "  Building App & Installer..." -ForegroundColor Cyan
.\BUILD_ALL.ps1
if ($LASTEXITCODE -ne 0) { exit 1 }

# 2. Create Release on GitHub
Write-Host " Uploading to GitHub..." -ForegroundColor Cyan
$Tag = "v1.0.2"
$Title = "WH404 Downloader v1.0.2"
$Notes = "Official Release: WH404 Downloader. Includes Windows Installer."

# Check if release exists, delete if so (for development iteration)
gh release view $Tag >$null 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Release $Tag exists. Deleting old one..." -ForegroundColor Yellow
    gh release delete $Tag --yes
    # Try to delete remote tag via API
    gh api "repos/:owner/:repo/git/refs/tags/$Tag" -X DELETE >$null 2>&1
}

# Force clean local and remote tags to prevent conflicts
git tag -d $Tag >$null 2>&1
git push --delete origin $Tag >$null 2>&1

# Create new release and upload files
Write-Host " Uploading files (this might take a minute)..." -ForegroundColor Cyan
gh release create $Tag `
    "dist/WH404 Downloader.exe" `
    "dist/app-release.zip" `
    "dist/latest.json" `
    --title $Title `
    --notes $Notes `
    --target main `
    --latest

if ($LASTEXITCODE -eq 0) {
    Write-Host "-----------------------------------"
    Write-Host " SUCCESS! Release is LIVE." -ForegroundColor Green
    Write-Host " Download Link: https://github.com/Pramsss108/word-hacker-404/releases/latest/download/WH404%20Downloader.exe" -ForegroundColor Green
    Write-Host "-----------------------------------"
} else {
    Write-Host " Upload Failed. Please check your internet or GitHub login." -ForegroundColor Red
}
