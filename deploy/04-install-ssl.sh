#!/bin/bash
# Script para instalar certificado SSL con Let's Encrypt
# Ejecutar como root: bash 04-install-ssl.sh tu-dominio.com

set -e

if [ -z "$1" ]; then
    echo "ERROR: Debes proporcionar un dominio"
    echo "Uso: bash 04-install-ssl.sh tu-dominio.com"
    exit 1
fi

DOMAIN=$1

echo "========================================"
echo "GYMTEC ERP - Instalacion SSL"
echo "Dominio: $DOMAIN"
echo "========================================"
echo ""

GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}[1/3] Instalando Certbot...${NC}"
apt install -y certbot python3-certbot-nginx

echo -e "${GREEN}[2/3] Obteniendo certificado SSL...${NC}"
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

echo -e "${GREEN}[3/3] Configurando renovacion automatica...${NC}"
systemctl enable certbot.timer
systemctl start certbot.timer

echo ""
echo "========================================"
echo "SSL INSTALADO EXITOSAMENTE!"
echo "========================================"
echo ""
echo "Tu sitio ahora esta disponible en:"
echo "  https://$DOMAIN"
echo "  https://www.$DOMAIN"
echo ""
echo "Renovacion automatica configurada cada 12 horas"
echo ""
