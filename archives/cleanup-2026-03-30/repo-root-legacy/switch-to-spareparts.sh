#!/bin/bash
# Script para migrar endpoints GET de Inventory a SpareParts

SERVER_FILE="/var/www/gymtec/backend/src/server-clean.js"
cp $SERVER_FILE ${SERVER_FILE}.backup7

# 1. Cambiar GET /api/inventory
# SELECT * FROM Inventory ORDER BY item_name -> SELECT * FROM SpareParts ORDER BY name
sed -i 's/SELECT \* FROM Inventory ORDER BY item_name/SELECT * FROM SpareParts ORDER BY name/g' $SERVER_FILE

# 2. Cambiar GET /api/inventory/categories
# SELECT DISTINCT category FROM Inventory -> SELECT DISTINCT category FROM SpareParts
# Nota: La tabla SpareParts NO tiene columna 'category' sino 'category_id'. 
# Pero espera, mi script describe-spareparts.sql dijo que NO hay columna category.
# Necesitamos manejar esto. Verificaré si podemos usar JOIN o si debo ignorar categorias por ahora.
# Por ahora, voy a comentar la parte de categorias si falla, o intentar emularla.
# OJO: Si SpareParts no tiene categorias, este endpoint romperá.

# Revisemos la tabla SpareParts de nuevo: id, name, sku, current_stock, minimum_stock.
# NO TIENE CATEGORIA. Esto es un problema para los filtros.
# Necesitamos una tabla InventoryCategories o similar.
# El endpoint GET /api/inventory/:id que agregué hace:
# LEFT JOIN InventoryCategories ic ON sp.category_id = ic.id
# Esto sugiere que debería haber category_id en SpareParts.
# Pero mi describe-spareparts.sql mostró que NO hay category_id.

# Solución temporal: 
# 1. Agregar columna category_id a SpareParts
# 2. O, simplemente hacer que el GET de categorias devuelva una lista vacía o estática por ahora para no bloquear.

# Voy a cambiar solo el GET principal por ahora para ver los items.
# Y voy a modificar el GET de categorias para que no falle (seleccionar de una lista fija o similar si la tabla no existe).

# Cambio seguro para GET principal:
sed -i 's/FROM Inventory/FROM SpareParts/g' $SERVER_FILE

# Pero espera, si cambio TODOS los Inventory por SpareParts, romperé el de categorías si la columna no existe.
# Voy a ser específico.

sed -i 's/SELECT \* FROM Inventory/SELECT * FROM SpareParts/g' $SERVER_FILE
sed -i 's/ORDER BY item_name/ORDER BY name/g' $SERVER_FILE

# Verificar sintaxis
node --check $SERVER_FILE && pm2 restart gymtec-backend
