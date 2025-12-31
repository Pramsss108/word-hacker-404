Write-Host "Deploying Black Ops Scripts to Kali Engine..." -ForegroundColor Cyan

# 1. Create directory in Kali
wsl -d kali-linux mkdir -p /home/kali/blackops

# 2. Convert Windows Path to WSL Path
$currentDir = Get-Location
$scriptSource = "$currentDir\cyber-sentinel-edu\scripts\wsl"
# WSL path for D drive is /mnt/d
# We need to handle spaces carefully. 
# Simplest way: Copy using the \\wsl$ network share if available, or use wsl command with quoted paths.

# Let's use the wsl command with the mounted path.
# "D:\A scret project\..." -> "/mnt/d/A scret project/..."
$wslSource = "/mnt/d/A scret project/Word hacker 404/cyber-sentinel-edu/scripts/wsl"

Write-Host "Source: $wslSource" -ForegroundColor Gray
Write-Host "Dest:   /home/kali/blackops" -ForegroundColor Gray

# 3. Copy files (using cp -r)
# We use quotes around the source path to handle spaces
wsl -d kali-linux cp -r "$wslSource/." /home/kali/blackops/

# 4. Make executable and fix line endings (Windows CRLF -> Linux LF)
wsl -d kali-linux chmod +x /home/kali/blackops/*.sh
wsl -d kali-linux dos2unix /home/kali/blackops/*.sh 2>$null

# 5. Verify
if ($?) {
    Write-Host "✅ Scripts Deployed Successfully." -ForegroundColor Green
    wsl -d kali-linux ls -l /home/kali/blackops
} else {
    Write-Host "❌ Deployment Failed." -ForegroundColor Red
}
