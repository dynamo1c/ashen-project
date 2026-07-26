@echo off
title Ashen Protocol Intelligence Dashboard
echo ====================================================
echo   ASHEN PROTOCOL - KSP DATATHON 2026 INTELLIGENCE
echo ====================================================
echo.

set NODE_OPTIONS=--no-deprecation

cd /d "%~dp0functions\ashen_api"

if not exist node_modules (
    echo [+] Installing backend dependencies...
    call npm install
    echo.
)

echo [+] Starting Ashen Protocol Server...
echo [+] Web Dashboard: http://localhost:3000
echo [+] API Server:    http://localhost:3000/server/ashen_api/api
echo.
node index.js
pause
