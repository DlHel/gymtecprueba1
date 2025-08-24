@echo off
chcp 65001 >nul
echo ========================================
echo    DIAGNÓSTICO XAMPP MYSQL
echo ========================================
echo.

set XAMPP_PATH=C:\xampp

echo [1/4] 🔍 Verificando estado actual...

REM Verificar procesos MySQL
echo 🔎 Procesos MySQL:
tasklist | findstr /i mysql
if %errorlevel% neq 0 echo   ✅ No hay procesos MySQL activos

REM Verificar puerto 3306
echo.
echo 🔎 Puerto 3306:
netstat -ano | findstr :3306
if %errorlevel% neq 0 echo   ✅ Puerto 3306 libre

echo.
echo [2/4] 📂 Verificando archivos XAMPP...

if exist "%XAMPP_PATH%\mysql\bin\mysqld.exe" (
    echo ✅ MySQL ejecutable encontrado
) else (
    echo ❌ MySQL ejecutable NO encontrado en %XAMPP_PATH%\mysql\bin\
)

if exist "%XAMPP_PATH%\mysql\data\" (
    echo ✅ Directorio de datos existe
) else (
    echo ❌ Directorio de datos NO existe
)

if exist "%XAMPP_PATH%\mysql\bin\my.ini" (
    echo ✅ Archivo de configuración my.ini existe
) else (
    echo ⚠️  Archivo my.ini NO encontrado
)

echo.
echo [3/4] 🗂️ Verificando archivos problemáticos...

if exist "%XAMPP_PATH%\mysql\data\mysql.pid" (
    echo ⚠️  Archivo mysql.pid existe (puede causar problemas)
    echo    Ubicación: %XAMPP_PATH%\mysql\data\mysql.pid
) else (
    echo ✅ No hay archivo mysql.pid problemático
)

if exist "%XAMPP_PATH%\mysql\data\mysqld.pid" (
    echo ⚠️  Archivo mysqld.pid existe (puede causar problemas)
    echo    Ubicación: %XAMPP_PATH%\mysql\data\mysqld.pid
) else (
    echo ✅ No hay archivo mysqld.pid problemático
)

echo.
echo [4/4] 📋 Recomendaciones...

echo ========================================
echo        PASOS PARA SOLUCIONAR
echo ========================================
echo.
echo 🔧 OPCIÓN 1 - Reparación Manual:
echo    1. Abre PowerShell como ADMINISTRADOR
echo    2. Ejecuta: cd "%~dp0"
echo    3. Ejecuta: .\fix-xampp-mysql.bat
echo.
echo 🔧 OPCIÓN 2 - Pasos Manuales:
echo    1. Eliminar archivos .pid:
echo       del "%XAMPP_PATH%\mysql\data\*.pid"
echo    2. Abrir XAMPP Control Panel como ADMINISTRADOR
echo    3. Hacer clic en "Start" junto a MySQL
echo.
echo 🔧 OPCIÓN 3 - Reinicio de XAMPP:
echo    1. Cerrar XAMPP Control Panel completamente
echo    2. Abrir XAMPP como ADMINISTRADOR
echo    3. Intentar iniciar MySQL nuevamente
echo.
echo 📋 Si persiste el problema:
echo    - Revisar logs: %XAMPP_PATH%\mysql\data\mysql_error.log
echo    - Revisar Windows Event Viewer
echo    - Considerar reinstalar XAMPP
echo.
pause
