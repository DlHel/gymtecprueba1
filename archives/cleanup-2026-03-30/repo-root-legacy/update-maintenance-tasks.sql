-- =========================================================
-- GYMTEC ERP - Actualizar Tabla MaintenanceTasks
-- Agregar columnas faltantes para compatibilidad con planificador.js
-- =========================================================

USE gymtec_erp;

-- Intentar agregar columnas (ignorar errores si ya existen)
ALTER TABLE MaintenanceTasks ADD COLUMN type ENUM('maintenance', 'inspection', 'repair', 'cleaning') NOT NULL DEFAULT 'maintenance' AFTER description;
ALTER TABLE MaintenanceTasks ADD COLUMN scheduled_time TIME COMMENT 'Hora programada (opcional)' AFTER scheduled_date;
ALTER TABLE MaintenanceTasks ADD COLUMN estimated_duration INT COMMENT 'Duración estimada en minutos' AFTER scheduled_time;
ALTER TABLE MaintenanceTasks ADD COLUMN actual_duration INT COMMENT 'Duración real en minutos' AFTER estimated_duration;
ALTER TABLE MaintenanceTasks ADD COLUMN is_preventive BOOLEAN DEFAULT FALSE COMMENT 'Es mantenimiento preventivo' AFTER actual_duration;
ALTER TABLE MaintenanceTasks ADD COLUMN started_at TIMESTAMP NULL COMMENT 'Fecha/hora de inicio real' AFTER is_preventive;
ALTER TABLE MaintenanceTasks ADD COLUMN completed_at TIMESTAMP NULL COMMENT 'Fecha/hora de finalización' AFTER started_at;
ALTER TABLE MaintenanceTasks ADD COLUMN client_id INT COMMENT 'ID del cliente' AFTER completed_at;
ALTER TABLE MaintenanceTasks ADD COLUMN ticket_id INT COMMENT 'ID del ticket relacionado' AFTER client_id;

-- Agregar índices
ALTER TABLE MaintenanceTasks ADD INDEX idx_type (type);
ALTER TABLE MaintenanceTasks ADD INDEX idx_client_id (client_id);

-- Insertar datos de prueba solo si no hay datos
INSERT INTO MaintenanceTasks 
    (title, description, type, equipment_id, scheduled_date, scheduled_time, priority, is_preventive, notes, status)
SELECT * FROM (
    SELECT 
        'Mantenimiento Preventivo Mensual' as title,
        'Revisión general de equipos cardio' as description,
        'maintenance' as type,
        NULL as equipment_id,
        '2026-02-15' as scheduled_date,
        '09:00:00' as scheduled_time,
        'medium' as priority,
        TRUE as is_preventive,
        'Incluye lubricación y calibración' as notes,
        'pending' as status
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM MaintenanceTasks LIMIT 1);

INSERT INTO MaintenanceTasks 
    (title, description, type, scheduled_date, scheduled_time, priority, is_preventive, notes, status)
SELECT * FROM (
    SELECT 
        'Inspección de Seguridad' as title,
        'Inspección semanal de equipos' as description,
        'inspection' as type,
        '2026-01-20' as scheduled_date,
        '14:00:00' as scheduled_time,
        'high' as priority,
        TRUE as is_preventive,
        'Verificar estado de cables y ajustes' as notes,
        'pending' as status
) AS tmp
WHERE (SELECT COUNT(*) FROM MaintenanceTasks) <= 1;

-- Verificar las columnas actualizadas
SELECT 'MaintenanceTasks table updated successfully!' AS status;
SELECT COUNT(*) AS total_tasks FROM MaintenanceTasks;
SHOW COLUMNS FROM MaintenanceTasks LIKE 'type';
