param(
    [Parameter(Mandatory=$true)]
    [string]$NodePath
)

Write-Host ""
Write-Host "========================================="
Write-Host "  AI Website Builder - Node.js Direct"
Write-Host "========================================="
Write-Host ""

# Verify Node.js exists
$nodeExe = Join-Path $NodePath "node.exe"
if (-not (Test-Path $nodeExe)) {
    Write-Host "ERROR: node.exe not found at: $NodePath" -ForegroundColor Red
    Write-Host "Please check the path and try again." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Node.js found at: $NodePath" -ForegroundColor Green
& $nodeExe --version

# Find npm
$npmCmd = Join-Path $NodePath "npm.cmd"
if (-not (Test-Path $npmCmd)) {
    $npmCmd = Join-Path $NodePath "npm"
}
if (-not (Test-Path $npmCmd)) {
    Write-Host "ERROR: npm not found. It should be in the same directory as node.exe" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "npm found at: $npmCmd" -ForegroundColor Green
& $npmCmd --version

Write-Host ""
Write-Host "[1/2] Installing dependencies..." -ForegroundColor Yellow
& $npmCmd install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[2/2] Starting Next.js development server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   SERVER STARTING..." -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your app will be available at: http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "To stop the server, close this window or press Ctrl+C" -ForegroundColor Yellow
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Start the development server
& $npmCmd run dev