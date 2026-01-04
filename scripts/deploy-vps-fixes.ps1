# Script PowerShell para aplicar fixes al VPS desde Windows
# Requiere: plink.exe y pscp.exe (PuTTY tools)

$VPS_IP = "91.107.237.159"
$VPS_USER = "root"
$VPS_PASSWORD = "gscnxhmEAEWU"
$PROJECT_PATH = "/var/www/gymtec"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "🚀 APLICANDO CORRECCIONES AL SERVIDOR VPS - GYMTEC ERP" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "backend\src\server-clean.js")) {
    Write-Host "❌ Error: No se encuentra backend\src\server-clean.js" -ForegroundColor Red
    Write-Host "   Asegúrate de ejecutar este script desde la raíz del proyecto" -ForegroundColor Yellow
    exit 1
}

Write-Host "📁 Archivo a subir: backend\src\server-clean.js" -ForegroundColor Green
$fileSize = (Get-Item "backend\src\server-clean.js").Length / 1KB
Write-Host "   Tamaño: $([math]::Round($fileSize, 2)) KB" -ForegroundColor Gray
Write-Host ""

# Opción 1: Usando scp (si está disponible en Windows 10+)
Write-Host "📤 Subiendo archivo corregido al VPS..." -ForegroundColor Yellow

try {
    # Intentar con scp nativo de Windows 10+
    $env:TERM = "dumb"
    echo $VPS_PASSWORD | scp -o StrictHostKeyChecking=no backend\src\server-clean.js "${VPS_USER}@${VPS_IP}:${PROJECT_PATH}/backend/src/" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Archivo subido exitosamente" -ForegroundColor Green
    } else {
        throw "SCP failed"
    }
} catch {
    Write-Host "⚠️  Error con scp, intenta manualmente:" -ForegroundColor Yellow
    Write-Host "   scp backend\src\server-clean.js root@91.107.237.159:/var/www/gymtec/backend/src/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "❓ ¿El archivo se subió correctamente? (s/n): " -NoNewline -ForegroundColor Yellow
    $respuesta = Read-Host
    if ($respuesta -ne 's') {
        Write-Host "❌ Abortando proceso" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🔧 Comandos a ejecutar en el VPS:" -ForegroundColor Yellow
Write-Host @"
cd /var/www/gymtec/backend/src
cp server-clean.js server-clean.js.backup.\$(date +%Y%m%d_%H%M%S)
cd /var/www/gymtec/backend
pkill -f 'node.*server-clean.js' || true
sleep 2
nohup npm start > /var/www/gymtec/logs/backend.log 2>&1 &
pgrep -f 'node.*server-clean.js'
"@ -ForegroundColor Cyan

Write-Host ""
Write-Host "📋 Ejecuta estos comandos manualmente vía SSH:" -ForegroundColor Yellow
Write-Host "   ssh root@91.107.237.159" -ForegroundColor Cyan
Write-Host ""

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "📊 RESUMEN DE CORRECCIONES APLICADAS" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$fixes = @(
    @{Endpoint="/api/equipment/:id/tickets"; Fix="Retorna {message, data, count}"},
    @{Endpoint="/api/equipment/:id/photos"; Fix="Retorna {message, data, count}"},
    @{Endpoint="/api/equipment/:id/notes"; Fix="Retorna {message, data, count}"},
    @{Endpoint="/api/locations/:id/equipment"; Fix="Query simplificada sin contract_equipment"},
    @{Endpoint="/api/dashboard/activity"; Fix="Query simplificada sin CONCAT/DATE_SUB"}
)

$i = 1
foreach ($fix in $fixes) {
    Write-Host "${i}. $($fix.Endpoint)" -ForegroundColor Yellow
    Write-Host "   ✓ $($fix.Fix)" -ForegroundColor Green
    $i++
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "📝 PRÓXIMOS PASOS" -ForegroundColor Magenta
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Conectarse al VPS y reiniciar el backend:" -ForegroundColor White
Write-Host "   ssh root@91.107.237.159" -ForegroundColor Cyan
Write-Host "   cd /var/www/gymtec/backend && npm start" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Verificar que funciona:" -ForegroundColor White
Write-Host "   http://91.107.237.159 en el navegador" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Revisar logs si hay problemas:" -ForegroundColor White
Write-Host "   tail -f /var/www/gymtec/logs/backend.log" -ForegroundColor Cyan
Write-Host ""

# Crear script de conexión rápida
$connectScript = @"
@echo off
echo Conectando al VPS...
ssh root@91.107.237.159
"@

Set-Content -Path "conectar-vps.bat" -Value $connectScript -Force
Write-Host "✅ Script de conexión creado: conectar-vps.bat" -ForegroundColor Green
Write-Host ""
