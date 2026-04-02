#!/bin/bash
# Script para agregar endpoints de inventario al servidor

# 1. Corregir sintaxis SQLite a MySQL
sed -i "s/datetime('now')/NOW()/g" /tmp/inventory-endpoints.js

# 2. Encontrar la línea después de GET /inventory/categories
LINE=$(grep -n "GET /api/inventory/categories" /var/www/gymtec/backend/src/server-clean.js | tail -1 | cut -d: -f1)

# 3. Encontrar el cierre de esa función (aproximadamente 12 líneas después)
INSERT_LINE=$((LINE + 15))

# 4. Hacer backup
cp /var/www/gymtec/backend/src/server-clean.js /var/www/gymtec/backend/src/server-clean.js.backup

# 5. Insertar los nuevos endpoints después del GET /inventory/categories
head -n $INSERT_LINE /var/www/gymtec/backend/src/server-clean.js > /tmp/server-merged.js
echo "" >> /tmp/server-merged.js
cat /tmp/inventory-endpoints.js >> /tmp/server-merged.js
echo "" >> /tmp/server-merged.js
tail -n +$((INSERT_LINE + 1)) /var/www/gymtec/backend/src/server-clean.js >> /tmp/server-merged.js

# 6. Reemplazar archivo original
cp /tmp/server-merged.js /var/www/gymtec/backend/src/server-clean.js

# 7. Reiniciar servidor
pm2 restart gymtec-backend

echo "✅ Endpoints de inventario agregados correctamente"
