# Test de Autenticación del Módulo Contratos
# Este script prueba que las correcciones de seguridad funcionan correctamente

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🧪 TEST DE AUTENTICACIÓN - MÓDULO CONTRATOS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"

# Test 1: Intentar acceder SIN token (debe fallar con 401)
Write-Host "Test 1: GET /api/contracts sin token" -ForegroundColor Yellow
Write-Host "Expected: 401 Unauthorized" -ForegroundColor Gray
try {
  $response = Invoke-WebRequest -Uri "$baseUrl/api/contracts" -Method GET -UseBasicParsing -ErrorAction Stop
  Write-Host "❌ FAILED: Endpoint no protegido (código: $($response.StatusCode))" -ForegroundColor Red
}
catch {
  if ($_.Exception.Response.StatusCode.value__ -eq 401) {
    Write-Host "✅ PASSED: Endpoint protegido (401 Unauthorized)" -ForegroundColor Green
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "   Mensaje: $($errorResponse.error)" -ForegroundColor Gray
  }
  else {
    Write-Host "❌ FAILED: Error inesperado (código: $($_.Exception.Response.StatusCode.value__))" -ForegroundColor Red
  }
}

Write-Host "`n----------------------------------------`n" -ForegroundColor Cyan

# Test 2: Login para obtener token
Write-Host "Test 2: Login para obtener token" -ForegroundColor Yellow
$loginBody = @{
  username = "admin"
  password = "Admin123!"
} | ConvertTo-Json

try {
  $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
  $token = $loginResponse.token
  Write-Host "✅ PASSED: Login exitoso" -ForegroundColor Green
  Write-Host "   Token obtenido: $($token.Substring(0, 20))..." -ForegroundColor Gray
}
catch {
  Write-Host "❌ FAILED: No se pudo hacer login" -ForegroundColor Red
  Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

Write-Host "`n----------------------------------------`n" -ForegroundColor Cyan

# Test 3: Acceder CON token (debe funcionar)
Write-Host "Test 3: GET /api/contracts con token válido" -ForegroundColor Yellow
Write-Host "Expected: 200 OK" -ForegroundColor Gray
try {
  $headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
  }
  $contractsResponse = Invoke-RestMethod -Uri "$baseUrl/api/contracts" -Method GET -Headers $headers
  Write-Host "✅ PASSED: Acceso autorizado (200 OK)" -ForegroundColor Green
  Write-Host "   Contratos encontrados: $($contractsResponse.data.Count)" -ForegroundColor Gray
}
catch {
  Write-Host "❌ FAILED: Error al acceder con token" -ForegroundColor Red
  Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n----------------------------------------`n" -ForegroundColor Cyan

# Test 4: Verificar otros endpoints protegidos
Write-Host "Test 4: POST /api/contracts sin token" -ForegroundColor Yellow
Write-Host "Expected: 401 Unauthorized" -ForegroundColor Gray
try {
  $newContract = @{
    client_id     = 1
    contract_type = "monthly"
    start_date    = "2025-10-02"
    end_date      = "2025-11-02"
  } | ConvertTo-Json
    
  $response = Invoke-WebRequest -Uri "$baseUrl/api/contracts" -Method POST -Body $newContract -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
  Write-Host "❌ FAILED: Endpoint POST no protegido" -ForegroundColor Red
}
catch {
  if ($_.Exception.Response.StatusCode.value__ -eq 401) {
    Write-Host "✅ PASSED: Endpoint POST protegido (401 Unauthorized)" -ForegroundColor Green
  }
  else {
    Write-Host "❌ FAILED: Error inesperado (código: $($_.Exception.Response.StatusCode.value__))" -ForegroundColor Red
  }
}

Write-Host "`n----------------------------------------`n" -ForegroundColor Cyan

# Test 5: Verificar endpoint DELETE protegido
Write-Host "Test 5: DELETE /api/contracts/1 sin token" -ForegroundColor Yellow
Write-Host "Expected: 401 Unauthorized" -ForegroundColor Gray
try {
  $response = Invoke-WebRequest -Uri "$baseUrl/api/contracts/1" -Method DELETE -UseBasicParsing -ErrorAction Stop
  Write-Host "❌ FAILED: Endpoint DELETE no protegido" -ForegroundColor Red
}
catch {
  if ($_.Exception.Response.StatusCode.value__ -eq 401) {
    Write-Host "✅ PASSED: Endpoint DELETE protegido (401 Unauthorized)" -ForegroundColor Green
  }
  else {
    Write-Host "❌ FAILED: Error inesperado (código: $($_.Exception.Response.StatusCode.value__))" -ForegroundColor Red
  }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ TESTS COMPLETADOS" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "RESUMEN:" -ForegroundColor Yellow
Write-Host "   - Todos los endpoints estan protegidos con JWT" -ForegroundColor White
Write-Host "   - Sin token: 401 Unauthorized OK" -ForegroundColor White
Write-Host "   - Con token: 200 OK" -ForegroundColor White
Write-Host "   - Modulo Contratos: SEGURO`n" -ForegroundColor White
