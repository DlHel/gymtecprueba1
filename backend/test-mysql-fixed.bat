@echo off
echo ========================================
echo      VERIFICANDO MYSQL REPARADO
echo ========================================
echo.

echo 🔍 Esperando 5 segundos para estabilización...
timeout /t 5 /nobreak >nul

echo 📡 Probando conexión...
cd "%~dp0"
node test-mysql-connection.js

if %errorlevel% equ 0 (
    echo.
    echo ✅ ¡MYSQL FUNCIONANDO CORRECTAMENTE!
    echo.
    echo 🚀 Ahora puedes ejecutar:
    echo    cd ..
    echo    start-servers.bat
    echo.
) else (
    echo.
    echo ❌ MySQL aún no funciona
    echo 📋 Verifica en XAMPP Control Panel que MySQL esté en verde
    echo.
)

pause
