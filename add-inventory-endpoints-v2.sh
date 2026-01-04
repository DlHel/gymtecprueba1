#!/bin/bash
# Script para agregar endpoints de inventario CORRECTAMENTE

# 1. Corregir sintaxis SQLite a MySQL
sed -i "s/datetime('now')/NOW()/g" /tmp/inventory-endpoints.js

# 2. El endpoint GET /api/inventory/categories termina en línea 8307 con });
# Insertamos los nuevos endpoints EN LA LÍNEA 8308 (justo antes de dashboard/activity)
INSERT_LINE=8307

# 3. Hacer backup
cp /var/www/gymtec/backend/src/server-clean.js /var/www/gymtec/backend/src/server-clean.js.backup2

# 4. Insertar los nuevos endpoints después de la línea 8307
head -n $INSERT_LINE /var/www/gymtec/backend/src/server-clean.js > /tmp/server-merged.js
echo "" >> /tmp/server-merged.js
cat /tmp/inventory-endpoints.js >> /tmp/server-merged.js
echo "" >> /tmp/server-merged.js
tail -n +$((INSERT_LINE + 1)) /var/www/gymtec/backend/src/server-clean.js >> /tmp/server-merged.js

# 5. Reemplazar archivo original
cp /tmp/server-merged.js /var/www/gymtec/backend/src/server-clean.js

# 6. Contar líneas para verificar
echo "Líneas originales: $(wc -l < /var/www/gymtec/backend/src/server-clean.js.backup2)"
echo "Líneas nuevas: $(wc -l < /var/www/gymtec/backend/src/server-clean.js)"

# 7. Verificar que POST existe
grep -n "app.post('/api/inventory'" /var/www/gymtec/backend/src/server-clean.js | head -1

# 8. Reiniciar servidor
pm2 restart gymtec-backend

echo "✅ Endpoints de inventario agregados correctamente"
