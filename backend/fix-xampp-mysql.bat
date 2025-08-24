@echo off
chcp 65001 >nul
echo ========================================
echo      REPARADOR XAMPP MYSQL
echo ========================================
echo.

REM Verificar si se ejecuta como administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ESTE SCRIPT DEBE EJECUTARSE COMO ADMINISTRADOR
    echo.
    echo 📌 Haz clic derecho en este archivo y selecciona:
    echo    "Ejecutar como administrador"
    echo.
    pause
    exit /b 1
)

echo [1/8] 🔍 Diagnosticando problema...

REM Buscar procesos MySQL
echo 🔎 Buscando procesos MySQL activos...
tasklist | findstr /i mysql
if %errorlevel% equ 0 (
    echo ⚠️  Procesos MySQL encontrados - los detendremos
) else (
    echo ✅ No hay procesos MySQL activos
)

REM Verificar puerto 3306
echo 🔎 Verificando puerto 3306...
netstat -ano | findstr :3306
if %errorlevel% equ 0 (
    echo ⚠️  Puerto 3306 ocupado
) else (
    echo ✅ Puerto 3306 libre
)

echo.
echo [2/8] 🛑 Deteniendo servicios MySQL...

REM Detener servicios MySQL si existen
for /f "tokens=2" %%i in ('sc query type^= service state^= all ^| findstr /i mysql') do (
    echo Deteniendo servicio: %%i
    sc stop %%i >nul 2>&1
)

REM Matar procesos MySQL forzadamente
taskkill /f /im mysqld.exe >nul 2>&1
taskkill /f /im mysql.exe >nul 2>&1

echo ✅ Servicios MySQL detenidos

echo.
echo [3/8] 🧹 Limpiando archivos temporales...

REM Buscar instalación de XAMPP
set XAMPP_PATH=
if exist "C:\xampp\" set XAMPP_PATH=C:\xampp
if exist "C:\XAMPP\" set XAMPP_PATH=C:\XAMPP
if exist "D:\xampp\" set XAMPP_PATH=D:\xampp
if exist "D:\XAMPP\" set XAMPP_PATH=D:\XAMPP

if "%XAMPP_PATH%"=="" (
    echo ❌ No se encontró instalación de XAMPP
    echo 📌 Por favor, indica la ruta de tu instalación XAMPP
    set /p XAMPP_PATH="Ruta completa a XAMPP (ej: C:\xampp): "
)

echo 📂 XAMPP encontrado en: %XAMPP_PATH%

REM Limpiar archivos .pid
if exist "%XAMPP_PATH%\mysql\data\mysql.pid" (
    del "%XAMPP_PATH%\mysql\data\mysql.pid" >nul 2>&1
    echo ✅ Eliminado mysql.pid
)

if exist "%XAMPP_PATH%\mysql\data\mysqld.pid" (
    del "%XAMPP_PATH%\mysql\data\mysqld.pid" >nul 2>&1
    echo ✅ Eliminado mysqld.pid
)

REM Limpiar archivos de log problemáticos
if exist "%XAMPP_PATH%\mysql\data\*.err" (
    del "%XAMPP_PATH%\mysql\data\*.err" >nul 2>&1
    echo ✅ Limpiados archivos .err
)

echo.
echo [4/8] 🔧 Verificando permisos...

REM Verificar permisos en carpeta data
icacls "%XAMPP_PATH%\mysql\data" | findstr /i "todos\|everyone\|users" >nul
if %errorlevel% neq 0 (
    echo ⚠️  Corrigiendo permisos en carpeta data...
    icacls "%XAMPP_PATH%\mysql\data" /grant Everyone:(OI)(CI)F >nul 2>&1
    echo ✅ Permisos corregidos
) else (
    echo ✅ Permisos correctos
)

echo.
echo [5/8] 📝 Verificando configuración MySQL...

