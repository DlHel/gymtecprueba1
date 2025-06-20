@echo off
echo ========================================
echo    GYMTEC ERP - Iniciando Servidores
echo         (Solo MySQL - SQLite Eliminado)
echo ========================================
echo.

echo [INFO] Verificando que MySQL este corriendo...
echo        Si MySQL no esta iniciado, por favor inicialo desde XAMPP
echo.

echo [1/4] Verificando configuracion del backend...
if not exist "backend\config.env" (
    echo ❌ Error: No se encuentra backend\config.env
    echo    Por favor copia backend\config.env.example a backend\config.env
    echo    y configura los parametros de MySQL
    pause
    exit /b 1
)

echo [2/4] Verificando conexion a MySQL...
cd backend
node -e "const mysql = require('./src/mysql-database'); mysql.testConnection().then(() => { console.log('✅ MySQL conectado correctamente'); process.exit(0); }).catch(err => { console.log('❌ Error MySQL:', err.message); console.log('💡 Asegurate de que XAMPP este corriendo y la BD gymtec_erp exista'); process.exit(1); });"
if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ No se pudo conectar a MySQL
    echo    Por favor verifica que:
    echo    1. XAMPP este corriendo
    echo    2. MySQL este iniciado
    echo    3. La base de datos 'gymtec_erp' exista
    echo.
    pause
    exit /b 1
)
cd ..

echo [3/4] Iniciando Backend MySQL (Node.js)...
start "Gymtec Backend MySQL" cmd /k "cd backend && echo Iniciando servidor con MySQL... && node src/server.js"

echo [4/4] Esperando que el backend inicie y luego iniciando Frontend...
timeout /t 3 /nobreak >nul
start "Gymtec Frontend" cmd /k "cd frontend && echo Iniciando servidor frontend... && python -m http.server 8080"

echo.
echo ========================================
echo   Servidores MySQL iniciados correctamente
echo ========================================
echo.
echo Backend MySQL:  http://localhost:3000
echo Frontend:       http://localhost:8080
echo Clientes:       http://localhost:8080/clientes.html
echo Test MySQL:     http://localhost:8080/test-mysql.html
echo.
echo [IMPORTANTE] Sistema configurado SOLO para MySQL
echo              SQLite ha sido completamente eliminado
echo              Base de datos: gymtec_erp
echo.
echo Presiona cualquier tecla para continuar...
pause >nul 