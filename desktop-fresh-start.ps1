# Fresh installer + launcher for WH404 Social Media Downloader
# Usage: Right-click this file and choose "Run with PowerShell"

[CmdletBinding()]
param(
    [switch]$SkipWebSetup
)

$ErrorActionPreference = 'Stop'

function Step($message, $color = 'Cyan') {
    Write-Host "`n$message" -ForegroundColor $color
}

function Stop-AppProcess {
    param([string[]]$Names)
    foreach ($name in $Names) {
        Get-Process -Name $name -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    }
}

function Clean-NodeModules {
    param([string]$Path)
    $nodeModules = Join-Path $Path 'node_modules'
    if (Test-Path $nodeModules) {
        Step "Removing $nodeModules" 'DarkGray'
        Remove-Item $nodeModules -Recurse -Force
    }
}

function Install-NpmDependencies {
    param([string]$Path,[string]$Label)
    Step "Installing dependencies for $Label"
    Push-Location $Path
    npm install
    Pop-Location
}

$projectRoot   = "D:\A scret project\Word hacker 404"
$desktopAppDir = Join-Path $projectRoot 'desktop-downloader'
$appDataDir    = Join-Path $env:APPDATA 'word-hacker-desktop-downloader'
$localDataDir  = Join-Path $env:LOCALAPPDATA 'word-hacker-desktop-downloader'

Step '[1/6] Shutting down running instances'
Stop-AppProcess -Names @('electron','node','npm','vite','powershell')

if (-not $SkipWebSetup) {
    Step '[2/6] Removing website node_modules (clean install)'
    Clean-NodeModules -Path $projectRoot
    Step '[3/6] Installing website dependencies'
    Install-NpmDependencies -Path $projectRoot -Label 'web app'
} else {
    Step '[2/6] Skipping website reinstall as requested' 'Yellow'
}

Step '[4/6] Resetting desktop app dependencies'
Clean-NodeModules -Path $desktopAppDir
Install-NpmDependencies -Path $desktopAppDir -Label 'desktop app'

Step '[5/6] Wiping Electron user data for a first-time run'
foreach ($dir in @($appDataDir,$localDataDir)) {
    if (Test-Path $dir) {
        Remove-Item $dir -Recurse -Force
        Step "Cleared $dir" 'DarkGray'
    }
}

$cachePath = Join-Path $localDataDir 'GPUCache'
if (Test-Path $cachePath) {
    Remove-Item $cachePath -Recurse -Force
}

Step '[6/6] Launching desktop downloader'
Push-Location $desktopAppDir
npm start
Pop-Location
