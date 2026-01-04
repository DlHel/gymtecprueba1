#!/bin/bash
# =============================================================================
# Script de Deploy - Gymtec ERP
# =============================================================================
# Este script automatiza el proceso de actualización del sistema en el servidor
# Uso: ./deploy.sh [opciones]
#   --full    : Deploy completo (código + base de datos)
#   --code    : Solo actualizar código (por defecto)
#   --migrate : Ejecutar migraciones de BD

set -e  # Salir si hay errores

# Configuración
APP_DIR="/var/www/gymtec"
BACKUP_DIR="/var/backups/gymtec"
GIT_BRANCH="main"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     GYMTEC ERP - Deploy Script         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}Error: Directorio $APP_DIR no existe${NC}"
    exit 1
fi

cd "$APP_DIR"

# 1. Crear backup antes de actualizar
echo -e "${YELLOW}[1/5] Creando backup de seguridad...${NC}"
if [ -f "scripts/backup-db.sh" ]; then
    bash scripts/backup-db.sh
fi

# 2. Obtener últimos cambios de Git
echo -e "${YELLOW}[2/5] Actualizando código desde Git...${NC}"
git fetch origin
git reset --hard origin/$GIT_BRANCH
echo -e "${GREEN}✓ Código actualizado${NC}"

# 3. Instalar dependencias del backend
echo -e "${YELLOW}[3/5] Instalando dependencias del backend...${NC}"
cd backend
npm install --production
echo -e "${GREEN}✓ Dependencias instaladas${NC}"
cd ..

# 4. Reiniciar backend con PM2
echo -e "${YELLOW}[4/5] Reiniciando backend...${NC}"
pm2 restart gymtec-api || pm2 start backend/ecosystem.config.js --env production
echo -e "${GREEN}✓ Backend reiniciado${NC}"

# 5. Verificar estado
echo -e "${YELLOW}[5/5] Verificando estado del sistema...${NC}"
sleep 3

# Verificar que el backend responde
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend respondiendo correctamente${NC}"
else
    echo -e "${RED}⚠ Advertencia: Backend no responde en /api/health${NC}"
fi

pm2 status

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        Deploy completado ✓             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "Comandos útiles:"
echo -e "  ${BLUE}pm2 logs gymtec-api${NC}     - Ver logs del backend"
echo -e "  ${BLUE}pm2 status${NC}              - Estado de PM2"
echo -e "  ${BLUE}sudo nginx -t${NC}           - Probar configuración Nginx"
