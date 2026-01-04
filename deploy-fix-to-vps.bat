@echo off
REM Script para enviar y ejecutar correcciones en el VPS

echo ================================================
echo Enviando scripts de corrección al VPS
echo ================================================
echo.

set VPS_HOST=root@91.107.237.159
set VPS_PASS=gscnxhmEAEWU

echo [1/3] Copiando scripts al VPS...
scp master-fix-vps.sh %VPS_HOST%:/root/
scp fix-tables-vps.sh %VPS_HOST%:/root/
scp create-missing-tables-vps.sql %VPS_HOST%:/root/

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: No se pudieron copiar los archivos
    pause
    exit /b 1
)

echo.
echo [2/3] Dando permisos de ejecución...
ssh %VPS_HOST% "chmod +x /root/master-fix-vps.sh /root/fix-tables-vps.sh"

echo.
echo [3/3] Ejecutando script maestro...
echo ================================================
echo IMPORTANTE: Revisa la salida del script
echo ================================================
echo.

ssh -t %VPS_HOST% "cd /root && bash master-fix-vps.sh"

echo.
echo ================================================
echo Script completado
echo ================================================
echo.
echo Siguiente paso: Abre http://91.107.237.159 en el navegador
echo Usuario: admin / Password: admin123
echo.
pause
