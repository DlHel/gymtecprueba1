@echo off
echo ============================================
echo  DEPLOY A VPS HETZNER - Gymtec ERP
echo ============================================
echo.

set VPS_HOST=91.107.237.159
set VPS_USER=root
set VPS_PATH=/root/gymtec-erp
set LOCAL_BACKEND=backend\src\server-clean.js

echo [1/4] Conectando al VPS...
echo.

REM Subir archivo server-clean.js
echo [2/4] Subiendo server-clean.js...
scp %LOCAL_BACKEND% %VPS_USER%@%VPS_HOST%:%VPS_PATH%/backend/src/
if %errorlevel% neq 0 (
    echo ❌ Error subiendo archivo
    pause
    exit /b 1
)

echo [3/4] Reiniciando backend...
ssh %VPS_USER%@%VPS_HOST% "cd %VPS_PATH% && pm2 restart backend"
if %errorlevel% neq 0 (
    echo ❌ Error reiniciando backend
    pause
    exit /b 1
)

echo [4/4] Verificando estado...
ssh %VPS_USER%@%VPS_HOST% "pm2 list"

echo.
echo ✅ Deployment completado!
echo.
pause
