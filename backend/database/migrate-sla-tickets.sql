-- Migración para agregar columnas SLA a la tabla Tickets
-- Ejecutar después de verificar que las tablas estén creadas

-- Agregar columnas SLA a Tickets (verificar que no existan primero)
-- Ejecutar solo si las columnas no existen

-- Verificar estructura actual
-- DESCRIBE Tickets;

-- Agregar contract_id
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'Tickets' 
     AND COLUMN_NAME = 'contract_id') = 0,
    'ALTER TABLE Tickets ADD COLUMN contract_id INT(11) NULL',
    'SELECT "Column contract_id already exists" as status'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar sla_deadline
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'Tickets' 
     AND COLUMN_NAME = 'sla_deadline') = 0,
    'ALTER TABLE Tickets ADD COLUMN sla_deadline DATETIME NULL',
    'SELECT "Column sla_deadline already exists" as status'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar sla_status
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'Tickets' 
     AND COLUMN_NAME = 'sla_status') = 0,
    'ALTER TABLE Tickets ADD COLUMN sla_status ENUM("cumplido", "en_riesgo", "vencido") NULL DEFAULT NULL',
    'SELECT "Column sla_status already exists" as status'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar workflow_stage
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'Tickets' 
     AND COLUMN_NAME = 'workflow_stage') = 0,
    'ALTER TABLE Tickets ADD COLUMN workflow_stage ENUM("pendiente", "en_progreso", "completado", "cerrado") NULL DEFAULT "pendiente"',
    'SELECT "Column workflow_stage already exists" as status'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar índices (MySQL ignora si ya existen)
ALTER TABLE Tickets ADD INDEX idx_tickets_sla_deadline (sla_deadline);
ALTER TABLE Tickets ADD INDEX idx_tickets_sla_status (sla_status);
ALTER TABLE Tickets ADD INDEX idx_tickets_contract (contract_id);
ALTER TABLE Tickets ADD INDEX idx_tickets_workflow (workflow_stage);

-- Verificar la estructura actualizada
DESCRIBE Tickets;

SELECT 'Migración SLA completada - Verificar estructura de Tickets' as status;