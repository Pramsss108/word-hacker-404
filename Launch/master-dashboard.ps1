<#
.SYNOPSIS
    Word Hacker 404 - Master Control Dashboard
    "The One Ring to Rule Them All"
#>

$host.UI.RawUI.WindowTitle = "Word Hacker 404 - MASTER CONTROL"
Clear-Host

# Since this script is in /Launch, the Project Root is one level up
$Root = Resolve-Path "$PSScriptRoot\.."
Write-Host "Project Root detected at: $Root" -ForegroundColor Gray

function Show-Menu {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "   WORD HACKER 404 - CONTROL CENTER     " -ForegroundColor White
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "1. Launch Main Website (Port 1420)" -ForegroundColor Green
    Write-Host "2. Launch Trash Hunter (System Cleaner)" -ForegroundColor Magenta
    Write-Host "3. Launch Replica Studio (Video Tool)" -ForegroundColor White
    Write-Host "4. Launch AI Gateway (Brain)" -ForegroundColor Yellow
    Write-Host "5. Launch Desktop App (Electron)" -ForegroundColor Blue
    Write-Host "6. LAUNCH EVERYTHING (Chaos Mode)" -ForegroundColor Red
    Write-Host "Q. Quit" -ForegroundColor Gray
    Write-Host "========================================" -ForegroundColor Cyan
}

do {
    Show-Menu
    $input = Read-Host "Select Option"

    switch ($input) {
        "1" { 
            Write-Host "Starting Main Website..." -ForegroundColor Green
            Start-Process "npm" -ArgumentList "run dev" -WorkingDirectory "$Root"
        }
        "2" { 
            Write-Host "Starting Trash Hunter (Admin Safe Mode)..." -ForegroundColor Magenta
            # We call the BAT using the absolute path from Root
            Set-Location "$Root\trash-hunter"
            Start-Process "START-SMART-DEV.bat" -Verb RunAs 
            Set-Location $PSScriptRoot
        }
        "3" { 
            Write-Host "Starting Replica Studio..." -ForegroundColor White
            Start-Process "npm" -ArgumentList "run dev" -WorkingDirectory "$Root\replica-studio"
        }
        "4" { 
            Write-Host "Starting AI Gateway..." -ForegroundColor Yellow
            Start-Process "npx" -ArgumentList "wrangler dev" -WorkingDirectory "$Root\ai-gateway"
        }
        "5" { 
            Write-Host "Starting Desktop App..." -ForegroundColor Blue
            Start-Process "npm" -ArgumentList "start" -WorkingDirectory "$Root\desktop-app"
        }
        "6" {
            Write-Host "LAUNCHING ALL SYSTEMS..." -ForegroundColor Red
            Start-Process "npm" -ArgumentList "run dev" -WorkingDirectory "$Root"
            Start-Sleep -Seconds 2
            
            Set-Location "$Root\trash-hunter"
            Start-Process "START-SMART-DEV.bat" -Verb RunAs
            Set-Location $PSScriptRoot
            
            Start-Process "npm" -ArgumentList "run dev" -WorkingDirectory "$Root\replica-studio"
            Start-Process "npx" -ArgumentList "wrangler dev" -WorkingDirectory "$Root\ai-gateway"
        }
        "Q" { exit }
        "q" { exit }
    }
} until ($input -eq "Q")
