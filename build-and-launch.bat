@echo off
REM AI Website Builder - Windows Build & Launch Script
setlocal enabledelayedexpansion

echo.
echo =========================================
echo   AI Website Builder - .NET Launcher
echo =========================================
echo.

dotnet restore AiWebsiteBuilder.csproj
dotnet build -c Debug AiWebsiteBuilder.csproj
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo =========================================
echo   1. STARTING NEXT.JS BACKEND
echo =========================================
echo Opening Next.js in a separate terminal window...
start "Next.js Server" cmd /k "npm run dev"

echo.
echo IMPORTANT: Look at the new terminal window that just opened!
echo Wait until it says "Ready in Xms" and finishes compiling Sandpack.
echo.
echo Press any key ONLY AFTER the Next.js server is fully running...
pause >nul

echo.
echo =========================================
echo   2. LAUNCHING DESKTOP UI
echo =========================================
"%cd%\bin\Debug\net8.0-windows\AiWebsiteBuilder.exe"

if errorlevel 1 (
    echo.
    echo Application exited with an error code.
    pause
)