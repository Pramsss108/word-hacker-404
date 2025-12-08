
$sourceIcon = "d:\A scret project\Word hacker 404\src-tauri\icons\icon.png"
$destDir = "d:\A scret project\Word hacker 404\desktop-downloader\src-tauri\icons"
$headerPath = Join-Path $destDir "Header.bmp"
$sidebarPath = Join-Path $destDir "Sidebar.bmp"
$iconDest = Join-Path $destDir "icon.ico"
$iconSourceIco = "d:\A scret project\Word hacker 404\src-tauri\icons\icon.ico"

# Ensure destination exists
if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force }

# Copy the main icon
Copy-Item -Path $iconSourceIco -Destination $iconDest -Force
Write-Host "Copied icon.ico"

Add-Type -AssemblyName System.Drawing

function Create-Bmp {
    param (
        [string]$SourcePath,
        [string]$DestPath,
        [int]$Width,
        [int]$Height,
        [string]$BgColorHex
    )

    $sourceImg = [System.Drawing.Image]::FromFile($SourcePath)
    $bmp = New-Object System.Drawing.Bitmap $Width, $Height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Background
    $color = [System.Drawing.ColorTranslator]::FromHtml($BgColorHex)
    $brush = New-Object System.Drawing.SolidBrush $color
    $g.FillRectangle($brush, 0, 0, $Width, $Height)

    # Draw Icon (Centered, scaled to fit with padding)
    $ratio = [Math]::Min(($Width - 20) / $sourceImg.Width, ($Height - 20) / $sourceImg.Height)
    $newW = [int]($sourceImg.Width * $ratio)
    $newH = [int]($sourceImg.Height * $ratio)
    $x = [int](($Width - $newW) / 2)
    $y = [int](($Height - $newH) / 2)

    $g.DrawImage($sourceImg, $x, $y, $newW, $newH)
    
    $bmp.Save($DestPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
    
    $g.Dispose()
    $bmp.Dispose()
    $sourceImg.Dispose()
    
    Write-Host "Created $DestPath"
}

# Create Header (150x57)
Create-Bmp -SourcePath $sourceIcon -DestPath $headerPath -Width 150 -Height 57 -BgColorHex "#0b0b0d"

# Create Sidebar (164x314)
Create-Bmp -SourcePath $sourceIcon -DestPath $sidebarPath -Width 164 -Height 314 -BgColorHex "#0b0b0d"
