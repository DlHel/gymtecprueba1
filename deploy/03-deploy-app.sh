#!/bin/bash
# Script de despliegue de aplicacion Gymtec ERP
# Ejecutar como root: bash 03-deploy-app.sh

set -e

echo "========================================"
echo "GYMTEC ERP - Despliegue de Aplicacion"
echo "========================================"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Variables
APP_DIR="/var/www/gymtec"
REPO_URL="https://github.com/DlHel/gymtecprueba1.git"
DB_NAME="gymtec_erp"

# Leer credenciales
if [ -f /root/gymtec-credentials.txt ]; then
    DB_USER=$(grep "User:" /root/gymtec-credentials.txt | awk '{print $2}')
    DB_PASSWORD=$(grep "Password:" /root/gymtec-credentials.txt | awk '{print $2}' | head -1)
else
    echo "ERROR: No se encuentran las credenciales en /root/gymtec-credentials.txt"
    exit 1
fi

echo -e "${GREEN}[1/10] Clonando repositorio...${NC}"
if [ -d "$APP_DIR/.git" ]; then
    echo "Repositorio ya existe, actualizando..."
    cd $APP_DIR
    git pull origin main
else
    rm -rf $APP_DIR/*
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi

echo -e "${GREEN}[2/10] Instalando dependencias del backend...${NC}"
cd $APP_DIR/backend
npm install --production

echo -e "${GREEN}[3/10] Creando archivo de configuracion...${NC}"
cat > $APP_DIR/backend/config.env <<EOF
# Configuracion de Produccion - VPS Hetzner
DB_HOST=localhost
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}

PORT=3000
NODE_ENV=production

JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=10h
SESSION_SECRET=$(openssl rand -base64 32)

UPLOAD_DIR=../uploads
MAX_FILE_SIZE=5242880

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_SECURE=false
SMTP_FROM="GymTec ERP" <noreply@gymtecerp.com>
EOF

chmod 600 $APP_DIR/backend/config.env

echo -e "${GREEN}[4/10] Importando schema de base de datos...${NC}"
if [ -f "$APP_DIR/backend/database/mysql-schema.sql" ]; then
    mysql -u $DB_USER -p"$DB_PASSWORD" $DB_NAME < $APP_DIR/backend/database/mysql-schema.sql
    echo "Schema importado exitosamente"
else
    echo "${YELLOW}ADVERTENCIA: No se encontro mysql-schema.sql${NC}"
fi

echo -e "${GREEN}[5/10] Creando usuario administrador...${NC}"
cd $APP_DIR/backend
node create-admin-user.js <<ANSWERS
admin
admin@gymtec.com
Admin123!
Admin123!
ANSWERS

echo -e "${GREEN}[6/10] Configurando permisos...${NC}"
chown -R gymtec:gymtec $APP_DIR
chmod -R 755 $APP_DIR
chmod -R 777 $APP_DIR/uploads

echo -e "${GREEN}[7/10] Configurando PM2...${NC}"
pm2 delete gymtec-backend 2>/dev/null || true
pm2 start $APP_DIR/backend/src/server-clean.js --name gymtec-backend --log $APP_DIR/logs/backend.log
pm2 save

echo -e "${GREEN}[8/10] Configurando Nginx...${NC}"
cat > /etc/nginx/sites-available/gymtec <<'NGINXCONF'
server {
    listen 80;
    listen [::]:80;
    server_name 91.107.237.159;  # Cambiar cuando tengas dominio
    
    root /var/www/gymtec/frontend;
    index login.html index.html;
    
    access_log /var/www/gymtec/logs/nginx-access.log;
    error_log /var/www/gymtec/logs/nginx-error.log;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Frontend estatico
    location / {
        try_files $uri $uri/ /login.html;
    }
    
    # Proxy API backend
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
    
    # Uploads
    location /uploads {
        alias /var/www/gymtec/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Cache archivos estaticos
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/javascript application/javascript application/json;
}
NGINXCONF

ln -sf /etc/nginx/sites-available/gymtec /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

echo -e "${GREEN}[9/10] Verificando configuracion de Nginx...${NC}"
nginx -t

echo -e "${GREEN}[10/10] Reiniciando servicios...${NC}"
systemctl restart nginx
pm2 restart gymtec-backend

echo ""
echo "========================================"
echo "DESPLIEGUE COMPLETADO!"
echo "========================================"
echo ""
echo -e "${GREEN}Aplicacion disponible en:${NC}"
echo "  http://91.107.237.159"
echo ""
echo -e "${GREEN}Usuario administrador:${NC}"
echo "  Email: admin@gymtec.com"
echo "  Password: Admin123!"
echo ""
echo -e "${GREEN}Comandos utiles:${NC}"
echo "  pm2 status"
echo "  pm2 logs gymtec-backend"
echo "  pm2 restart gymtec-backend"
echo "  nginx -t"
echo "  systemctl status nginx"
echo ""
echo -e "${YELLOW}Proximos pasos:${NC}"
echo "1. Cambiar password del admin"
echo "2. Configurar dominio (si tienes)"
echo "3. Instalar SSL con certbot"
echo "4. Configurar SMTP para notificaciones"
echo ""
