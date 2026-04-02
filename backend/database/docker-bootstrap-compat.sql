USE `gymtec_erp`;

-- Compatibilidad para el runtime activo de Gymtec sobre una base Docker limpia.

ALTER TABLE `Users`
MODIFY COLUMN `role` ENUM(
    'Admin',
    'Manager',
    'Technician',
    'technician',
    'Tecnico',
    'Técnico',
    'Cliente',
    'Client',
    'Supervisor'
) NOT NULL DEFAULT 'Technician';

CREATE TABLE IF NOT EXISTS `InventoryCategories` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `parent_category_id` INT(11) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_inventory_categories_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Inventory` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `item_code` VARCHAR(100) NULL,
    `item_name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `category_id` INT(11) NULL,
    `category` VARCHAR(100) NULL,
    `unit_of_measure` VARCHAR(50) NOT NULL DEFAULT 'unit',
    `current_stock` DECIMAL(10,2) NOT NULL DEFAULT 0,
    `minimum_stock` DECIMAL(10,2) NOT NULL DEFAULT 0,
    `maximum_stock` DECIMAL(10,2) NOT NULL DEFAULT 999999.99,
    `reorder_point` DECIMAL(10,2) NOT NULL DEFAULT 0,
    `reorder_quantity` DECIMAL(10,2) NOT NULL DEFAULT 0,
    `unit_cost` DECIMAL(10,2) NOT NULL DEFAULT 0,
    `average_cost` DECIMAL(10,2) NOT NULL DEFAULT 0,
    `last_cost` DECIMAL(10,2) NOT NULL DEFAULT 0,
    `location_id` INT(11) NULL,
    `location` VARCHAR(200) NULL,
    `primary_supplier_id` INT(11) NULL,
    `alternative_supplier_id` INT(11) NULL,
    `supplier` VARCHAR(200) NULL,
    `lead_time_days` INT(11) NOT NULL DEFAULT 0,
    `shelf_life_days` INT(11) NULL,
    `is_critical` TINYINT(1) NOT NULL DEFAULT 0,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_inventory_item_code` (`item_code`),
    KEY `idx_inventory_item_name` (`item_name`),
    KEY `idx_inventory_category` (`category`),
    KEY `idx_inventory_category_id` (`category_id`),
    KEY `idx_inventory_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `Inventory`
ADD COLUMN IF NOT EXISTS `item_code` VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS `item_name` VARCHAR(200) NOT NULL,
ADD COLUMN IF NOT EXISTS `description` TEXT NULL,
ADD COLUMN IF NOT EXISTS `category_id` INT(11) NULL,
ADD COLUMN IF NOT EXISTS `category` VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS `unit_of_measure` VARCHAR(50) NOT NULL DEFAULT 'unit',
ADD COLUMN IF NOT EXISTS `current_stock` DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS `minimum_stock` DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS `maximum_stock` DECIMAL(10,2) NOT NULL DEFAULT 999999.99,
ADD COLUMN IF NOT EXISTS `reorder_point` DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS `reorder_quantity` DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS `unit_cost` DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS `average_cost` DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS `last_cost` DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS `location_id` INT(11) NULL,
ADD COLUMN IF NOT EXISTS `location` VARCHAR(200) NULL,
ADD COLUMN IF NOT EXISTS `primary_supplier_id` INT(11) NULL,
ADD COLUMN IF NOT EXISTS `alternative_supplier_id` INT(11) NULL,
ADD COLUMN IF NOT EXISTS `supplier` VARCHAR(200) NULL,
ADD COLUMN IF NOT EXISTS `lead_time_days` INT(11) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS `shelf_life_days` INT(11) NULL,
ADD COLUMN IF NOT EXISTS `is_critical` TINYINT(1) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS `is_active` TINYINT(1) NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS `notes` TEXT NULL;

