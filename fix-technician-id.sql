-- Corregir technician_id para permitir NULL
ALTER TABLE InformesTecnicos MODIFY COLUMN technician_id INT DEFAULT NULL;
