#!/bin/bash
FILE="/var/www/gymtec/frontend/js/inventario.js"
cp $FILE ${FILE}.backup-final

# 1. Corregir nombres de técnicos en dropdown
# Original: option.textContent = tech.name;
# Nuevo: option.textContent = tech.name || tech.username;
perl -i -pe 's/option.textContent = tech.name;/option.textContent = tech.name || tech.username;/g' $FILE

# 2. Corregir renderizado de inventario (asegurar que item.name esté presente)
# Buscamos patrones de item_name e item_code y los reemplazamos por versiones robustas
# Usamos regex que busque item.item_name y lo reemplace, si no tiene ya item.name al lado

# Reemplazo de item_name si no está precedido por item.name
perl -i -pe 's/\$\{item\.item_name\s*\|\|\s*\x27Sin nombre\x27\}/\$\{item.name || item.item_name || \x27Sin nombre\x27\}/g' $FILE

# Reemplazo de item_code
perl -i -pe 's/\$\{item\.item_code\s*\|\|\s*\x27N\/A\x27\}/\$\{item.sku || item.item_code || \x27N\/A\x27\}/g' $FILE

# Verificación
echo "--- Verificando Técnicos ---"
grep "tech.username" $FILE
echo "--- Verificando Inventario ---"
grep "item.name ||" $FILE

echo "✅ Parche aplicado"
