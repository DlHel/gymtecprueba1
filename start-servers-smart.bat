@echo off
title Gymtec ERP - Servers
color 0A

echo ========================================
echo           GYMTEC ERP SERVERS           
echo ========================================
echo.

echo [1/5] Verificando configuracion del backend...
if not exist "backend\src\server.js" (
    echo ❌ No se encontro server.js
    echo 💡 Asegurate de estar en la carpeta correcta del proyecto
    pause
    exit /b 1
)

echo [2/5] Verificando conexion a MySQL...
cd backend
node test-mysql-simple.js >mysql-test.log 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ MySQL disponible - usando servidor completo
    set SERVER_MODE=mysql
) else (
    echo ⚠️  MySQL no disponible - usando modo emergencia
    set SERVER_MODE=emergency
    type mysql-test.log
    echo.
    echo 💡 Se iniciará servidor con datos mock para testing
)

echo [3/5] Iniciando backend en puerto 3000...
if "%SERVER_MODE%"=="mysql" (
    echo 🚀 Iniciando servidor con MySQL...
    start "Backend MySQL" cmd /k "echo ✅ Backend MySQL en puerto 3000 && node src/server.js"
) else (
    echo 🆘 Iniciando servidor de emergencia...
    start "Backend Emergency" cmd /k "echo ⚠️  Backend Emergency en puerto 3000 && node server-emergency.js"
)

timeout /t 3 >nul

echo [4/5] Iniciando frontend en puerto 8080...
cd ..\frontend
start "Frontend" cmd /k "echo ✅ Frontend en puerto 8080 && python -m http.server 8080"

timeout /t 2 >nul

echo [5/5] Verificando que los servidores esten corriendo...
timeout /t 3 >nul

echo.
echo ========================================
echo           SERVIDORES INICIADOS                
echo ========================================
if "%SERVER_MODE%"=="mysql" (
    echo ✅ Backend MySQL:     http://localhost:3000
    echo ✅ Estado:            Completamente funcional
) else (
    echo ⚠️  Backend Emergency: http://localhost:3000
    echo ⚠️  Estado:            Solo datos de prueba
    echo.
    echo 🔧 Para arreglar MySQL:
    echo    1. Abre XAMPP Control Panel como administrador
    echo    2. Para y reinicia MySQL
    echo    3. Ejecuta: backend\fix-mysql-xampp.bat
    echo    4. Reinicia este script
)
echo ✅ Frontend:           http://localhost:8080
echo.
echo 🌐 Aplicacion principal: http://localhost:8080/clientes.html
echo 🧪 Test de login:       http://localhost:8080/test-login-simple.html
echo ========================================

pause
