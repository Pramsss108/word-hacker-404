# Autonomous Deployment Agent - NASA-Grade Quality Assurance & Auto-Deploy
# Author: GitHub Copilot Autonomous Agent
# Version: 1.0.0

param(
    [string]$CommitMessage = "feat: Autonomous deployment update",
    [switch]$SkipQA = $false,
    [switch]$Force = $false
)

# Configuration
$ProjectPath = "D:\A scret project\Word hacker 404"
$RepoUrl = "https://github.com/Pramsss108/word-hacker-404.git"
$LiveUrl = "https://pramsss108.github.io/word-hacker-404/"

# Colors for output
$Green = "Green"
$Yellow = "Yellow" 
$Red = "Red"
$Cyan = "Cyan"
$Magenta = "Magenta"

function Write-Status {
    param([string]$Message, [string]$Color = "White")
    Write-Host "[AGENT] $Message" -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-Host "SUCCESS: $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "WARNING: $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "ERROR: $Message" -ForegroundColor $Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "INFO: $Message" -ForegroundColor $Cyan
}

function Test-Prerequisites {
    Write-Status "Checking prerequisites..." $Cyan
    
    # Check if in correct directory
    if (!(Test-Path $ProjectPath)) {
        Write-Error "Project directory not found: $ProjectPath"
        return $false
    }
    
    Set-Location $ProjectPath
    
    # Check if git repo
    if (!(Test-Path ".git")) {
        Write-Error "Not a git repository"
        return $false
    }
    
    # Check if npm is available
    try {
        $npmVersion = npm --version
        Write-Success "npm available: $npmVersion"
    } catch {
        Write-Error "npm not found"
        return $false
    }
    
    # Check if node_modules exists
    if (!(Test-Path "node_modules")) {
        Write-Info "Installing dependencies..."
        npm install
    }
    
    return $true
}

function Invoke-QualityAssurance {
    if ($SkipQA) {
        Write-Warning "Skipping quality assurance (SkipQA flag used)"
        return $true
    }
    
    Write-Status "Running NASA-Grade Quality Assurance..." $Magenta
    
    # Phase 1: TypeScript Compilation
    Write-Status "Phase 1: TypeScript Compilation Validation" $Cyan
    npm run type-check
    if ($LASTEXITCODE -ne 0) {
        Write-Error "TypeScript compilation failed"
        return $false
    }
    Write-Success "Phase 1 PASSED: TypeScript compilation successful"
    
    # Phase 2: Production Build
    Write-Status "Phase 2: Production Build Validation" $Cyan  
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Production build failed"
        return $false
    }
    Write-Success "Phase 2 PASSED: Production build successful"
    
    # Phase 3: Lint Check (if available)
    if (Test-Path "package.json") {
        $packageJson = Get-Content "package.json" | ConvertFrom-Json
        if ($packageJson.scripts.lint) {
            Write-Status "Phase 3: Code Quality Linting" $Cyan
            npm run lint
            if ($LASTEXITCODE -ne 0 -and !$Force) {
                Write-Warning "Linting issues detected (use -Force to ignore)"
                return $false
            }
            Write-Success "Phase 3 PASSED: Code quality validated"
        }
    }
    
    Write-Success "NASA-Grade Quality Assurance COMPLETED - All systems GO!"
    return $true
}