CREATE TABLE IF NOT EXISTS `InventoryMovements` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `inventory_id` INT(11) NULL,
    `movement_type` VARCHAR(20) NOT NULL,
    `quantity` DECIMAL(10,2) NOT NULL,
    `unit_cost` DECIMAL(10,2) NULL,
    `total_cost` DECIMAL(10,2) NULL,
    `stock_before` DECIMAL(10,2) NULL,
    `stock_after` DECIMAL(10,2) NULL,
    `reference_type` VARCHAR(50) NULL,
    `reference_id` INT(11) NULL,
    `location_from_id` INT(11) NULL,
    `location_to_id` INT(11) NULL,
    `batch_number` VARCHAR(50) NULL,
    `expiry_date` DATE NULL,
    `notes` TEXT NULL,
    `performed_by` INT(11) NULL,
    `performed_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_inventory_movements_inventory` (`inventory_id`),
    KEY `idx_inventory_movements_performed_by` (`performed_by`),
    CONSTRAINT `fk_inventory_movements_inventory`
        FOREIGN KEY (`inventory_id`) REFERENCES `Inventory` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_inventory_movements_user`
        FOREIGN KEY (`performed_by`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spare_part_requests` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `ticket_id` INT(11) NULL,
    `spare_part_name` VARCHAR(200) NOT NULL,
    `quantity_needed` INT(11) NOT NULL DEFAULT 1,
    `priority` ENUM('Baja', 'Media', 'Alta', 'Crítica') NOT NULL DEFAULT 'Media',
    `description` TEXT NULL,
    `justification` TEXT NULL,
    `requested_by` VARCHAR(100) NULL,
    `status` ENUM('pendiente', 'aprobada', 'rechazada', 'completada') NOT NULL DEFAULT 'pendiente',
    `approved_by` INT(11) NULL,
    `approved_at` TIMESTAMP NULL,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_spare_part_requests_ticket` (`ticket_id`),
    KEY `idx_spare_part_requests_status` (`status`),
    KEY `idx_spare_part_requests_priority` (`priority`),
    CONSTRAINT `fk_spare_part_requests_ticket`
        FOREIGN KEY (`ticket_id`) REFERENCES `Tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_spare_part_requests_user`
        FOREIGN KEY (`approved_by`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `Attendance`
ADD COLUMN IF NOT EXISTS `date` DATE GENERATED ALWAYS AS (DATE(`check_in`)) STORED;

INSERT INTO `SpareParts` (`id`, `name`, `sku`, `current_stock`, `minimum_stock`)
SELECT
    i.`id`,
    i.`item_name`,
    COALESCE(i.`item_code`, CONCAT('INV-', i.`id`)),
    CAST(i.`current_stock` AS SIGNED),
    CAST(i.`minimum_stock` AS SIGNED)
FROM `Inventory` i
ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`),
    `sku` = VALUES(`sku`),
    `current_stock` = VALUES(`current_stock`),
    `minimum_stock` = VALUES(`minimum_stock`);

DROP TRIGGER IF EXISTS `sync_spare_parts_after_inventory_insert`;
DROP TRIGGER IF EXISTS `sync_spare_parts_after_inventory_update`;

DELIMITER //

CREATE TRIGGER `sync_spare_parts_after_inventory_insert`
AFTER INSERT ON `Inventory`
FOR EACH ROW
BEGIN
    INSERT INTO `SpareParts` (`id`, `name`, `sku`, `current_stock`, `minimum_stock`)
    VALUES (
        NEW.`id`,
        NEW.`item_name`,
        COALESCE(NEW.`item_code`, CONCAT('INV-', NEW.`id`)),
        CAST(NEW.`current_stock` AS SIGNED),
        CAST(NEW.`minimum_stock` AS SIGNED)
    )
    ON DUPLICATE KEY UPDATE
        `name` = VALUES(`name`),
        `sku` = VALUES(`sku`),
        `current_stock` = VALUES(`current_stock`),
        `minimum_stock` = VALUES(`minimum_stock`);
END//

CREATE TRIGGER `sync_spare_parts_after_inventory_update`
AFTER UPDATE ON `Inventory`
FOR EACH ROW
BEGIN
    INSERT INTO `SpareParts` (`id`, `name`, `sku`, `current_stock`, `minimum_stock`)
    VALUES (
        NEW.`id`,
        NEW.`item_name`,
        COALESCE(NEW.`item_code`, CONCAT('INV-', NEW.`id`)),
        CAST(NEW.`current_stock` AS SIGNED),
        CAST(NEW.`minimum_stock` AS SIGNED)
    )
    ON DUPLICATE KEY UPDATE
        `name` = VALUES(`name`),
        `sku` = VALUES(`sku`),
        `current_stock` = VALUES(`current_stock`),
        `minimum_stock` = VALUES(`minimum_stock`);
END//

DELIMITER ;
