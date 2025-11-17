# LibRaw WASM Compilation Script
Write-Host "=== Building LibRaw WASM ===" -ForegroundColor Cyan

# Setup environment
C:\emsdk\emsdk_env.ps1 | Out-Null

$ErrorActionPreference = "Stop"

$librawSource = "D:\A scret project\Word hacker 404\LibRaw-0.21.4"
$outputDir = "D:\A scret project\Word hacker 404\public\wasm"

# Create output directory
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

Write-Host "Compiling LibRaw to WebAssembly..." -ForegroundColor Yellow

# Change to LibRaw directory
Set-Location $librawSource

# Compile all LibRaw source files
$sources = @(
    "src\libraw_cxx.cpp",
    "src\libraw_c_api.cpp",
    "src\libraw_datastream.cpp",
    "internal\dcraw_common.cpp",
    "internal\dcraw_fileio.cpp",
    "internal\demosaic_packs.cpp",
    "libraw_wrapper.c"
)

Write-Host "Compiling sources..." -ForegroundColor Cyan

& emcc `
    -O3 `
    -s WASM=1 `
    -s EXPORTED_FUNCTIONS="['_libraw_init_wrapper','_libraw_open_buffer_wrapper','_libraw_unpack_wrapper','_libraw_dcraw_process_wrapper','_libraw_get_image_wrapper','_libraw_close_wrapper','_malloc','_free']" `
    -s EXPORTED_RUNTIME_METHODS="['ccall','cwrap','HEAPU8','HEAP32']" `
    -s ALLOW_MEMORY_GROWTH=1 `
    -s MODULARIZE=1 `
    -s EXPORT_NAME="'LibRawModule'" `
    -s TOTAL_MEMORY=256MB `
    -I. `
    -I./libraw `
    $sources `
    -o "$outputDir\libraw.js"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== SUCCESS! ===" -ForegroundColor Green
    Write-Host "✓ libraw.wasm: $(Get-Item "$outputDir\libraw.wasm").Length bytes" -ForegroundColor Green
    Write-Host "✓ libraw.js: $(Get-Item "$outputDir\libraw.js").Length bytes" -ForegroundColor Green
    Write-Host ""
    Write-Host "Files installed in: $outputDir" -ForegroundColor Yellow
    Write-Host "Restart dev server: npm run dev" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "=== BUILD FAILED ===" -ForegroundColor Red
    Write-Host "Exit code: $LASTEXITCODE" -ForegroundColor Red
}

Set-Location "D:\A scret project\Word hacker 404"
