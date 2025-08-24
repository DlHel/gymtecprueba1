@echo off
echo ========================================
echo      SOLUCION TEMPORAL MYSQL XAMPP
echo ========================================
echo.

echo [1/6] Deteniendo procesos MySQL existentes...
taskkill /F /IM mysqld.exe 2>nul
timeout /t 2 >nul

echo [2/6] Verificando que el puerto 3306 este libre...
netstat -ano | findstr :3306
if %ERRORLEVEL% EQU 0 (
    echo ⚠️  Puerto 3306 aun en uso, esperando...
    timeout /t 3 >nul
)

echo [3/6] Reiniciando servicio MySQL de XAMPP...
echo 💡 INSTRUCCIONES MANUALES:
echo    1. Abre XAMPP Control Panel COMO ADMINISTRADOR
echo    2. PARA MySQL (boton Stop)
echo    3. Espera 5 segundos
echo    4. INICIA MySQL (boton Start)
echo    5. Verifica que aparezca "Running" en verde
echo.
pause

echo [4/6] Esperando que MySQL este completamente iniciado...
timeout /t 5 >nul

echo [5/6] Verificando conectividad...
powershell -Command "try { $socket = New-Object System.Net.Sockets.TcpClient; $socket.Connect('127.0.0.1', 3306); $socket.Close(); Write-Host '✅ Puerto 3306 accesible' } catch { Write-Host '❌ Puerto 3306 no accesible' }"

echo [6/6] Probando conexion Node.js...
node test-mysql-simple.js

echo.
echo ========================================
echo Si el problema persiste:
echo 1. Reinicia completamente XAMPP
echo 2. Reinicia tu PC
echo 3. Verifica Windows Firewall
echo 4. Usa phpMyAdmin para verificar MySQL
echo ========================================
pause
