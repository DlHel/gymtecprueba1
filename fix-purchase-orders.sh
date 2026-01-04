#!/bin/bash
FILE="/var/www/gymtec/backend/src/routes/purchase-orders.js"

# Backup
cp $FILE ${FILE}.backup-fix

# 1. Cambiar Inventory -> SpareParts
# Cuidado con no reemplazar InventoryCategories aun
sed -i 's/LEFT JOIN Inventory i/LEFT JOIN SpareParts i/g' $FILE

# 2. Corregir columnas select
# i.item_code -> i.sku
sed -i 's/i.item_code/i.sku/g' $FILE
# i.item_name -> i.name
sed -i 's/i.item_name/i.name/g' $FILE

# 3. Corregir JOIN de categorias
# Original: LEFT JOIN InventoryCategories ic ON i.category_id = ic.id
# Nuevo (eliminando): vamos a comentar la linea o borrarla. Y cambiar la seleccion.
# Select original: ic.name as category_name
# Nuevo select: i.category as category_name

sed -i 's/ic.name as category_name/i.category as category_name/g' $FILE
sed -i 's/LEFT JOIN InventoryCategories ic ON i.category_id = ic.id//g' $FILE

# 4. Validar que no queden referencias a fields viejos en el WHERE o INSERTs si los hubiera.
# En el GET /:id hay un SELECT complejo.
# En POST / hay INSERTs a PurchaseOrderItems. Esos parecen estar bien (usan spare_part_id).

echo "✅ Routes de Purchase Orders parcheado"
