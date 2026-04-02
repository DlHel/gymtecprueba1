@echo off
echo ========================================
echo   GYMTEC ERP - Deteniendo Servidores
echo ========================================
echo.

echo Deteniendo Backend (Node.js)...
taskkill /f /im node.exe >nul 2>&1

echo Deteniendo Frontend (Python)...
taskkill /f /im python.exe >nul 2>&1

echo.
echo ========================================
echo    Servidores detenidos correctamente
echo ========================================
echo.
echo Presiona cualquier tecla para continuar...
pause >nul 