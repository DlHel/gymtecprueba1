-- ===================================================================
-- GYMTEC ERP - MIGRACIÓN: Completar tabla Contracts
-- Fecha: 2026-02-07
-- ===================================================================

-- Agregar columnas faltantes a la tabla Contracts
-- Usando ADD COLUMN sin IF NOT EXISTS por compatibilidad MySQL

-- Columnas de identificación
ALTER TABLE Contracts ADD COLUMN contract_number VARCHAR(50) UNIQUE AFTER client_id;
ALTER TABLE Contracts ADD COLUMN contract_name VARCHAR(200) AFTER contract_number;

-- Columnas SLA por prioridad
ALTER TABLE Contracts ADD COLUMN sla_p1_hours INT DEFAULT 4 AFTER end_date;
ALTER TABLE Contracts ADD COLUMN sla_p2_hours INT DEFAULT 8 AFTER sla_p1_hours;
ALTER TABLE Contracts ADD COLUMN sla_p3_hours INT DEFAULT 24 AFTER sla_p2_hours;
ALTER TABLE Contracts ADD COLUMN sla_p4_hours INT DEFAULT 72 AFTER sla_p3_hours;

-- Columnas financieras
ALTER TABLE Contracts ADD COLUMN monthly_fee DECIMAL(10,2) DEFAULT 0 AFTER sla_p4_hours;
ALTER TABLE Contracts ADD COLUMN currency VARCHAR(3) DEFAULT 'CLP' AFTER monthly_fee;
ALTER TABLE Contracts ADD COLUMN contract_value DECIMAL(12,2) DEFAULT 0 AFTER currency;
ALTER TABLE Contracts ADD COLUMN payment_terms TEXT AFTER contract_value;

-- Columnas de descripción
ALTER TABLE Contracts ADD COLUMN service_description TEXT AFTER payment_terms;
ALTER TABLE Contracts ADD COLUMN special_conditions TEXT AFTER service_description;

-- Columnas de tipo de servicio
ALTER TABLE Contracts ADD COLUMN service_type VARCHAR(50) DEFAULT 'mantenimiento_preventivo' AFTER special_conditions;
ALTER TABLE Contracts ADD COLUMN maintenance_frequency VARCHAR(50) DEFAULT 'mensual' AFTER service_type;
ALTER TABLE Contracts ADD COLUMN sla_level VARCHAR(20) DEFAULT 'standard' AFTER maintenance_frequency;

-- Columnas de tiempos de respuesta
ALTER TABLE Contracts ADD COLUMN response_time_hours INT DEFAULT 24 AFTER sla_level;
ALTER TABLE Contracts ADD COLUMN resolution_time_hours INT DEFAULT 72 AFTER response_time_hours;

-- Columnas de cobertura
ALTER TABLE Contracts ADD COLUMN services_included TEXT AFTER resolution_time_hours;
ALTER TABLE Contracts ADD COLUMN equipment_covered TEXT AFTER services_included;

-- Columna de auditoría
ALTER TABLE Contracts ADD COLUMN created_by INT AFTER equipment_covered;

-- Modificar columna status para usar los valores del código
ALTER TABLE Contracts MODIFY COLUMN status ENUM('activo', 'borrador', 'vencido', 'suspendido', 'cancelado', 'Active', 'Expired', 'Terminated') DEFAULT 'activo';

-- Índices para mejorar rendimiento
ALTER TABLE Contracts ADD INDEX idx_contracts_number (contract_number);

-- Verificación
SELECT 'Migración completada exitosamente' AS status;
SELECT COUNT(*) AS total_columnas FROM information_schema.columns WHERE table_schema = 'gymtec_erp' AND table_name = 'Contracts';
