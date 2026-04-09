@echo off
REM AI Website Builder - Node.js Diagnostic
REM Helps troubleshoot Node.js installation and setup issues

echo.
echo =========================================
echo   AI Website Builder - Node.js Diagnostic
echo =========================================
echo.

echo [1/6] Checking for Node.js in PATH...
where node >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found in PATH
) else (
    echo ✅ Node.js found in PATH:
    where node
    node --version
)

echo.
echo [2/6] Checking for npm in PATH...
where npm >nul 2>&1
if errorlevel 1 (
    echo ❌ npm not found in PATH
) else (
    echo ✅ npm found in PATH:
    where npm
    npm --version
)

echo.
echo [3/6] Checking common Node.js installation locations...

setlocal enabledelayedexpansion

set "progfiles=C:\Program Files\nodejs"
set "progfiles86=C:\Program Files (x86)\nodejs"
set "localprograms=%USERPROFILE%\AppData\Local\Programs\nodejs"
set "roamingnpm=%USERPROFILE%\AppData\Roaming\npm"

if exist "!progfiles!\node.exe" (
    echo ✅ Found Node.js at: !progfiles!
    echo    Version:
    "!progfiles!\node.exe" --version 2>nul
)

if exist "!progfiles86!\node.exe" (
    echo ✅ Found Node.js at: !progfiles86!
    echo    Version:
    "!progfiles86!\node.exe" --version 2>nul
)

if exist "!localprograms!\node.exe" (
    echo ✅ Found Node.js at: !localprograms!
    echo    Version:
    "!localprograms!\node.exe" --version 2>nul
)

if exist "!roamingnpm!\node.exe" (
    echo ✅ Found Node.js at: !roamingnpm!
    echo    Version:
    "!roamingnpm!\node.exe" --version 2>nul
)

endlocal

echo.
echo [4/6] Checking project dependencies...
if exist "package.json" (
    echo ✅ package.json found
    if exist "node_modules" (
        echo ✅ node_modules directory exists
        echo    Package count: 
        dir /b node_modules 2>nul | find /c ".">nul
    ) else (
        echo ❌ node_modules directory missing - run 'npm install'
    )
) else (
    echo ❌ package.json not found
)

echo.
echo [5/6] Checking environment file...
if exist ".env.local" (
    echo ✅ .env.local found
    echo    File contains:
    findstr /r /c:".*=" .env.local 2>nul | findstr /v "your_" | find /c "=" >nul
    if errorlevel 1 (
        echo    ⚠️  WARNING: API keys may not be configured
    ) else (
        echo    ✅ API keys appear to be configured
    )
) else (
    echo ❌ .env.local missing - run 'setup-env.bat'
)

echo.
echo [6/6] Testing Next.js installation...
if exist "node_modules\.bin\next.cmd" (
    echo ✅ Next.js found in node_modules
) else if exist "node_modules\.bin\next" (
    echo ✅ Next.js found in node_modules
) else (
    echo ❌ Next.js not found - run 'npm install'
)

echo.
echo =========================================
echo   DIAGNOSTIC COMPLETE
echo =========================================
echo.

echo RECOMMENDED ACTIONS:
echo.

if not exist ".env.local" (
    echo 1. Run setup-env.bat to create environment file
    echo.
)

if not exist "node_modules" (
    echo 2. Run npm install to install dependencies
    echo.
)

echo 3. If Node.js is not in PATH, use run-with-nodejs.bat with your Node.js path
echo    Example: .\run-with-nodejs.bat "C:\Program Files\nodejs"
echo.

echo 4. Or install Node.js from: https://nodejs.org/
echo.

echo Press any key to exit...
pause >nul