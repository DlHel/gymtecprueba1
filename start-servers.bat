@echo off
echo ========================================
echo    GYMTEC ERP - Iniciando Servidores
echo         (Configuracion MySQL)
echo ========================================
echo.

echo [INFO] Verificando que MySQL este corriendo...
echo        Si MySQL no esta iniciado, por favor inicialo desde XAMPP
echo.

echo [1/3] Verificando configuracion del backend...
if not exist "backend\config.env" (
    echo ❌ Error: No se encuentra backend\config.env
    echo    Por favor copia backend\config.env.example a backend\config.env
    echo    y configura los parametros de MySQL
    pause
    exit /b 1
)

echo [2/3] Iniciando Backend MySQL (Node.js)...
start "Gymtec Backend MySQL" cmd /k "cd backend && echo Iniciando servidor con MySQL... && node src/server.js"

echo [3/3] Esperando que el backend inicie y luego iniciando Frontend...
timeout /t 3 /nobreak >nul
start "Gymtec Frontend" cmd /k "cd frontend && echo Iniciando servidor frontend... && python -m http.server 8080"

echo.
echo ========================================
echo   Servidores MySQL iniciados correctamente
echo ========================================
echo.
echo Backend MySQL:  http://localhost:3000
echo Frontend:       http://localhost:8080
echo Test Sedes:     http://localhost:8080/test-sedes.html
echo Clientes:       http://localhost:8080/clientes.html
echo.
echo [IMPORTANTE] Asegurate de que MySQL este corriendo en XAMPP
echo              Base de datos: gymtec_erp
echo.
echo Presiona cualquier tecla para continuar...
pause >nul 