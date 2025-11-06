# Script para integrar los nuevos endpoints del dashboard en server-clean.js
Write-Host "🚀 Integrando nuevos endpoints del dashboard..." -ForegroundColor Cyan

$serverFile = "src/server-clean.js"
$endpointsFile = "src/dashboard-endpoints-new.js"

# Leer archivos
$serverContent = Get-Content $serverFile -Raw
$endpointsContent = Get-Content $endpointsFile -Raw

# Eliminar las primeras 4 líneas de comentarios del archivo de endpoints
$endpointsLines = $endpointsContent -split "`n"
$endpointsToInsert = ($endpointsLines | Select-Object -Skip 4) -join "`n"

# Buscar el marcador donde insertar
$marker = "// ===================================================================`n// MANEJADORES GLOBALES DE ERRORES Y FINALIZACIÃ"N`n// ==================================================================="

# Insertar los endpoints ANTES del marcador
$newContent = $serverContent -replace [regex]::Escape($marker), "$endpointsToInsert`n`n$marker"

# Guardar el archivo modificado
$newContent | Set-Content $serverFile -NoNewline

Write-Host "✅ Endpoints integrados exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Endpoints agregados:" -ForegroundColor Yellow
Write-Host "  1. GET /api/dashboard/resources-summary"
Write-Host "  2. GET /api/dashboard/financial-summary"
Write-Host "  3. GET /api/dashboard/inventory-summary"
Write-Host "  4. GET /api/dashboard/contracts-sla-summary"
Write-Host "  5. GET /api/dashboard/critical-alerts"
Write-Host "  6. GET /api/dashboard/kpis-enhanced"
Write-Host ""
Write-Host "🔄 Ahora reinicia el servidor backend: npm start" -ForegroundColor Cyan
