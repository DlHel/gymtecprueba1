@echo off
echo ===========================================
echo    PROBANDO ENDPOINTS DE TICKETS API
echo ===========================================
echo.

echo 1. Probando GET /api/tickets:
echo ===========================================
curl -s -X GET "http://localhost:3000/api/tickets" -H "Content-Type: application/json"
echo.
echo.

echo 2. Probando POST /api/tickets (crear ticket):
echo ===========================================
curl -s -X POST "http://localhost:3000/api/tickets" ^
  -H "Content-Type: application/json" ^
  -d "{\"title\":\"Ticket de Prueba API\",\"description\":\"Ticket creado para probar la API\",\"priority\":\"Media\",\"equipment_id\":1,\"location_id\":1,\"client_id\":1,\"assigned_to\":1}"
echo.
echo.

echo 3. Verificando lista actualizada:
echo ===========================================
curl -s -X GET "http://localhost:3000/api/tickets" -H "Content-Type: application/json"
echo.

echo.
echo ========================================= 
echo           PRUEBA COMPLETADA
echo =========================================