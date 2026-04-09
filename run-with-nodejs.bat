@echo off
REM AI Website Builder - Direct Node.js Launcher
REM Run this when you have Node.js available

echo.
echo =========================================
echo   AI Website Builder - Node.js Direct
echo =========================================
echo.

REM Check if Node.js path is provided as argument
if "%~1"=="" (
    echo This script needs the path to your Node.js installation.
    echo.
    echo Usage: %0 "C:\Path\To\Node.js"
    echo.
    echo Example: %0 "C:\Program Files\nodejs"
    echo Example: %0 "C:\Users\YourName\AppData\Local\Programs\nodejs"
    echo.
    echo To find your Node.js installation:
    echo 1. Open VS Code
    echo 2. Open integrated terminal (Ctrl+`)
    echo 3. Run: where node
    echo 4. Copy the path and use it with this script
    echo.
    echo Or install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

set NODE_PATH=%~1
set NPM_PATH=%NODE_PATH%\npm.cmd

REM Verify Node.js exists
if not exist "%NODE_PATH%\node.exe" (
    echo ERROR: node.exe not found at: %NODE_PATH%
    echo Please check the path and try again.
    pause
    exit /b 1
)

echo Node.js found at: %NODE_PATH%
"%NODE_PATH%\node.exe" --version

REM Verify npm exists
if not exist "%NPM_PATH%" (
    set NPM_PATH=%NODE_PATH%\node
)
if not exist "%NPM_PATH%" (
    echo ERROR: npm not found. It should be in the same directory as node.exe
    pause
    exit /b 1
)

echo npm found at: %NPM_PATH%
"%NPM_PATH%" --version

echo.
echo [1/2] Installing dependencies...
"%NPM_PATH%" install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/2] Starting Next.js development server...
echo.
echo =========================================
echo   SERVER STARTING...
echo =========================================
echo.
echo Your app will be available at: http://localhost:3000
echo.
echo To stop the server, close this window or press Ctrl+C
echo.
echo =========================================
echo.

REM Start the development server
"%NPM_PATH%" run dev

pause