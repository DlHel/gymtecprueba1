@echo off
cls
echo ========================================
echo    GYMTEC ERP - MODO DESARROLLO MYSQL
echo ========================================
echo.

echo Verificando XAMPP...
if not exist "C:\xampp\mysql\bin\mysql.exe" (
    echo ❌ ERROR: XAMPP no encontrado en C:\xampp
    echo    Por favor instala XAMPP primero
    pause
    exit /b 1
)

echo ✅ XAMPP encontrado
echo.
echo Verificando MySQL...
netstat -an | find "3306" >nul
if errorlevel 1 (
    echo ❌ MySQL no está ejecutándose
    echo    Abre XAMPP Control Panel e inicia MySQL
    pause
    exit /b 1
)

echo ✅ MySQL ejecutándose en puerto 3306
echo.

echo [1/3] Instalando dependencias...
cd backend
call npm install

echo [2/3] Creando esquema de base de datos...
call npm run setup-mysql

echo [3/3] Iniciando servidores...
echo.
echo ========================================
echo   SERVIDORES INICIADOS - MODO MYSQL
echo ========================================
echo.
echo Backend:     http://localhost:3000
echo Frontend:    http://localhost:8080
echo phpMyAdmin:  http://localhost/phpmyadmin
echo.
echo Presiona Ctrl+C para detener
echo.

start "Gymtec Backend MySQL" cmd /k "npm start"
start "Gymtec Frontend" cmd /k "cd ../frontend && python -m http.server 8080"

echo ✅ Servidores iniciados correctamente
pause 