#!/bin/bash
# Script para conectar GET /api/inventory a la tabla real SpareParts

SERVER_FILE="/var/www/gymtec/backend/src/server-clean.js"
cp $SERVER_FILE ${SERVER_FILE}.backup8

# Encontrar la línea específica del query de inventario general
# "SELECT * FROM Inventory ORDER BY item_name"
# Reemplazar con "SELECT * FROM SpareParts ORDER BY name"

sed -i 's/SELECT \* FROM Inventory ORDER BY item_name/SELECT * FROM SpareParts ORDER BY name/g' $SERVER_FILE

# Si el anterior no matchea (quizás espacios extra), intentamos algo más genérico pero seguro:
# Buscamos la línea e inyectamos el cambio.
# Línea aprox 8282.

# Validación:
grep "SELECT * FROM SpareParts ORDER BY name" $SERVER_FILE
if [ $? -eq 0 ]; then
    echo "✅ Query actualizada correctamente"
else
    echo "⚠️ sed simple falló, intentando sed con line number..."
    # Buscar número de línea
    LINE=$(grep -n "SELECT \* FROM Inventory ORDER BY item_name" $SERVER_FILE | cut -d: -f1)
    if [ ! -z "$LINE" ]; then
        sed -i "${LINE}s/Inventory/SpareParts/" $SERVER_FILE
        sed -i "${LINE}s/item_name/name/" $SERVER_FILE
        echo "✅ Query actualizada por número de línea $LINE"
    else
        echo "❌ No se encontró la query original"
    fi
fi

# Reiniciar
pm2 restart gymtec-backend
