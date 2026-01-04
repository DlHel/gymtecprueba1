#!/bin/bash
# ============================================================================
# PLAN DE PRUEBAS COMPLETO - GYMTEC ERP
# ============================================================================
# Servidor: http://91.107.237.159
# Usuario: admin / Admin123
# Fecha: 2025-12-28
# ============================================================================

echo "🚀 INICIANDO PRUEBAS COMPLETAS DEL SISTEMA GYMTEC ERP"
echo "======================================================"
echo ""

# Obtener token de autenticación
echo "🔐 Obteniendo token de autenticación..."
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123"}' | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")

if [ -z "$TOKEN" ]; then
    echo "❌ Error: No se pudo obtener token de autenticación"
    exit 1
fi

echo "✅ Token obtenido correctamente"
echo ""

# ============================================================================
# MÓDULO 1: CLIENTES
# ============================================================================
echo "📋 MÓDULO 1: CLIENTES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "  1.1 GET /api/clients - Listar todos los clientes"
RESULT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/clients)
HTTP_CODE=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | head -n -1)
if [ "$HTTP_CODE" = "200" ]; then
    COUNT=$(echo "$BODY" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('data', [])))")
    echo "      ✅ OK - $COUNT clientes encontrados"
else
    echo "      ❌ FALLO - HTTP $HTTP_CODE"
fi

echo "  1.2 GET /api/clients/1 - Cliente individual"
RESULT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/clients/1)
HTTP_CODE=$(echo "$RESULT" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "      ✅ OK"
else
    echo "      ❌ FALLO - HTTP $HTTP_CODE"
fi

echo "  1.3 GET /api/clients/1/locations - Ubicaciones de cliente"
RESULT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/clients/1/locations)
HTTP_CODE=$(echo "$RESULT" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "      ✅ OK"
else
    echo "      ❌ FALLO - HTTP $HTTP_CODE"
fi

echo ""

# ============================================================================
# MÓDULO 2: UBICACIONES (SEDES)
# ============================================================================
echo "📍 MÓDULO 2: UBICACIONES (SEDES)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "  2.1 GET /api/locations - Listar todas las ubicaciones"
RESULT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/locations)
HTTP_CODE=$(echo "$RESULT" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "      ✅ OK"
else
    echo "      ❌ FALLO - HTTP $HTTP_CODE"
fi

echo "  2.2 GET /api/locations/5/equipment - Equipos por ubicación"
RESULT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/locations/5/equipment)
HTTP_CODE=$(echo "$RESULT" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "      ✅ OK"
else
    echo "      ❌ FALLO - HTTP $HTTP_CODE"
fi

echo ""

# ============================================================================
# MÓDULO 3: EQUIPOS
# ============================================================================
echo "🔧 MÓDULO 3: EQUIPOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "  3.1 GET /api/equipment - Listar todos los equipos"
RESULT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/equipment)
HTTP_CODE=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | head -n -1)
if [ "$HTTP_CODE" = "200" ]; then
    COUNT=$(echo "$BODY" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('data', [])))")
    echo "      ✅ OK - $COUNT equipos encontrados"
else
    echo "      ❌ FALLO - HTTP $HTTP_CODE"
fi

echo "  3.2 GET /api/equipment/6 - Equipo individual"
RESULT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/equipment/6)
HTTP_CODE=$(echo "$RESULT" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "      ✅ OK"
else
    echo "      ❌ FALLO - HTTP $HTTP_CODE"
fi

echo "  3.3 GET /api/equipment/6/tickets - Tickets de equipo"
RESULT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/equipment/6/tickets)
HTTP_CODE=$(echo "$RESULT" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "      ✅ OK"
else
    echo "      ❌ FALLO - HTTP $HTTP_CODE"
fi

echo "  3.4 GET /api/equipment/6/photos - Fotos de equipo"
RESULT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/equipment/6/photos)
HTTP_CODE=$(echo "$RESULT" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "      ✅ OK"
else
    echo "      ❌ FALLO - HTTP $HTTP_CODE"
fi

echo "  3.5 GET /api/equipment/6/notes - Notas de equipo"
RESULT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/equipment/6/notes)
HTTP_CODE=$(echo "$RESULT" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "      ✅ OK"
else
    echo "      ❌ FALLO - HTTP $HTTP_CODE"
fi

echo ""

# ============================================================================
# MÓDULO 4: MODELOS DE EQUIPOS
# ============================================================================
echo "📦 MÓDULO 4: MODELOS DE EQUIPOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "  4.1 GET /api/models - Listar todos los modelos"
RESULT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/models)
HTTP_CODE=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | head -n -1)
if [ "$HTTP_CODE" = "200" ]; then
    COUNT=$(echo "$BODY" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('data', [])))")
    echo "      ✅ OK - $COUNT modelos encontrados"
else
    echo "      ❌ FALLO - HTTP $HTTP_CODE"
fi