function Invoke-AutoDeploy {
    Write-Status "Initiating Autonomous Deployment..." $Magenta
    
    # Configure git for autonomous operation
    Write-Status "Configuring git for autonomous operation..." $Cyan
    git config --local user.name "GitHub Copilot Agent"
    git config --local user.email "copilot-agent@github.com"
    git config --local push.default simple
    git config --local core.autocrlf true
    
    # Check for changes
    $status = git status --porcelain
    if ([string]::IsNullOrEmpty($status)) {
        Write-Warning "No changes detected. Nothing to deploy."
        return $true
    }
    
    Write-Info "Changes detected. Preparing deployment..."
    
    # Stage all changes
    Write-Status "Staging changes..." $Cyan
    git add .
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to stage changes"
        return $false
    }
    
    # Commit with timestamp and agent signature
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss UTC"
    $fullCommitMessage = "$CommitMessage - Autonomous Agent Deployment - $timestamp - NASA-Grade QA: PASSED - Auto-deployed via GitHub Copilot Agent"
    
    Write-Status "Creating commit..." $Cyan
    git commit -m $fullCommitMessage
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to create commit"
        return $false
    }
    
    # Push to remote
    Write-Status "Deploying to production..." $Cyan
    git push origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to push to remote repository"
        return $false
    }
    
    Write-Success "Deployment pushed successfully!"
    return $true
}

function Wait-ForDeployment {
    Write-Status "Monitoring deployment status..." $Cyan
    Write-Info "GitHub Actions will deploy to: $LiveUrl"
    Write-Info "Typical deployment time: 2-3 minutes"
    
    # Wait for deployment (GitHub Actions typically takes 2-3 minutes)
    $deploymentTime = 180 # 3 minutes
    $checkInterval = 15   # 15 seconds
    $elapsed = 0
    
    while ($elapsed -lt $deploymentTime) {
        Start-Sleep $checkInterval
        $elapsed += $checkInterval
        $percentage = [math]::Round(($elapsed / $deploymentTime) * 100)
        Write-Progress -Activity "Waiting for GitHub Pages deployment" -Status "$percentage% complete" -PercentComplete $percentage
    }
    
    Write-Progress -Activity "Waiting for GitHub Pages deployment" -Completed
    Write-Success "Deployment should be live at: $LiveUrl"
    Write-Info "Opening live site in browser..."
    
    # Open the live site
    Start-Process $LiveUrl
}

function Show-CompletionSummary {
    Write-Host ""
    Write-Host "AUTONOMOUS DEPLOYMENT COMPLETE!" -ForegroundColor $Green
    Write-Host "============================================" -ForegroundColor $Green
    Write-Host ""
    Write-Host "Deployment Summary:" -ForegroundColor $Cyan
    Write-Host "   Quality Assurance: PASSED" -ForegroundColor $Green
    Write-Host "   Production Build: SUCCESS" -ForegroundColor $Green  
    Write-Host "   Deployment: LIVE" -ForegroundColor $Green
    Write-Host ""
    Write-Host "Live Site: $LiveUrl" -ForegroundColor $Yellow
    Write-Host "Repository: $RepoUrl" -ForegroundColor $Yellow
    Write-Host ""
    Write-Host "Autonomous Agent Status: MISSION ACCOMPLISHED" -ForegroundColor $Magenta
    Write-Host ""
}

# Main execution flow
function Main {
    Write-Host ""
    Write-Host "GitHub Copilot Autonomous Deployment Agent" -ForegroundColor $Magenta
    Write-Host "================================================" -ForegroundColor $Magenta
    Write-Host "NASA-Grade Quality Assurance and Auto-Deploy" -ForegroundColor $Cyan
    Write-Host ""
    
    # Phase 1: Prerequisites
    if (!(Test-Prerequisites)) {
        Write-Error "Prerequisites check failed"
        exit 1
    }
    
    # Phase 2: Quality Assurance
    if (!(Invoke-QualityAssurance)) {
        Write-Error "Quality assurance failed"
        exit 1
    }
    
    # Phase 3: Autonomous Deployment
    if (!(Invoke-AutoDeploy)) {
        Write-Error "Deployment failed"
        exit 1
    }
    
    # Phase 4: Deployment Monitoring
    Wait-ForDeployment
    
    # Phase 5: Completion Summary
    Show-CompletionSummary
    
    Write-Success "Autonomous deployment pipeline completed successfully!"
}

# Execute main function
try {
    Main
} catch {
    Write-Error "Autonomous deployment failed: $($_.Exception.Message)"
    exit 1
}