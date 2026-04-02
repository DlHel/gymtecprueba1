USE `gymtec_erp`;

-- Parches para compatibilidad del runtime activo sobre el schema legacy.
ALTER TABLE `InformesTecnicos`
MODIFY COLUMN `generated_by` INT(11) NULL;

ALTER TABLE `InformesTecnicos`
ADD COLUMN IF NOT EXISTS `technician_id` INT(11) NULL,
ADD COLUMN IF NOT EXISTS `report_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE `InformesTecnicos`
MODIFY COLUMN `filename` VARCHAR(255) NULL;

CREATE INDEX `idx_informes_technician_id` ON `InformesTecnicos` (`technician_id`);
CREATE INDEX `idx_informes_report_date` ON `InformesTecnicos` (`report_date`);
