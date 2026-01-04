#!/bin/bash
# Agregar log distintivo al GET /api/inventory
SERVER_FILE="/var/www/gymtec/backend/src/server-clean.js"

# Buscar la línea del console.log y agregar otro con un marcador único
sed -i '/console.log(.*GET.*api\/inventory.*Listando inventario/a \    console.log("🔍 DEBUG: Ejecutando Query a SpareParts - VERSION FINAL");' $SERVER_FILE

# Reiniciar backend y ver logs
pm2 restart gymtec-backend
sleep 2
pm2 logs gymtec-backend --lines 20 --nostream
