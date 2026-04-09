@echo off
REM AI Website Builder - Environment Setup
REM Creates the required .env.local file for API keys

echo.
echo =========================================
echo   AI Website Builder - Environment Setup
echo =========================================
echo.

if exist ".env.local" (
    echo WARNING: .env.local already exists!
    echo.
    echo This will overwrite your existing environment file.
    echo Make sure to backup any important API keys first.
    echo.
    choice /C YN /M "Continue with setup? (Y/N)"
    if errorlevel 2 goto :exit
)

echo Creating .env.local file...
echo.
echo You'll need to add your API keys to this file.
echo.
echo Required API Keys:
echo ------------------
echo GEMINI_API_KEY    - From https://ai.google.dev/
echo NEXT_PUBLIC_CONVEX_URL - From your Convex dashboard
echo.
echo Press any key to open the file for editing...
pause >nul

echo # AI Configuration > .env.local
echo GEMINI_API_KEY=your_gemini_api_key_here >> .env.local
echo. >> .env.local
echo # Convex Configuration >> .env.local
echo NEXT_PUBLIC_CONVEX_URL=your_convex_deployment_url >> .env.local

echo .env.local created successfully!
echo.
echo IMPORTANT: Edit the .env.local file and replace the placeholder values
echo with your actual API keys before running the application.
echo.
echo To edit the file:
echo - Right-click .env.local and open with Notepad
echo - Or run: notepad .env.local
echo.
echo API Key Sources:
echo - Gemini AI: https://ai.google.dev/
echo - Convex: https://dashboard.convex.dev/
echo.

:exit
echo Press any key to exit...
pause >nul