#!/bin/bash
# Corrección forzada de inventario.js en servidor
FILE="/var/www/gymtec/frontend/js/inventario.js"

cp $FILE ${FILE}.backup-fix

# Reemplazo 1: item_name -> name || item_name
# Buscamos: ${item.item_name || 'Sin nombre'}
# Reemplazamos por: ${item.name || item.item_name || 'Sin nombre'}
sed -i "s/\${item.item_name || 'Sin nombre'}/\${item.name || item.item_name || 'Sin nombre'}/g" $FILE

# Reemplazo 2: item_sku -> sku || item_code
# Buscamos: ${item.item_code || 'N/A'}
# Reemplazamos por: ${item.sku || item.item_code || 'N/A'}
sed -i "s/\${item.item_code || 'N/A'}/\${item.sku || item.item_code || 'N/A'}/g" $FILE

echo "✅ Parche aplicado a inventario.js"
grep "item.name" $FILE
