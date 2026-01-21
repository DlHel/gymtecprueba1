-- Script SEGURO para agregar solo columnas faltantes necesarias
-- Solo agrega columnas si NO existen (ejecutar línea por línea es seguro)

USE gymtec_erp;

-- 1. Agregar columna 'type' (REQUERIDA por planificador.js)
ALTER TABLE MaintenanceTasks ADD COLUMN type ENUM('maintenance', 'inspection', 'repair', 'cleaning') NOT NULL DEFAULT 'maintenance' AFTER description;

-- 2. Agregar 'scheduled_time' (REQUERIDA)
ALTER TABLE MaintenanceTasks ADD COLUMN scheduled_time TIME NULL AFTER scheduled_date;

-- 3. Agregar 'is_preventive' (REQUERIDA)
ALTER TABLE MaintenanceTasks ADD COLUMN is_preventive BOOLEAN DEFAULT FALSE AFTER notes;

-- Verificar
SELECT 'Columnas agregadas exitosamente' AS status;
SHOW COLUMNS FROM MaintenanceTasks LIKE '%type%';
