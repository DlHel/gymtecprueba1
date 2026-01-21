#!/bin/bash
# Script para agregar la columna filename a InformesTecnicos

source /var/www/gymtec/backend/config.env

echo "Conectando a MySQL..."
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p"$DB_PASSWORD" $DB_NAME -e "ALTER TABLE InformesTecnicos ADD COLUMN filename VARCHAR(255) NULL;"

if [ $? -eq 0 ]; then
    echo "✅ Columna filename agregada exitosamente"
    mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p"$DB_PASSWORD" $DB_NAME -e "DESCRIBE InformesTecnicos;"
else
    echo "❌ Error al agregar columna"
fi