echo "  4.2 GET /api/models/1 - Modelo individual"
RESULT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/models/1)
HTTP_CODE=$(echo "$RESULT" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "      ✅ OK"
else
    echo "      ❌ FALLO - HTTP $HTTP_CODE"
fi

echo "  4.3 GET /api/models/1/main-photo - Foto principal (404 esperado)"
RESULT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/models/1/main-photo)
HTTP_CODE=$(echo "$RESULT" | tail -1)
if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "      ✅ OK (404 esperado si no hay foto)"
else
    echo "      ❌ FALLO - HTTP $HTTP_CODE"
fi

echo ""

# ============================================================================
# MÓDULO 5: TICKETS
# ============================================================================
echo "🎫 MÓDULO 5: TICKETS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "  5.1 GET /api/tickets - Listar todos los tickets"
RESULT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/tickets)
HTTP_CODE=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | head -n -1)
if [ "$HTTP_CODE" = "200" ]; then
    COUNT=$(echo "$BODY" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('data', [])))")
    echo "      ✅ OK - $COUNT tickets encontrados"
else
    echo "      ❌ FALLO - HTTP $HTTP_CODE"
fi

echo "  5.2 GET /api/tickets/1 - Ticket individual"
RESULT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/tickets/1)
HTTP_CODE=$(echo "$RESULT" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "      ✅ OK"
else
    echo "      ⚠️  HTTP $HTTP_CODE (puede no existir ticket con ID 1)"
fi

echo "  5.3 GET /api/locations/5/tickets - Tickets por ubicación"
RESULT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/locations/5/tickets)
HTTP_CODE=$(echo "$RESULT" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "      ✅ OK"
else
    echo "      ❌ FALLO - HTTP $HTTP_CODE"
fi

echo ""

# ============================================================================
# MÓDULO 6: INVENTARIO
# ============================================================================
echo "📦 MÓDULO 6: INVENTARIO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "  6.1 GET /api/inventory - Listar inventario"
RESULT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/inventory)
HTTP_CODE=$(echo "$RESULT" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "      ✅ OK"
else
    echo "      ❌ FALLO - HTTP $HTTP_CODE"
    echo "$RESULT" | head -n -1 | python3 -m json.tool 2>&1 | head -5
fi

echo "  6.2 GET /api/inventory/categories - Categorías de inventario"
RESULT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/inventory/categories)
HTTP_CODE=$(echo "$RESULT" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "      ✅ OK"
else
    echo "      ❌ FALLO - HTTP $HTTP_CODE"
fi

echo ""

# ============================================================================
# MÓDULO 7: CONTRATOS
# ============================================================================
echo "📄 MÓDULO 7: CONTRATOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "  7.1 GET /api/contracts - Listar contratos"
RESULT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/contracts)
HTTP_CODE=$(echo "$RESULT" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "      ✅ OK"
else
    echo "      ❌ FALLO - HTTP $HTTP_CODE"
fi

echo ""

# ============================================================================
# MÓDULO 8: USUARIOS
# ============================================================================
echo "👥 MÓDULO 8: USUARIOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "  8.1 GET /api/users - Listar usuarios"
RESULT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users)
HTTP_CODE=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | head -n -1)
if [ "$HTTP_CODE" = "200" ]; then
    COUNT=$(echo "$BODY" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('data', [])))")
    echo "      ✅ OK - $COUNT usuarios encontrados"
else
    echo "      ❌ FALLO - HTTP $HTTP_CODE"
fi

echo "  8.2 GET /api/users/me - Usuario actual"
RESULT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users/me)
HTTP_CODE=$(echo "$RESULT" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "      ✅ OK"
else
    echo "      ❌ FALLO - HTTP $HTTP_CODE"
fi

echo ""

# ============================================================================
# MÓDULO 9: DASHBOARD
# ============================================================================
echo "📊 MÓDULO 9: DASHBOARD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "  9.1 GET /api/dashboard/stats - Estadísticas generales"
RESULT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/dashboard/stats)
HTTP_CODE=$(echo "$RESULT" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "      ✅ OK"
else
    echo "      ❌ FALLO - HTTP $HTTP_CODE"
fi

echo "  9.2 GET /api/dashboard/activity - Actividad reciente"
RESULT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/dashboard/activity)
HTTP_CODE=$(echo "$RESULT" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "      ✅ OK"
else
    echo "      ❌ FALLO - HTTP $HTTP_CODE"
fi

echo ""

# ============================================================================
# RESUMEN FINAL
# ============================================================================
echo ""
echo "============================================================================"
echo "📊 RESUMEN DE PRUEBAS COMPLETADO"
echo "============================================================================"
echo ""
echo "✅ = Funcionando correctamente"
echo "❌ = Error crítico que necesita corrección"
echo "⚠️  = Advertencia (puede ser normal según datos)"
echo ""
echo "Revisa los resultados arriba para ver qué módulos necesitan atención."
echo ""
