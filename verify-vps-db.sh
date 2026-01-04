#!/bin/bash
# Script para verificar y corregir base de datos en VPS

echo "==================================="
echo "Verificación de Base de Datos VPS"
echo "==================================="

# Conectar a MySQL y verificar tablas
mysql -u root -p'gscnxhmEAEWU' gymtec_erp <<EOF

-- Ver todas las tablas
SELECT '=== TABLAS EXISTENTES ===' AS '';
SHOW TABLES;

-- Verificar tablas críticas
SELECT '=== ESTRUCTURA equipmentphotos ===' AS '';
SHOW CREATE TABLE equipmentphotos;

SELECT '=== ESTRUCTURA equipmentnotes ===' AS '';
SHOW CREATE TABLE equipmentnotes;

SELECT '=== ESTRUCTURA ticket_equipment_scope ===' AS '';
SHOW CREATE TABLE ticket_equipment_scope;

SELECT '=== ESTRUCTURA equipmentmodels ===' AS '';
SHOW CREATE TABLE equipmentmodels;

-- Verificar datos
SELECT '=== CONTEO DE REGISTROS ===' AS '';
SELECT 'Equipment' AS tabla, COUNT(*) AS registros FROM equipment
UNION ALL
SELECT 'EquipmentPhotos', COUNT(*) FROM equipmentphotos
UNION ALL
SELECT 'EquipmentNotes', COUNT(*) FROM equipmentnotes
UNION ALL
SELECT 'Tickets', COUNT(*) FROM tickets
UNION ALL
SELECT 'EquipmentModels', COUNT(*) FROM equipmentmodels;

EOF

echo ""
echo "Verificación completada"
