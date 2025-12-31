# Download Default Icons for Tauri
$baseUrl = "https://raw.githubusercontent.com/tauri-apps/tauri/dev/tooling/create-tauri-app/templates/template-rust/src-tauri/icons"
$iconsDir = "d:\A scret project\Word hacker 404\cyber-sentinel-edu\src-tauri\icons"

# Create directory
if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir | Out-Null
}

$files = @("32x32.png", "128x128.png", "128x128@2x.png", "icon.icns", "icon.ico")

foreach ($file in $files) {
    $url = "$baseUrl/$file"
    $output = Join-Path $iconsDir $file
    Write-Host "Downloading $file..."
    Invoke-WebRequest -Uri $url -OutFile $output
}

Write-Host "Icons downloaded successfully!"
