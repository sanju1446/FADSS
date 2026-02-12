@echo off
echo Starting FADSS Unified Project...

:: 1. Start Portal Backend (Node.js) - Port 3000
echo Starting Portal Backend...
start "FADSS Portal Backend" cmd /k "cd apps\portal && npm start"

:: 2. Start Portal Python API (Market Helper) - Port 8000
echo Starting Portal Python API...
start "FADSS Portal Python API" cmd /k "cd apps\portal\backend && venv\Scripts\activate && uvicorn main:app --reload --port 8000"
echo Starting Market Backend...
start "FADSS Market Backend" cmd /k "cd apps\market\backend && venv\Scripts\activate && uvicorn app.main:app --reload --port 8001"

:: 3. Start Market Frontend (React) - Port 3001
echo Starting Market Frontend...
start "FADSS Market Frontend" cmd /k "cd apps\market\frontend && set PORT=3001 && npm start"

echo All services started!
echo Portal: http://localhost:3000
echo Market: http://localhost:3001
start http://localhost:3000
pause
