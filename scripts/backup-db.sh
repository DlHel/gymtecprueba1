#!/bin/bash
# =============================================================================
# Script de Backup de Base de Datos MySQL - Gymtec ERP
# =============================================================================
# Uso: ./backup-db.sh
# Configurar en cron para backups automáticos:
# 0 2 * * * /var/www/gymtec/scripts/backup-db.sh >> /var/log/gymtec-backup.log 2>&1

# Configuración - CAMBIAR según tu entorno
DB_USER="gymtec_user"
DB_NAME="gymtec_erp"
BACKUP_DIR="/var/backups/gymtec"
DAYS_TO_KEEP=7

# Variables automáticas
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="gymtec_${DATE}.sql.gz"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}[$(date)] Iniciando backup de base de datos...${NC}"

# Crear directorio si no existe
mkdir -p "$BACKUP_DIR"

# Realizar backup
echo -e "${YELLOW}[$(date)] Exportando base de datos ${DB_NAME}...${NC}"
mysqldump -u "$DB_USER" -p "$DB_NAME" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    | gzip > "${BACKUP_DIR}/${FILENAME}"

# Verificar si el backup fue exitoso
if [ $? -eq 0 ]; then
    SIZE=$(du -h "${BACKUP_DIR}/${FILENAME}" | cut -f1)
    echo -e "${GREEN}[$(date)] ✅ Backup completado: ${FILENAME} (${SIZE})${NC}"
else
    echo -e "${RED}[$(date)] ❌ Error al crear backup${NC}"
    exit 1
fi

# Eliminar backups antiguos (más de X días)
echo -e "${YELLOW}[$(date)] Limpiando backups antiguos (>${DAYS_TO_KEEP} días)...${NC}"
DELETED=$(find "$BACKUP_DIR" -name "gymtec_*.sql.gz" -mtime +"$DAYS_TO_KEEP" -delete -print | wc -l)
echo -e "${GREEN}[$(date)] Eliminados ${DELETED} backups antiguos${NC}"

# Mostrar espacio usado
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/gymtec_*.sql.gz 2>/dev/null | wc -l)
echo -e "${GREEN}[$(date)] 📦 Total: ${BACKUP_COUNT} backups (${TOTAL_SIZE})${NC}"

echo -e "${GREEN}[$(date)] ✅ Proceso de backup finalizado${NC}"
