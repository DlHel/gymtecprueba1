-- Parches para compatibilidad en entorno Docker
-- 1. Permitir NULL en generated_by (el código actual no lo envía en el INSERT)
ALTER TABLE `InformesTecnicos` MODIFY COLUMN `generated_by` INT(11) NULL;

-- 2. Agregar technician_id por compatibilidad con esquema VPS (donde ocurrió el error)
ALTER TABLE `InformesTecnicos` ADD COLUMN IF NOT EXISTS `technician_id` INT(11) NULL;
