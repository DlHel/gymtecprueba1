#!/bin/bash
# Script completo para corregir la query SQL y los parámetros

SERVER_FILE="/var/www/gymtec/backend/src/server-clean.js"
cp $SERVER_FILE ${SERVER_FILE}.backup6

# 1. Corregir la línea del INSERT - cambiar las columnas
sed -i 's/(name, sku, category, brand, current_stock, min_stock, unit_price, location, description, created_at)/(name, sku, current_stock, minimum_stock)/g' $SERVER_FILE

# 2. Corregir la línea de VALUES  
sed -i "s/VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())/VALUES (?, ?, ?, ?)/g" $SERVER_FILE

# 3. Corregir el array de params - reemplazar el bloque completo
# Esto es más complicado con sed, vamos a usar perl
perl -i -0777 -pe 's/const params = \[\s*name,\s*sku,\s*category \|\| null,\s*brand \|\| null,\s*current_stock \|\| 0,\s*min_stock \|\| 0,\s*unit_price \|\| 0,\s*location \|\| null,\s*description \|\| null\s*\]/const params = [name, sku, current_stock || 0, min_stock || 0]/gs' $SERVER_FILE

# 4. Verificar sintaxis
echo "Verificando sintaxis..."
if node --check $SERVER_FILE 2>&1; then
    echo "✅ Sintaxis OK"
    pm2 restart gymtec-backend
    echo "✅ Servidor reiniciado"
else
    echo "❌ Error de sintaxis, restaurando backup..."
    cp ${SERVER_FILE}.backup6 $SERVER_FILE
    pm2 restart gymtec-backend
fi

echo "Verificando que POST /api/inventory existe..."
grep -n "app.post('/api/inventory'" $SERVER_FILE | head -1
