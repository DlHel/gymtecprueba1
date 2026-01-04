#!/bin/bash
# =============================================================================
# GYMTEC ERP - Script de Instalación para VPS
# =============================================================================
# Ejecutar como root en Ubuntu 24.04
# Uso: bash install-vps.sh

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║           GYMTEC ERP - Instalación VPS                    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 1. Actualizar sistema
echo -e "${YELLOW}[1/8] Actualizando sistema...${NC}"
apt update && apt upgrade -y

# 2. Instalar Node.js 20 LTS
echo -e "${YELLOW}[2/8] Instalando Node.js 20 LTS...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
echo -e "${GREEN}✓ Node.js $(node --version) instalado${NC}"

# 3. Instalar MySQL 8
echo -e "${YELLOW}[3/8] Instalando MySQL 8...${NC}"
apt install -y mysql-server
systemctl start mysql
systemctl enable mysql
echo -e "${GREEN}✓ MySQL instalado${NC}"

# 4. Instalar Nginx
echo -e "${YELLOW}[4/8] Instalando Nginx...${NC}"
apt install -y nginx
systemctl start nginx
systemctl enable nginx
echo -e "${GREEN}✓ Nginx instalado${NC}"

# 5. Instalar PM2
echo -e "${YELLOW}[5/8] Instalando PM2...${NC}"
npm install -g pm2
echo -e "${GREEN}✓ PM2 instalado${NC}"

# 6. Instalar Git
echo -e "${YELLOW}[6/8] Instalando Git...${NC}"
apt install -y git
echo -e "${GREEN}✓ Git instalado${NC}"

# 7. Configurar firewall
echo -e "${YELLOW}[7/8] Configurando firewall...${NC}"
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
echo -e "${GREEN}✓ Firewall configurado${NC}"

# 8. Crear directorios
echo -e "${YELLOW}[8/8] Creando directorios...${NC}"
mkdir -p /var/www/gymtec
mkdir -p /var/backups/gymtec
echo -e "${GREEN}✓ Directorios creados${NC}"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         ✅ INSTALACIÓN BASE COMPLETADA                    ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Versiones instaladas:"
echo -e "  Node.js: $(node --version)"
echo -e "  npm: $(npm --version)"
echo -e "  MySQL: $(mysql --version | awk '{print $3}')"
echo -e "  Nginx: $(nginx -v 2>&1 | awk -F'/' '{print $2}')"
echo -e "  PM2: $(pm2 --version)"
echo ""
echo -e "${YELLOW}SIGUIENTE PASO:${NC}"
echo -e "  1. Configurar MySQL: mysql_secure_installation"
echo -e "  2. Clonar repositorio en /var/www/gymtec"
echo -e "  3. Configurar base de datos y variables de entorno"
echo ""
