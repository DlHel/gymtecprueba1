@echo off
echo ========================================
echo    GYMTEC ERP - Iniciando Servidores  
echo         Version 3.0 - Fase 3 Completada
echo ========================================
echo.

echo [INFO] Verificando dependencias del sistema...
echo.

echo [1/5] Verificando Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Error: Node.js no esta instalado
    echo    Por favor instala Node.js desde https://nodejs.org
    pause
    exit /b 1
)
echo ✅ Node.js detectado

echo [2/5] Verificando configuracion del backend...
if not exist "backend\config.env" (
    echo ❌ Error: No se encuentra backend\config.env
    echo    Por favor copia backend\config.env.example a backend\config.env
    echo    y configura los parametros de MySQL
    pause
    exit /b 1
)
echo ✅ Configuracion encontrada

echo [3/5] Verificando dependencias npm...
cd backend
if not exist "node_modules\" (
    echo [INFO] Instalando dependencias npm...
    npm install
    if %ERRORLEVEL% neq 0 (
        echo ❌ Error instalando dependencias
        pause
        exit /b 1
    )
)
echo ✅ Dependencias npm verificadas

echo [4/5] Verificando servidor disponible...
if exist "src\server-modular.js" (
    echo ✅ Usando servidor optimizado: server-modular.js
    set SERVER_FILE=src/server-modular.js
) else (
    echo ⚠️  Usando servidor principal: server.js
    set SERVER_FILE=src/server.js
)
cd ..

echo [5/5] Iniciando Backend (Node.js)...
start "Gymtec Backend" cmd /k "cd backend && echo Iniciando servidor GYMTEC ERP... && echo Backend: http://localhost:3000 && echo Frontend: http://localhost:8080 && echo. && node %SERVER_FILE%"

echo [6/6] Esperando que el backend inicie y luego iniciando Frontend...
timeout /t 5 /nobreak >nul

echo [INFO] Verificando Python para frontend...
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ⚠️  Python no detectado, intentando iniciar frontend con servidor alternativo...
    start "Gymtec Frontend" cmd /k "cd frontend && echo Frontend estatico iniciado en puerto 8080 && echo Abre http://localhost:8080 en tu navegador && pause"
) else (
    echo ✅ Python detectado, iniciando servidor HTTP...
    start "Gymtec Frontend" cmd /k "cd frontend && echo Iniciando servidor frontend con Python... && echo Frontend: http://localhost:8080 && python -m http.server 8080"
)

echo.
echo ========================================
echo   Servidores GYMTEC iniciados
echo ========================================
echo.
echo 🚀 Backend API:     http://localhost:3000
echo 🌐 Frontend:        http://localhost:8080
echo 👥 Clientes:        http://localhost:8080/clientes.html
echo 🎫 Tickets:         http://localhost:8080/tickets.html
echo 📦 Inventario:      http://localhost:8080/inventario-fase3.html
echo 🔧 Equipos:         http://localhost:8080/equipo.html
echo.
echo [CARACTERISTICAS DISPONIBLES]
echo ✅ Fase 1: Contratos y SLA
echo ✅ Fase 2: Notificaciones Inteligentes  
echo ✅ Fase 3: Inventario Inteligente y Reportes
echo.
echo 💡 Si tienes problemas:
echo    1. Verifica que el backend este corriendo en http://localhost:3000
echo    2. Asegurate que MySQL este corriendo (XAMPP o servicio MySQL)
echo.
echo Presiona cualquier tecla para continuar...
pause >nul 