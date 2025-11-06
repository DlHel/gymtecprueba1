# ⚡ APLICAR ÍNDICES DE OPTIMIZACIÓN
# Script PowerShell para aplicar índices de MySQL de manera segura

Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     APLICACIÓN DE ÍNDICES - GYMTEC ERP                   ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Configuración
$mysqlPath = "C:\xampp\mysql\bin\mysql.exe"
$sqlFile = "backend\database\optimize-indexes.sql"
$dbName = "gymtec_erp"

# Verificar archivos
if (-not (Test-Path $mysqlPath)) {
    Write-Host "❌ Error: MySQL no encontrado en $mysqlPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ Error: Archivo SQL no encontrado: $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Archivo SQL: $sqlFile" -ForegroundColor Gray
Write-Host "🗄️  Base de datos: $dbName" -ForegroundColor Gray
Write-Host ""

# Leer credenciales de config.env
$configPath = "backend\config.env"
if (Test-Path $configPath) {
    Write-Host "🔐 Leyendo credenciales de config.env..." -ForegroundColor Yellow
    $config = Get-Content $configPath | ConvertFrom-StringData
    $dbUser = $config.DB_USER
    $dbPassword = $config.DB_PASSWORD
    Write-Host "✅ Usuario: $dbUser" -ForegroundColor Green
} else {
    Write-Host "⚠️  config.env no encontrado, usando valores por defecto" -ForegroundColor Yellow
    $dbUser = "root"
    $dbPassword = ""
}

Write-Host ""
Write-Host "⚙️  Aplicando índices de optimización..." -ForegroundColor Yellow
Write-Host ""

# Construir comando MySQL
$mysqlArgs = @(
    "-u", $dbUser,
    $dbName
)

if ($dbPassword) {
    $mysqlArgs = @("-u", $dbUser, "-p$dbPassword", $dbName)
}

# Ejecutar SQL
try {
    $output = Get-Content $sqlFile | & $mysqlPath @mysqlArgs 2>&1
    $errors = 0
    $duplicates = 0
    $success = 0
    
    foreach ($line in $output) {
        if ($line -match "Duplicate key name") {
            $duplicates++
            Write-Host "⏭️  Índice ya existe (omitido)" -ForegroundColor Gray
        } elseif ($line -match "ERROR 1061") {
            # Error de índice duplicado - es esperado, omitir
            continue
        } elseif ($line -match "error|ERROR") {
            $errors++
            Write-Host "❌ $line" -ForegroundColor Red
        } elseif ($line -match "warning|WARNING") {
            Write-Host "⚠️  $line" -ForegroundColor Yellow
        } elseif ($line -match "optimización completada") {
            Write-Host "✅ $line" -ForegroundColor Green
            $success++
        } elseif ($line.Trim() -ne "") {
            Write-Host "  $line" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║           RESUMEN                        ║" -ForegroundColor Cyan
    Write-Host "╠═══════════════════════════════════════════╣" -ForegroundColor Cyan
    Write-Host "║  Índices duplicados: $($duplicates.ToString().PadLeft(3))              ║" -ForegroundColor Gray
    Write-Host "║  Errores críticos:   $($errors.ToString().PadLeft(3))              ║" $(if($errors -gt 0){'Red'}else{'Green'})
    Write-Host "╚═══════════════════════════════════════════╝" -ForegroundColor Cyan
    
    if ($errors -eq 0 -or $duplicates -gt 0) {
        Write-Host "`n✅ Proceso completado exitosamente" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️  Proceso completado con advertencias" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "📊 Para verificar índices creados:" -ForegroundColor Cyan
    Write-Host "   cd backend\database" -ForegroundColor Gray
    Write-Host "   node analyze-performance.js" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host "`n❌ Error al aplicar índices: $_" -ForegroundColor Red
    exit 1
}
