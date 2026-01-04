#!/bin/bash
# Script para diagnosticar y corregir endpoints problemáticos en VPS

echo "=========================================="
echo "🔍 Diagnóstico de Endpoints - VPS Gymtec"
echo "=========================================="
echo ""

# Configuración
API_URL="http://91.107.237.159/api"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." # Reemplazar con token válido

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Función para test de endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    
    echo -n "Testing $description... "
    
    response=$(curl -s -w "\n%{http_code}" -X $method \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        "$API_URL$endpoint")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✅ OK ($http_code)${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL ($http_code)${NC}"
        echo "   Response: $body"
        return 1
    fi
}

echo -e "${YELLOW}📋 Probando endpoints de Equipment...${NC}"
test_endpoint "GET" "/equipment" "Lista de equipos"
test_endpoint "GET" "/equipment/1" "Detalle de equipo #1"
test_endpoint "GET" "/equipment/1/tickets" "Tickets de equipo #1"
test_endpoint "GET" "/equipment/1/photos" "Fotos de equipo #1"
test_endpoint "GET" "/equipment/1/notes" "Notas de equipo #1"

echo ""
echo -e "${YELLOW}📋 Probando endpoints de Locations...${NC}"
test_endpoint "GET" "/locations" "Lista de ubicaciones"
test_endpoint "GET" "/locations/1/equipment" "Equipos en ubicación #1"

echo ""
echo -e "${YELLOW}📋 Probando endpoints de Models...${NC}"
test_endpoint "GET" "/models" "Lista de modelos"
test_endpoint "GET" "/models/1" "Detalle de modelo #1"
test_endpoint "GET" "/models/1/main-photo" "Foto principal modelo #1"

echo ""
echo -e "${YELLOW}📋 Probando endpoints de Dashboard...${NC}"
test_endpoint "GET" "/dashboard/activity?limit=10" "Actividad reciente"

echo ""
echo -e "${YELLOW}📋 Probando endpoints de Clientes...${NC}"
test_endpoint "GET" "/clients" "Lista de clientes"

echo ""
echo "=========================================="
echo "📊 Diagnóstico completado"
echo "=========================================="
