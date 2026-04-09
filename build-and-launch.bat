@echo off
REM AI Website Builder - Windows Build & Launch Script
REM This script sets up and launches the application using .NET CLR

setlocal enabledelayedexpansion

echo.
echo =========================================
echo   AI Website Builder - .NET Launcher
echo =========================================
echo.

REM Check if .NET SDK is installed
dotnet --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: .NET 8 SDK not found!
    echo Please install .NET 8 from: https://dotnet.microsoft.com/download
    pause
    exit /b 1
)

echo [1/4] .NET SDK found: 
dotnet --version

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found!
    echo Please install Node.js from: https://nodejs.org/
    echo This is required for the Next.js server and API endpoints.
    pause
    exit /b 1
)

echo [2/4] Node.js found:
node --version

REM Check if npm is available
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm not found!
    echo npm should be included with Node.js. Please reinstall Node.js.
    pause
    exit /b 1
)

echo [3/4] npm found:
npm --version

echo.
echo [4/4] Restoring .NET dependencies...
dotnet restore AiWebsiteBuilder.csproj
if errorlevel 1 (
    echo ERROR: Failed to restore dependencies
    pause
    exit /b 1
)

echo.
echo [5/5] Building project...
dotnet build -c Debug AiWebsiteBuilder.csproj
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo =========================================
echo   LAUNCHING AI WEBSITE BUILDER
echo =========================================
echo.
echo The application will:
echo 1. Start the Next.js development server
echo 2. Wait for localhost:3000 to be ready
echo 3. Test API endpoints (/api/enhance-prompt, etc.)
echo 4. Launch the WPF application
echo 5. Load your React app in the embedded browser
echo.
echo If the app fails to start, check:
echo - Node.js and npm are properly installed
echo - Port 3000 is not blocked by firewall
echo - No other server is using port 3000
echo.
echo Press any key to continue...
pause >nul

REM Launch the application
echo Starting application...
"%cd%\bin\Debug\net8.0-windows\AiWebsiteBuilder.exe"

if errorlevel 1 (
    echo.
    echo ERROR: Application failed to launch
    echo Check that WebView2 Runtime is installed:
    echo https://developer.microsoft.com/en-us/microsoft-edge/webview2/
    echo.
    echo Also verify that the Next.js server can start:
    echo npm run dev
    pause
    exit /b 1
)

endlocal
