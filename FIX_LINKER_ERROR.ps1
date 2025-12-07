<#
.SYNOPSIS
    Fixes the "linker `link.exe` not found" error by installing Visual Studio Build Tools.
    This is required for Rust to compile on Windows.

.DESCRIPTION
    This script downloads and installs the Microsoft Visual C++ Build Tools.
    It installs the minimum required components for Rust development.
#>

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Visual Studio Build Tools Installer..." -ForegroundColor Cyan

# URL for the Visual Studio Build Tools bootstrapper
$Url = "https://aka.ms/vs/17/release/vs_buildtools.exe"
$InstallerPath = "$env:TEMP\vs_buildtools.exe"

# Download the installer
Write-Host "   Downloading installer..." -ForegroundColor Gray
Invoke-WebRequest -Uri $Url -OutFile $InstallerPath

# Install required components
# - Microsoft.VisualStudio.Workload.VCTools: C++ build tools
# - Microsoft.VisualStudio.Component.VC.Tools.x86.x64: MSVC compiler
# - Microsoft.VisualStudio.Component.Windows10SDK: Windows SDK (needed for linking)
Write-Host "   Installing Build Tools (this may take a while)..." -ForegroundColor Yellow
Write-Host "   Please accept the UAC prompt if it appears." -ForegroundColor Yellow

$Arguments = @(
    "--passive",  # Show progress bar but automate clicks
    "--wait",
    "--norestart",
    "--nocache",
    "--add", "Microsoft.VisualStudio.Workload.VCTools",
    "--add", "Microsoft.VisualStudio.Component.VC.Tools.x86.x64",
    "--add", "Microsoft.VisualStudio.Component.Windows10SDK",
    "--includeRecommended"
)

Start-Process -FilePath $InstallerPath -ArgumentList $Arguments -Wait -NoNewWindow

Write-Host "✅ Installation Complete!" -ForegroundColor Green
Write-Host "👉 You may need to RESTART YOUR COMPUTER for the changes to take effect." -ForegroundColor Magenta
