#!/bin/bash
# Script para corregir SOLO la query SQL sin romper el código

SERVER_FILE="/var/www/gymtec/backend/src/server-clean.js"
cp $SERVER_FILE ${SERVER_FILE}.backup5

# Corregir la línea del INSERT - cambiar las columnas
# Original: (name, sku, category, brand, current_stock, min_stock, unit_price, location, description, created_at)
# Correcto: (name, sku, current_stock, minimum_stock)
sed -i 's/(name, sku, category, brand, current_stock, min_stock, unit_price, location, description, created_at)/(name, sku, current_stock, minimum_stock)/g' $SERVER_FILE

# Corregir la línea de VALUES
# Original: VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
# Correcto: VALUES (?, ?, ?, ?)
sed -i "s/VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())/VALUES (?, ?, ?, ?)/g" $SERVER_FILE

# Verificar sintaxis
node --check $SERVER_FILE && echo "✅ Sintaxis OK" || echo "❌ Error de sintaxis"

# Reiniciar servidor
pm2 restart gymtec-backend

echo "Parche aplicado"
