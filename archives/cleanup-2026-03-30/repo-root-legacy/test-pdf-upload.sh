#!/bin/bash
# Script para probar la subida de PDF al endpoint /api/informes/:id/pdf

# Obtener token de autenticación
echo "=== OBTENIENDO TOKEN ==="
RESPONSE=$(curl -s -X POST 'http://localhost:3000/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}')

echo "Respuesta login: $RESPONSE"

TOKEN=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))")

if [ -z "$TOKEN" ]; then
  echo "❌ No se pudo obtener token"
  exit 1
fi

echo "✅ Token obtenido: ${TOKEN:0:20}..."

# Crear archivo PDF de prueba
echo "=== CREANDO PDF DE PRUEBA ==="
echo "%PDF-1.4 Test PDF Content" > /tmp/test-upload.pdf
echo "PDF creado: $(ls -la /tmp/test-upload.pdf)"

# Intentar subir el PDF
echo "=== SUBIENDO PDF AL ENDPOINT ==="
echo "Endpoint: POST /api/informes/7/pdf"

UPLOAD_RESPONSE=$(curl -v -X POST 'http://localhost:3000/api/informes/7/pdf' \
  -H "Authorization: Bearer $TOKEN" \
  -F "pdf=@/tmp/test-upload.pdf;type=application/pdf" 2>&1)

echo "=== RESPUESTA DEL SERVIDOR ==="
echo "$UPLOAD_RESPONSE"

# Revisar logs del servidor
echo "=== LOGS DEL SERVIDOR (últimas 10 líneas) ==="
echo "--- OUT LOG ---"
tail -10 /root/.pm2/logs/gymtec-backend-out.log
echo "--- ERROR LOG ---"
tail -10 /root/.pm2/logs/gymtec-backend-error.log
