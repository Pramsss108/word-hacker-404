# Generate Placeholder Icons for Cyber Sentinel Edu
# This script uses .NET to generate valid icon files locally since download failed.

$iconsDir = "d:\A scret project\Word hacker 404\cyber-sentinel-edu\src-tauri\icons"

# 1. Create Directory
if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir | Out-Null
    Write-Host "Created icons directory."
}

# 2. Load System.Drawing
Add-Type -AssemblyName System.Drawing

# 3. Function to create PNG
function Create-Png($size, $filename) {
    $path = Join-Path $iconsDir $filename
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::Black)
    $brush = [System.Drawing.Brushes]::LimeGreen
    $g.FillEllipse($brush, 2, 2, $size-4, $size-4)
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated $filename"
}

# 4. Generate PNGs
Create-Png 32 "32x32.png"
Create-Png 128 "128x128.png"
Create-Png 256 "128x128@2x.png"

# 5. Generate ICO (Windows)
$icoPath = Join-Path $iconsDir "icon.ico"
$bmp = New-Object System.Drawing.Bitmap 256, 256
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::Black)
$g.FillEllipse([System.Drawing.Brushes]::LimeGreen, 10, 10, 236, 236)

# Create Icon from Bitmap handle
$icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())

# Fix: Use string enum for FileMode
$fs = New-Object System.IO.FileStream $icoPath, "Create"
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
$g.Dispose()
$bmp.Dispose()
Write-Host "Generated icon.ico"

# 6. Generate ICNS (Mac - Dummy file)
Copy-Item (Join-Path $iconsDir "128x128@2x.png") (Join-Path $iconsDir "icon.icns") -Force
Write-Host "Generated icon.icns (Dummy)"

Write-Host "✅ All icons generated successfully!"
