# LibRaw WASM Build Script
# This script automates the compilation of LibRaw to WebAssembly

Write-Host "=== LibRaw WASM Builder ===" -ForegroundColor Cyan
Write-Host ""

# Check if Emscripten is installed
$emsdk = Get-Command "emcc" -ErrorAction SilentlyContinue
if (-not $emsdk) {
    Write-Host "ERROR: Emscripten not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Emscripten first:" -ForegroundColor Yellow
    Write-Host "1. Download: https://github.com/emscripten-core/emsdk/archive/refs/heads/main.zip" -ForegroundColor White
    Write-Host "2. Extract to C:\emsdk" -ForegroundColor White
    Write-Host "3. Run these commands:" -ForegroundColor White
    Write-Host "   cd C:\emsdk" -ForegroundColor Gray
    Write-Host "   .\emsdk install latest" -ForegroundColor Gray
    Write-Host "   .\emsdk activate latest" -ForegroundColor Gray
    Write-Host "   .\emsdk_env.ps1" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Emscripten found: $($emsdk.Path)" -ForegroundColor Green
Write-Host ""

# Set paths
$projectRoot = Get-Location
$librawSource = Join-Path $projectRoot "LibRaw-0.21.4"
$outputDir = Join-Path $projectRoot "public\wasm"

# Verify LibRaw source exists
if (-not (Test-Path $librawSource)) {
    Write-Host "ERROR: LibRaw source not found at: $librawSource" -ForegroundColor Red
    Write-Host "Please extract LibRaw-0.21.4.tar.gz first." -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ LibRaw source found" -ForegroundColor Green
Write-Host ""

# Create output directory
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
Write-Host "✓ Output directory ready: $outputDir" -ForegroundColor Green
Write-Host ""

# Build LibRaw WASM
Write-Host "Building LibRaw WASM... (this may take 5-10 minutes)" -ForegroundColor Yellow
Write-Host ""

Set-Location $librawSource

# Configure for WASM build
$env:CFLAGS = "-O3"
$env:CXXFLAGS = "-O3"

# Create a simple C wrapper for LibRaw
$wrapperCode = @"
#include "libraw/libraw.h"
#include <emscripten/emscripten.h>
#include <stdlib.h>
#include <string.h>

EMSCRIPTEN_KEEPALIVE
void* libraw_init() {
    return libraw_init(0);
}

EMSCRIPTEN_KEEPALIVE
int libraw_open_buffer(void* lr, void* buffer, size_t size) {
    return libraw_open_buffer((libraw_data_t*)lr, buffer, size);
}

EMSCRIPTEN_KEEPALIVE
int libraw_unpack(void* lr) {
    return libraw_unpack((libraw_data_t*)lr);
}

EMSCRIPTEN_KEEPALIVE
int libraw_dcraw_process(void* lr) {
    return libraw_dcraw_process((libraw_data_t*)lr);
}

EMSCRIPTEN_KEEPALIVE
void* libraw_get_image(void* lr, int* width, int* height) {
    libraw_processed_image_t* img = libraw_dcraw_make_mem_image((libraw_data_t*)lr, NULL);
    if (img) {
        *width = img->width;
        *height = img->height;
        return img->data;
    }
    return NULL;
}

EMSCRIPTEN_KEEPALIVE
void libraw_close(void* lr) {
    libraw_close((libraw_data_t*)lr);
}
"@

Set-Content -Path "libraw_wrapper.c" -Value $wrapperCode

Write-Host "Compiling LibRaw to WebAssembly..." -ForegroundColor Cyan

# Compile
emcc `
    -O3 `
    -s WASM=1 `
    -s EXPORTED_FUNCTIONS="['_libraw_init','_libraw_open_buffer','_libraw_unpack','_libraw_dcraw_process','_libraw_get_image','_libraw_close']" `
    -s EXPORTED_RUNTIME_METHODS="['ccall','cwrap']" `
    -s ALLOW_MEMORY_GROWTH=1 `
    -s MODULARIZE=1 `
    -s EXPORT_NAME="'LibRawModule'" `
    -I. `
    libraw_wrapper.c `
    src/libraw_cxx.cpp `
    src/libraw_c_api.cpp `
    src/libraw_datastream.cpp `
    internal/*.cpp `
    -o "$outputDir\libraw.js"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== SUCCESS! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "✓ libraw.wasm created at: $outputDir\libraw.wasm" -ForegroundColor Green
    Write-Host "✓ libraw.js created at: $outputDir\libraw.js" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Restart your dev server: npm run dev" -ForegroundColor White
    Write-Host "2. The app will automatically use full-color RAW processing!" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "=== BUILD FAILED ===" -ForegroundColor Red
    Write-Host "Check the errors above." -ForegroundColor Yellow
}

Set-Location $projectRoot
