@echo off
title FADSS Integrated Launcher
echo ===================================================
echo       FADSS and FADSS Amoolya INTEGRATION
echo ===================================================

echo [1/3] Starting FADSS Node Server (Port 3000)...
start "FADSS Main Server" cmd /k "cd FADSS && npm start"

echo [2/3] Starting FADSS Amolia Backend (Port 8000)...
start "Amolia Backend" cmd /k "cd "fadss(Amoolya)\backend" && python -m uvicorn app.main:app --reload --port 8000"

echo [3/3] Starting FADSS Amolia Frontend (Port 3006)...
REM BROWSER=none and PORT=3006 are set in .env
start "Amolia Frontend" cmd /k "cd "fadss(Amoolya)\frontend" && npm start"

echo.
echo All services are starting up...
echo Please wait a moment for bundles to compile.
echo.
echo Once ready, open FADSS at: http://localhost:3000/dashboard.html
echo.
pause
