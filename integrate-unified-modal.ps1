# Script de integración del Modal Unificado
Write-Host "🔧 Integrando Modal Unificado en ticket-detail.js..." -ForegroundColor Cyan

$ticketDetailPath = "frontend\js\ticket-detail.js"
$modalCodePath = "CODIGO_NUEVO_MODAL_UNIFICADO.js"

# 1. Leer archivos
Write-Host "📖 Leyendo archivos..." -ForegroundColor Yellow
$ticketDetailContent = Get-Content $ticketDetailPath -Raw -Encoding UTF8
$modalCode = Get-Content $modalCodePath -Raw -Encoding UTF8

# 2. Extraer solo el código (sin comentarios de header)
$modalCodeClean = ($modalCode -split "async function showUnifiedSparePartModal", 2)[1]
$modalCodeClean = "async function showUnifiedSparePartModal" + $modalCodeClean

# 3. Buscar línea de inserción (antes de "// GESTIÓN DE REPUESTOS MEJORADA")
$insertMarker = "// GESTIÓN DE REPUESTOS MEJORADA"
$insertPosition = $ticketDetailContent.IndexOf($insertMarker)

if ($insertPosition -eq -1) {
    Write-Host "❌ No se encontró el marcador de inserción" -ForegroundColor Red
    exit 1
}

# 4. Insertar código del modal
Write-Host "✏️ Insertando código del modal unificado..." -ForegroundColor Green
$beforeInsertion = $ticketDetailContent.Substring(0, $insertPosition)
$afterInsertion = $ticketDetailContent.Substring($insertPosition)

$newContent = $beforeInsertion + "`n// === MODAL UNIFICADO DE REPUESTOS (Sistema Inteligente) ===`n" + $modalCodeClean + "`n`n" + $afterInsertion

# 5. Guardar archivo modificado
Write-Host "💾 Guardando archivo modificado..." -ForegroundColor Yellow
$newContent | Out-File -FilePath $ticketDetailPath -Encoding UTF8 -NoNewline

# 6. Ahora corregir el bloque de event listeners
Write-Host "🔧 Corrigiendo event listeners..." -ForegroundColor Cyan

# Leer el archivo recién guardado
$ticketDetailContent = Get-Content $ticketDetailPath -Raw -Encoding UTF8

# Buscar y reemplazar el bloque problemático de event listeners
$oldEventListeners = @'
    // Delegación de eventos para botones de repuestos (se crean dinámicamente)
    document.addEventListener('click', (e) => {
        if (e.target.id === 'add-spare-part-btn' || e.target.closest('#add-spare-part-btn')) {
            e.preventDefault();
            console.log('🔧 Click en botón agregar repuesto');
            if (typeof showAddSparePartModal === 'function') {
                showAddSparePartModal();
            } else {
                console.error('❌ showAddSparePartModal no está definida');
            }
        }
        
        if (e.target.id === 'add-first-spare-part' || e.target.closest('#add-first-spare-part')) {
            e.preventDefault();
        if (e.target.id === 'request-spare-part-btn' || e.target.closest('#request-spare-part-btn')) {
            e.preventDefault();
'@

$newEventListeners = @'
    // Delegación de eventos para botones de repuestos (se crean dinámicamente)
    document.addEventListener('click', (e) => {
        // Botón "Solicitar Repuesto" - Modal Unificado con Flujo Inteligente
        if (e.target.id === 'request-spare-part-btn' || e.target.closest('#request-spare-part-btn')) {
            e.preventDefault();
            console.log('🔧 Click en botón solicitar repuesto (modal unificado)');
            if (typeof showUnifiedSparePartModal === 'function') {
                showUnifiedSparePartModal();
            } else {
                console.error('❌ showUnifiedSparePartModal no está definida');
            }
        }
        
        // Botón "Agregar Primer Repuesto" (cuando lista está vacía)
        if (e.target.id === 'add-first-spare-part' || e.target.closest('#add-first-spare-part')) {
            e.preventDefault();
            console.log('➕ Click en agregar primer repuesto');
            if (typeof showUnifiedSparePartModal === 'function') {
                showUnifiedSparePartModal();
'@

# Intentar reemplazar usando regex más flexible
$pattern = [regex]::Escape("// Delegación de eventos para botones de repuestos")
$ticketDetailContent = $ticketDetailContent -replace "$pattern.*?if \(e\.target\.id === 'request-spare-part-btn'.*?preventDefault\(\);", $newEventListeners, "Singleline"

# 7. Guardar versión final
Write-Host "💾 Guardando versión final..." -ForegroundColor Yellow
$ticketDetailContent | Out-File -FilePath $ticketDetailPath -Encoding UTF8 -NoNewline

Write-Host "`n✅ Integración completada!" -ForegroundColor Green
Write-Host "📋 Archivos modificados:" -ForegroundColor Cyan
Write-Host "  - frontend\js\ticket-detail.js" -ForegroundColor White
Write-Host "`n🔄 Recarga la página para probar el nuevo modal unificado" -ForegroundColor Yellow
