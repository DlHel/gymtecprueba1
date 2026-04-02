@echo off
echo ========================================
echo   GYMTEC ERP - Reinicio Completo
echo ========================================
echo.

echo [1/3] Deteniendo servidores existentes...
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/3] Iniciando Backend (Puerto 3000)...
cd backend
start /MIN "GYMTEC Backend" cmd /c "npm start"
cd ..
timeout /t 5 /nobreak >nul

echo [3/3] Iniciando Frontend (Puerto 8080)...
cd frontend
start /MIN "GYMTEC Frontend" cmd /c "python -m http.server 8080"
cd ..

echo.
echo ========================================
echo   Servidores Iniciados Correctamente
echo ========================================
echo.
echo   Backend:  http://localhost:3000
echo   Frontend: http://localhost:8080
echo.
echo Presiona cualquier tecla para salir...
pause >nul
