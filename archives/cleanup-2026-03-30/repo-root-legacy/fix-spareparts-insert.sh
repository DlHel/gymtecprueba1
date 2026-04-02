#!/bin/bash
# Script para corregir el query INSERT de inventario

# Corregir el INSERT para usar las columnas correctas de SpareParts
# La tabla real tiene: id, name, sku, current_stock, minimum_stock, created_at, updated_at

# Buscar la línea con el INSERT INTO SpareParts problemático
BACKUP_FILE="/var/www/gymtec/backend/src/server-clean.js.backup3"
SERVER_FILE="/var/www/gymtec/backend/src/server-clean.js"

cp $SERVER_FILE $BACKUP_FILE

# Reemplazar el bloque POST /api/inventory con la versión corregida
# Primero, encontrar la línea del problema
grep -n "INSERT INTO SpareParts" $SERVER_FILE

# Usar sed para corregir las queries
# 1. Corregir el INSERT
sed -i 's/(name, sku, category, brand, current_stock, min_stock, unit_price, location, description, created_at)/(name, sku, current_stock, minimum_stock)/g' $SERVER_FILE

sed -i "s/VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())/VALUES (?, ?, ?, ?)/g" $SERVER_FILE

echo "Script ejecutado. Verificando cambios..."
grep -n "INSERT INTO SpareParts" $SERVER_FILE | head -1
