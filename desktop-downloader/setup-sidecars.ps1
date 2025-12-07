# Setup Tauri Sidecars (Apple Quality Precision)
# Copies binaries from node_modules and renames them with the correct target triple for Tauri.

$ErrorActionPreference = "Stop"

$TargetTriple = "x86_64-pc-windows-msvc"
$BinDir = "src-tauri/bin"

# Ensure bin directory exists
if (-not (Test-Path $BinDir)) {
    New-Item -ItemType Directory -Path $BinDir | Out-Null
}

# Source Paths (from existing node_modules)
$YtDlpSource = "node_modules/yt-dlp-exec/bin/yt-dlp.exe"
$FfmpegSource = "node_modules/ffmpeg-static/ffmpeg.exe"

# Destination Paths (Tauri naming convention: name-target-triple.exe)
$YtDlpDest = "$BinDir/yt-dlp-$TargetTriple.exe"
$FfmpegDest = "$BinDir/ffmpeg-$TargetTriple.exe"

Write-Host "🍎 Setting up Sidecars with Precision..." -ForegroundColor Cyan

# 1. Setup yt-dlp
if (Test-Path $YtDlpSource) {
    Copy-Item -Path $YtDlpSource -Destination $YtDlpDest -Force
    Write-Host "✅ yt-dlp configured: $YtDlpDest" -ForegroundColor Green
} else {
    Write-Error "❌ yt-dlp source not found at $YtDlpSource. Run 'npm install' first."
}

# 2. Setup ffmpeg
if (Test-Path $FfmpegSource) {
    Copy-Item -Path $FfmpegSource -Destination $FfmpegDest -Force
    Write-Host "✅ ffmpeg configured: $FfmpegDest" -ForegroundColor Green
} else {
    Write-Error "❌ ffmpeg source not found at $FfmpegSource. Run 'npm install' first."
}

Write-Host "✨ Sidecar setup complete. Ready for Tauri build." -ForegroundColor Cyan
