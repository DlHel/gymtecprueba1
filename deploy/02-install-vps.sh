#!/bin/bash
# Script de instalacion completa en VPS Hetzner Ubuntu 22.04
# Ejecutar como root: bash 02-install-vps.sh

set -e  # Salir si hay error

echo "========================================"
echo "GYMTEC ERP - Instalacion en VPS"
echo "========================================"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
APP_USER="gymtec"
APP_DIR="/var/www/gymtec"
DOMAIN="91.107.237.159"  # Cambiar cuando tengas dominio
DB_NAME="gymtec_erp"
DB_USER="gymtec_user"
DB_PASSWORD=$(openssl rand -base64 32)  # Password aleatorio

echo -e "${GREEN}[1/12] Actualizando sistema...${NC}"
apt update && apt upgrade -y

echo -e "${GREEN}[2/12] Instalando dependencias base...${NC}"
apt install -y curl wget git build-essential software-properties-common

echo -e "${GREEN}[3/12] Instalando Node.js 20.x LTS...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version
npm --version

echo -e "${GREEN}[4/12] Instalando MySQL 8.0...${NC}"
apt install -y mysql-server
systemctl start mysql
systemctl enable mysql

echo -e "${GREEN}[5/12] Configurando MySQL...${NC}"
# Asegurar instalacion MySQL
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_PASSWORD}';"
mysql -u root -p"${DB_PASSWORD}" -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME};"
mysql -u root -p"${DB_PASSWORD}" -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';"
mysql -u root -p"${DB_PASSWORD}" -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';"
mysql -u root -p"${DB_PASSWORD}" -e "FLUSH PRIVILEGES;"

echo -e "${GREEN}[6/12] Instalando Nginx...${NC}"
apt install -y nginx
systemctl start nginx
systemctl enable nginx

echo -e "${GREEN}[7/12] Instalando PM2...${NC}"
npm install -g pm2
pm2 startup systemd -u root --hp /root
systemctl enable pm2-root

echo -e "${GREEN}[8/12] Creando usuario de aplicacion...${NC}"
if ! id -u $APP_USER > /dev/null 2>&1; then
    useradd -r -m -s /bin/bash $APP_USER
fi

echo -e "${GREEN}[9/12] Creando estructura de directorios...${NC}"
mkdir -p $APP_DIR
mkdir -p $APP_DIR/uploads
mkdir -p $APP_DIR/logs
chown -R $APP_USER:$APP_USER $APP_DIR

echo -e "${GREEN}[10/12] Configurando firewall...${NC}"
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 3000  # Puerto backend (temporal para debug)

echo -e "${GREEN}[11/12] Guardando credenciales...${NC}"
cat > /root/gymtec-credentials.txt <<EOF
========================================
GYMTEC ERP - CREDENCIALES
========================================
Fecha: $(date)

MYSQL:
  Database: ${DB_NAME}
  User: ${DB_USER}
  Password: ${DB_PASSWORD}
  Root Password: ${DB_PASSWORD}

DIRECTORIOS:
  App: ${APP_DIR}
  Uploads: ${APP_DIR}/uploads
  Logs: ${APP_DIR}/logs

SERVICIOS:
  Backend: PM2 (puerto 3000)
  Frontend: Nginx (puerto 80/443)
  Database: MySQL (puerto 3306)

COMANDOS UTILES:
  pm2 status
  pm2 logs gymtec-backend
  pm2 restart gymtec-backend
  nginx -t
  systemctl status nginx
  mysql -u ${DB_USER} -p

========================================
EOF

chmod 600 /root/gymtec-credentials.txt

echo -e "${GREEN}[12/12] Instalacion base completada!${NC}"
echo ""
echo "========================================"
echo "INSTALACION COMPLETADA"
echo "========================================"
echo ""
echo -e "${YELLOW}IMPORTANTE:${NC}"
echo "1. Credenciales guardadas en: /root/gymtec-credentials.txt"
echo "2. Password MySQL: ${DB_PASSWORD}"
echo ""
echo -e "${GREEN}Proximos pasos:${NC}"
echo "1. Clonar repositorio en ${APP_DIR}"
echo "2. Configurar backend/config.env"
echo "3. Importar schema MySQL"
echo "4. Configurar Nginx"
echo "5. Iniciar aplicacion con PM2"
echo ""
echo "Ejecutar siguiente script: 03-deploy-app.sh"
echo ""
