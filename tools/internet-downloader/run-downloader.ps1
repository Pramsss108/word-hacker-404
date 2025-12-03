param(
    [Parameter(Mandatory = $true)]
    [string[]]$Urls,

    [ValidateSet('mp4-1080', 'mp4-720', 'mp3')]
    [string]$Format = 'mp4-1080',

    [int]$Workers
)

if (-not $Urls -or $Urls.Count -eq 0) {
    Write-Error 'Pass at least one URL (-Urls "https://youtu.be/..." ).'
    exit 1
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonScript = Join-Path $scriptDir 'download.py'

if (-not (Test-Path $pythonScript)) {
    Write-Error "Could not find download.py at $pythonScript"
    exit 1
}

function Resolve-Python {
    $candidates = @('python', 'py')
    foreach ($candidate in $candidates) {
        $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
        if ($cmd) {
            return $cmd.Source
        }
    }
    return $null
}

$pythonExe = Resolve-Python
if (-not $pythonExe) {
    Write-Error 'Python is not available on PATH. Install Python 3.11+ and try again.'
    exit 1
}

$projectRoot = Split-Path (Split-Path $scriptDir -Parent) -Parent
if (-not $projectRoot) {
    $projectRoot = Split-Path $scriptDir -Parent
}
$downloadsDir = Join-Path $projectRoot 'downloads'
if (-not (Test-Path $downloadsDir)) {
    New-Item -ItemType Directory -Path $downloadsDir | Out-Null
}

$requirements = Join-Path $scriptDir 'requirements.txt'
if (Test-Path $requirements) {
    Write-Host 'Ensuring downloader dependencies (one-time pip install)…' -ForegroundColor DarkGray
    & $pythonExe '-m' 'pip' 'install' '--disable-pip-version-check' '-r' $requirements | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Write-Error 'Failed to install Python dependencies. Review the pip errors above.'
        exit $LASTEXITCODE
    }
}

$arguments = @($pythonScript, '--format-choice', $Format, '--output', $downloadsDir)
if ($Workers -gt 0) {
    $arguments += @('--workers', $Workers)
}
$arguments += $Urls

Write-Host "Launching downloader with $($Urls.Count) job(s) in format $Format" -ForegroundColor Cyan
Push-Location $scriptDir
& $pythonExe @arguments
$exitCode = $LASTEXITCODE
Pop-Location
exit $exitCode