set MY_INI="%XAMPP_PATH%\mysql\bin\my.ini"
if not exist %MY_INI% (
    echo ⚠️  Archivo my.ini no encontrado, creando configuración básica...
    
    echo [mysql] > %MY_INI%
    echo default-character-set=utf8 >> %MY_INI%
    echo. >> %MY_INI%
    echo [mysqld] >> %MY_INI%
    echo port=3306 >> %MY_INI%
    echo socket="%XAMPP_PATH%\mysql\mysql.sock" >> %MY_INI%
    echo basedir="%XAMPP_PATH%\mysql" >> %MY_INI%
    echo tmpdir="%XAMPP_PATH%\tmp" >> %MY_INI%
    echo datadir="%XAMPP_PATH%\mysql\data" >> %MY_INI%
    echo pid_file="%XAMPP_PATH%\mysql\data\mysql.pid" >> %MY_INI%
    echo skip-external-locking >> %MY_INI%
    echo default-table-type=myisam >> %MY_INI%
    echo thread_concurrency=10 >> %MY_INI%
    echo max_connections=100 >> %MY_INI%
    echo table_open_cache=64 >> %MY_INI%
    echo sort_buffer_size=512K >> %MY_INI%
    echo net_buffer_length=8K >> %MY_INI%
    echo read_buffer_size=256K >> %MY_INI%
    echo read_rnd_buffer_size=512K >> %MY_INI%
    echo myisam_sort_buffer_size=8M >> %MY_INI%
    echo log-error="%XAMPP_PATH%\mysql\data\mysql_error.log" >> %MY_INI%
    echo innodb_data_home_dir="%XAMPP_PATH%\mysql\data" >> %MY_INI%
    echo innodb_data_file_path=ibdata1:10M:autoextend >> %MY_INI%
    echo innodb_log_group_home_dir="%XAMPP_PATH%\mysql\data" >> %MY_INI%
    echo innodb_buffer_pool_size=16M >> %MY_INI%
    echo innodb_log_file_size=5M >> %MY_INI%
    echo innodb_log_buffer_size=8M >> %MY_INI%
    echo innodb_flush_log_at_trx_commit=1 >> %MY_INI%
    echo innodb_lock_wait_timeout=50 >> %MY_INI%
    
    echo ✅ Configuración my.ini creada
) else (
    echo ✅ Configuración my.ini existe
)

echo.
echo [6/8] 🗂️ Verificando integridad de datos...

if not exist "%XAMPP_PATH%\mysql\data\mysql" (
    echo ❌ Base de datos del sistema MySQL corrupta
    echo 📌 Será necesario reinstalar las tablas del sistema
    
    echo Inicializando base de datos MySQL...
    "%XAMPP_PATH%\mysql\bin\mysqld.exe" --initialize-insecure --basedir="%XAMPP_PATH%\mysql" --datadir="%XAMPP_PATH%\mysql\data" >nul 2>&1
    
    if %errorlevel% equ 0 (
        echo ✅ Base de datos del sistema recreada
    ) else (
        echo ⚠️  Problemas al recrear - continuando...
    )
) else (
    echo ✅ Base de datos del sistema existe
)

echo.
echo [7/8] 🚀 Intentando iniciar MySQL...

REM Intentar iniciar MySQL directamente
start /min "%XAMPP_PATH%\mysql\bin\mysqld.exe" --defaults-file="%XAMPP_PATH%\mysql\bin\my.ini" --standalone --console

echo Esperando 5 segundos para que MySQL inicie...
timeout /t 5 /nobreak >nul

REM Verificar si MySQL está corriendo
tasklist | findstr /i mysqld.exe >nul
if %errorlevel% equ 0 (
    echo ✅ MySQL iniciado correctamente
) else (
    echo ❌ MySQL no pudo iniciarse
    echo.
    echo 📋 SOLUCIONES ADICIONALES:
    echo 1. Revisar log de errores: %XAMPP_PATH%\mysql\data\mysql_error.log
    echo 2. Ejecutar XAMPP como administrador
    echo 3. Verificar que no hay antivirus bloqueando MySQL
    echo 4. Reinstalar XAMPP si el problema persiste
    echo.
)

echo.
echo [8/8] 🧪 Probando conexión...

REM Probar conexión con nuestro script
cd /d "%~dp0"
node test-mysql-connection.js

echo.
echo ========================================
echo        REPARACIÓN COMPLETADA
echo ========================================
echo.
echo 🔄 Ahora puedes:
echo    1. Abrir XAMPP Control Panel
echo    2. Iniciar MySQL desde allí
echo    3. Ejecutar: start-servers.bat
echo.
pause
