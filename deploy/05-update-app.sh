#!/bin/bash
# Script para actualizar la aplicacion (pull de Git)
# Ejecutar como root: bash 05-update-app.sh

set -e

APP_DIR="/var/www/gymtec"

echo "========================================"
echo "GYMTEC ERP - Actualizacion"
echo "========================================"
echo ""

GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}[1/5] Actualizando codigo desde Git...${NC}"
cd $APP_DIR
git pull origin main

echo -e "${GREEN}[2/5] Instalando nuevas dependencias...${NC}"
cd $APP_DIR/backend
npm install --production

echo -e "${GREEN}[3/5] Verificando permisos...${NC}"
chown -R gymtec:gymtec $APP_DIR
chmod -R 755 $APP_DIR
chmod -R 777 $APP_DIR/uploads

echo -e "${GREEN}[4/5] Reiniciando backend...${NC}"
pm2 restart gymtec-backend

echo -e "${GREEN}[5/5] Recargando Nginx...${NC}"
nginx -t && systemctl reload nginx

echo ""
echo "========================================"
echo "ACTUALIZACION COMPLETADA!"
echo "========================================"
echo ""
pm2 status
echo ""
