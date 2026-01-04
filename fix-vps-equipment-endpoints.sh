#!/bin/bash

# Script para corregir endpoints de equipment que devuelven formato incorrecto
# Los endpoints deben devolver { message: 'success', data: rows } en lugar de rows directamente

cd /var/www/gymtec/backend/src

# 1. Fix GET /api/equipment/:equipmentId/tickets - línea 2753
sed -i "2753s/res.json(rows || \[\]);/res.json({ message: 'success', data: rows || [] });/" server-clean.js

# 2. Fix GET /api/equipment/:equipmentId/notes - línea 2367
sed -i "2367s/res.json(rows || \[\]);/res.json({ message: 'success', data: rows || [] });/" server-clean.js

# 3. Fix GET /api/equipment/:equipmentId/photos - buscar y reemplazar
LINE_NUM=$(grep -n "app.get('/api/equipment/:equipmentId/photos'" server-clean.js | cut -d: -f1)
if [ ! -z "$LINE_NUM" ]; then
    # Buscar la línea res.json(rows || []) después de esta línea
    RESPONSE_LINE=$(tail -n +$LINE_NUM server-clean.js | grep -n "res.json(rows" | head -1 | cut -d: -f1)
    if [ ! -z "$RESPONSE_LINE" ]; then
        ACTUAL_LINE=$((LINE_NUM + RESPONSE_LINE - 1))
        sed -i "${ACTUAL_LINE}s/res.json(rows || \[\]);/res.json({ message: 'success', data: rows || [] });/" server-clean.js
    fi
fi

# 4. Fix GET /api/equipment/:id endpoint
LINE_NUM=$(grep -n "app.get('/api/equipment/:id'" server-clean.js | cut -d: -f1)
if [ ! -z "$LINE_NUM" ]; then
    # Buscar la línea res.json dentro de este endpoint
    RESPONSE_LINE=$(tail -n +$LINE_NUM server-clean.js | grep -n "res.json({ equipment:" | head -1 | cut -d: -f1)
    if [ ! -z "$RESPONSE_LINE" ]; then
        ACTUAL_LINE=$((LINE_NUM + RESPONSE_LINE - 1))
        # Este endpoint ya tiene un formato pero necesitamos verificar si está correcto
        sed -i "${ACTUAL_LINE}s/res.json({ equipment:/res.json({ message: 'success', data: {/" server-clean.js
        # Agregar cierre correcto
        sed -i "${ACTUAL_LINE}s/});/} });/" server-clean.js
    fi
fi

echo "✅ Endpoints corregidos"
echo "📝 Verificando cambios..."

# Verificar los cambios
grep -A2 "app.get('/api/equipment/:equipmentId/tickets'" server-clean.js | grep "res.json"
grep -A2 "app.get('/api/equipment/:equipmentId/notes'" server-clean.js | grep "res.json"
grep -A2 "app.get('/api/equipment/:equipmentId/photos'" server-clean.js | grep "res.json"

echo ""
echo "🔄 Reiniciando servidor..."
pm2 restart gymtec-backend

echo "✅ Correcciones aplicadas y servidor reiniciado"
