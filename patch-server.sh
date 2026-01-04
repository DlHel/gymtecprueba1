#!/bin/bash
SERVER="/var/www/gymtec/backend/src/server-clean.js"
cp $SERVER ${SERVER}.backup-patch2

# 1. Borrar Technicians (8505-8538)
# Usamos sed -i '8505,8538d' $SERVER
sed -i '8505,8538d' $SERVER

# 2. Insertar new-tech-mov.js en 8505
sed -i '8505r /tmp/new-tech-mov.js' $SERVER

# 3. Borrar POST (8346-8405)
sed -i '8346,8405d' $SERVER

# 4. Insertar new-post.js en 8346
sed -i '8346r /tmp/new-post.js' $SERVER

# 5. Reiniciar
pm2 restart gymtec-backend

echo "✅ Parche aplicado a server-clean.js"
