# 🎭 Test E2E con Playwright + MCP
# Este script demuestra el uso de MCP para automatizar testing E2E

Write-Host "🚀 Iniciando Demo de Playwright + MCP Testing..." -ForegroundColor Green

# Verificar que los servidores estén corriendo
Write-Host "📡 Verificando estado de servidores..." -ForegroundColor Yellow

# Verificar backend
try {
  $backendStatus = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 5
  Write-Host "✅ Backend: Activo (Puerto 3000)" -ForegroundColor Green
}
catch {
  Write-Host "⚠️  Backend: No disponible - Iniciando..." -ForegroundColor Red
  Start-Process powershell -ArgumentList "-Command", "cd ../backend; npm start" -WindowStyle Minimized
  Start-Sleep 5
}

# Verificar frontend
try {
  $frontendStatus = Invoke-WebRequest -Uri "http://localhost:8080" -UseBasicParsing -TimeoutSec 5
  Write-Host "✅ Frontend: Activo (Puerto 8080)" -ForegroundColor Green
}
catch {
  Write-Host "⚠️  Frontend: No disponible - Iniciando..." -ForegroundColor Red
  Start-Process powershell -ArgumentList "-Command", "cd ../frontend; python -m http.server 8080" -WindowStyle Minimized
  Start-Sleep 3
}

Write-Host ""
Write-Host "🎭 PLAYWRIGHT + MCP TESTING SUITE" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Opciones de testing
Write-Host "Seleccione el tipo de test a ejecutar:" -ForegroundColor White
Write-Host "1. 🚀 Tests de Smoke (Rápidos)" -ForegroundColor Yellow
Write-Host "2. 🔐 Tests de Autenticación" -ForegroundColor Yellow  
Write-Host "3. 🎫 Tests de Tickets" -ForegroundColor Yellow
Write-Host "4. 🏋️  Tests de Equipos" -ForegroundColor Yellow
Write-Host "5. 📊 Suite Completa E2E" -ForegroundColor Yellow
Write-Host "6. 🎮 Modo Interactivo (Headed)" -ForegroundColor Yellow
Write-Host "7. 🐛 Modo Debug" -ForegroundColor Yellow
Write-Host "8. 🔍 Monitoreo de Errores Frontend" -ForegroundColor Cyan
Write-Host "9. ⚡ Monitoreo de Performance" -ForegroundColor Cyan
Write-Host "10. 🚨 Detección de Errores Críticos" -ForegroundColor Red
Write-Host ""

$choice = Read-Host "Ingrese su opción (1-10)"

switch ($choice) {
  "1" {
    Write-Host "🚀 Ejecutando tests de smoke..." -ForegroundColor Green
    npx playwright test --grep "@smoke"
  }
  "2" {
    Write-Host "🔐 Ejecutando tests de autenticación..." -ForegroundColor Green
    npx playwright test tests/auth.spec.js
  }
  "3" {
    Write-Host "🎫 Ejecutando tests de tickets..." -ForegroundColor Green
    npx playwright test tests/tickets.spec.js
  }
  "4" {
    Write-Host "🏋️ Ejecutando tests de equipos..." -ForegroundColor Green
    npx playwright test tests/equipment.spec.js
  }
  "5" {
    Write-Host "📊 Ejecutando suite completa..." -ForegroundColor Green
    npx playwright test
  }
  "6" {
    Write-Host "🎮 Modo interactivo (con ventana del navegador)..." -ForegroundColor Green
    npx playwright test --headed
  }
  "7" {
    Write-Host "🐛 Modo debug..." -ForegroundColor Green
    npx playwright test --debug
  }
  "8" {
    Write-Host "🔍 Ejecutando monitoreo completo de errores frontend..." -ForegroundColor Cyan
    npx playwright test tests/frontend-monitoring.spec.js
  }
  "9" {
    Write-Host "⚡ Ejecutando monitoreo de performance..." -ForegroundColor Cyan
    npx playwright test tests/frontend-monitoring.spec.js --grep "@performance"
  }
  "10" {
    Write-Host "🚨 Detectando errores críticos..." -ForegroundColor Red
    npx playwright test tests/frontend-monitoring.spec.js --grep "should detect and report all frontend issues"
  }
  default {
    Write-Host "❌ Opción inválida. Ejecutando tests de smoke por defecto..." -ForegroundColor Red
    npx playwright test --grep "@smoke"
  }
}

Write-Host ""
Write-Host "📊 REPORTE DE RESULTADOS" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

# Mostrar reporte si existe
if (Test-Path "reports/html-report/index.html") {
  Write-Host "✅ Reporte HTML disponible en: reports/html-report/index.html" -ForegroundColor Green
  $openReport = Read-Host "¿Abrir reporte en navegador? (y/n)"
  if ($openReport -eq "y") {
    Start-Process "reports/html-report/index.html"
  }
}

Write-Host ""
Write-Host "🎉 Demo de testing E2E completado!" -ForegroundColor Green
Write-Host "💡 Próximos pasos:" -ForegroundColor Yellow
Write-Host "   - Revisar resultados en reports/" -ForegroundColor White
Write-Host "   - Analizar screenshots de fallos" -ForegroundColor White
Write-Host "   - Integrar en CI/CD pipeline" -ForegroundColor White
