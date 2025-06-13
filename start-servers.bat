@echo off
echo ========================================
echo    GYMTEC ERP - Iniciando Servidores
echo ========================================
echo.

echo [1/2] Iniciando Backend (Node.js)...
start "Gymtec Backend" cmd /k "cd backend && npm start"

echo [2/2] Iniciando Frontend (Python)...
start "Gymtec Frontend" cmd /k "cd frontend && python -m http.server 8080"

echo.
echo ========================================
echo   Servidores iniciados correctamente
echo ========================================
echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:8080
echo.
echo Presiona cualquier tecla para continuar...
pause >nul 