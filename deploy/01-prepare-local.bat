@echo off
echo ========================================
echo GYMTEC ERP - Preparacion Local para Deploy
echo ========================================
echo.

REM Crear carpeta de deploy si no existe
if not exist "deploy" mkdir deploy

echo [1/6] Limpiando node_modules...
if exist "node_modules" rd /s /q "node_modules"
if exist "backend\node_modules" rd /s /q "backend\node_modules"

echo [2/6] Creando archivo .gitignore para deploy...
(
echo node_modules/
echo .env
echo config.env
echo logs/
echo *.log
echo .DS_Store
echo uploads/*
echo !uploads/.gitkeep
) > .gitignore

echo [3/6] Creando archivo de configuracion de produccion...
(
echo # Configuracion de Produccion - VPS Hetzner
echo DB_HOST=localhost
echo DB_PORT=3306
echo DB_USER=gymtec_user
echo DB_PASSWORD=CAMBIAR_PASSWORD_AQUI
echo DB_NAME=gymtec_erp
echo.
echo PORT=3000
echo NODE_ENV=production
echo.
echo JWT_SECRET=CAMBIAR_SECRET_AQUI_GENERAR_RANDOM
echo JWT_EXPIRES_IN=10h
echo SESSION_SECRET=CAMBIAR_SESSION_SECRET_AQUI
echo.
echo UPLOAD_DIR=../uploads
echo MAX_FILE_SIZE=5242880
echo.
echo SMTP_HOST=smtp.gmail.com
echo SMTP_PORT=587
echo SMTP_USER=tu_correo@gmail.com
echo SMTP_PASS=tu_password_app
echo SMTP_SECURE=false
echo SMTP_FROM="GymTec ERP" ^<noreply@gymtecerp.com^>
) > backend\config.env.production

echo [4/6] Verificando archivos criticos...
if not exist "backend\src\server-clean.js" (
    echo ERROR: No se encuentra server-clean.js
    pause
    exit /b 1
)
if not exist "backend\database\mysql-schema.sql" (
    echo ERROR: No se encuentra mysql-schema.sql
    pause
    exit /b 1
)
if not exist "backend\package.json" (
    echo ERROR: No se encuentra package.json del backend
    pause
    exit /b 1
)

echo [5/6] Creando lista de archivos a subir...
(
echo backend/
echo frontend/
echo nginx/
echo uploads/.gitkeep
echo README.md
echo .gitignore
) > deploy\files-to-upload.txt

echo [6/6] Creando archivo .gitkeep para uploads...
if not exist "uploads" mkdir uploads
type nul > uploads\.gitkeep

echo.
echo ========================================
echo PREPARACION COMPLETADA
echo ========================================
echo.
echo Proximos pasos:
echo 1. Editar backend\config.env.production con datos reales
echo 2. Ejecutar: git add .
echo 3. Ejecutar: git commit -m "Preparar para deploy"
echo 4. Conectar al VPS y ejecutar scripts de instalacion
echo.
pause
