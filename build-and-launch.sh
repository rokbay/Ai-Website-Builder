#!/bin/bash
# AI Website Builder - macOS/Linux Launch Script
# This script sets up and launches the application using .NET CLR

echo ""
echo "========================================="
echo "  AI Website Builder - .NET Launcher"
echo "========================================="
echo ""

# Check if .NET SDK is installed
if ! command -v dotnet &> /dev/null; then
    echo "ERROR: .NET 8 SDK not found!"
    echo "Please install .NET 8 from: https://dotnet.microsoft.com/download"
    exit 1
fi

echo "[1/4] .NET SDK found:"
dotnet --version

echo ""
echo "[2/4] Restoring .NET dependencies..."
dotnet restore AiWebsiteBuilder.csproj
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to restore dependencies"
    exit 1
fi

echo ""
echo "[3/4] Building project..."
dotnet build -c Debug AiWebsiteBuilder.csproj
if [ $? -ne 0 ]; then
    echo "ERROR: Build failed"
    exit 1
fi

echo ""
echo "[4/4] Launching application..."
echo ""

# Find and launch the application
FRAMEWORK_PATH=$(find "$(pwd)/bin/Debug" -name "AiWebsiteBuilder" -o -name "AiWebsiteBuilder.exe" | head -1)

if [ -z "$FRAMEWORK_PATH" ]; then
    echo "ERROR: Compiled application not found"
    exit 1
fi

# Launch the application
"$FRAMEWORK_PATH"

if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Application failed to launch"
    exit 1
fi
