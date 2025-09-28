-- =====================================================
-- MIGRACIÓN: SISTEMA DE TICKETS DE GIMNACIÓN v1.0
-- Fecha: 28 de septiembre de 2025
-- Descripción: Sistema completo de mantenimiento preventivo masivo
-- =====================================================

-- 1. Agregar tipo de ticket a tabla existente
ALTER TABLE `Tickets` ADD COLUMN `ticket_type` ENUM(
    'individual', 
    'gimnacion'
) DEFAULT 'individual' AFTER `priority`;

-- 2. Agregar referencia a contrato (opcional pero importante)
ALTER TABLE `Tickets` ADD COLUMN `contract_id` INT NULL AFTER `ticket_type`,
ADD FOREIGN KEY (`contract_id`) REFERENCES `Contracts`(`id`) ON DELETE SET NULL;

-- 3. Modificar equipment_id para ser opcional en gimnación
ALTER TABLE `Tickets` MODIFY COLUMN `equipment_id` INT NULL;

-- 4. Nueva tabla para equipos incluidos en gimnación
CREATE TABLE IF NOT EXISTS `TicketEquipmentScope` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `ticket_id` INT(11) NOT NULL,
    `equipment_id` INT(11) NOT NULL,
    `is_included` BOOLEAN DEFAULT true,
    `exclusion_reason` VARCHAR(255) NULL,
    `assigned_technician_id` INT(11) NULL,
    `status` ENUM('Pendiente', 'En Progreso', 'Completado', 'Omitido') DEFAULT 'Pendiente',
    `completed_at` TIMESTAMP NULL,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`ticket_id`) REFERENCES `Tickets`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`equipment_id`) REFERENCES `Equipment`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`assigned_technician_id`) REFERENCES `Users`(`id`) ON DELETE SET NULL,
    UNIQUE KEY `unique_ticket_equipment` (`ticket_id`, `equipment_id`),
    INDEX `idx_ticket_equipment_scope_ticket` (`ticket_id`),
    INDEX `idx_ticket_equipment_scope_equipment` (`equipment_id`),
    INDEX `idx_ticket_equipment_scope_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Sistema de Checklist Personalizado y Reutilizable
CREATE TABLE IF NOT EXISTS `GimnacionChecklistTemplates` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT,
    `is_default` BOOLEAN DEFAULT false,
    `created_by` INT(11) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`created_by`) REFERENCES `Users`(`id`) ON DELETE CASCADE,
    INDEX `idx_gimnacion_checklist_templates_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `GimnacionChecklistItems` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `template_id` INT(11) NOT NULL,
    `item_text` TEXT NOT NULL,
    `item_order` INT(11) DEFAULT 0,
    `is_required` BOOLEAN DEFAULT false,
    `category` VARCHAR(100) NULL, -- Ej: 'Cardio', 'Fuerza', 'General'
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`template_id`) REFERENCES `GimnacionChecklistTemplates`(`id`) ON DELETE CASCADE,
    INDEX `idx_gimnacion_checklist_items_template` (`template_id`),
    INDEX `idx_gimnacion_checklist_items_order` (`item_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Checklist específico por ticket de gimnación
CREATE TABLE IF NOT EXISTS `TicketGimnacionChecklist` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `ticket_id` INT(11) NOT NULL,
    `template_id` INT(11) NULL, -- Referencia al template usado
    `item_text` TEXT NOT NULL,
    `is_completed` BOOLEAN DEFAULT false,
    `completed_by` INT(11) NULL,
    `completed_at` TIMESTAMP NULL,
    `notes` TEXT NULL,
    `item_order` INT(11) DEFAULT 0,
    `equipment_id` INT(11) NULL, -- Si aplica a equipo específico
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`ticket_id`) REFERENCES `Tickets`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`template_id`) REFERENCES `GimnacionChecklistTemplates`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`completed_by`) REFERENCES `Users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`equipment_id`) REFERENCES `Equipment`(`id`) ON DELETE SET NULL,
    INDEX `idx_ticket_gimnacion_checklist_ticket` (`ticket_id`),
    INDEX `idx_ticket_gimnacion_checklist_order` (`item_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Múltiples técnicos asignados por ticket de gimnación
CREATE TABLE IF NOT EXISTS `TicketTechnicians` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `ticket_id` INT(11) NOT NULL,
    `technician_id` INT(11) NOT NULL,
    `role` ENUM('Principal', 'Asistente', 'Especialista') DEFAULT 'Asistente',
    `assigned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `assigned_by` INT(11) NOT NULL,
    `notes` TEXT NULL,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`ticket_id`) REFERENCES `Tickets`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`technician_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`assigned_by`) REFERENCES `Users`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_ticket_technician` (`ticket_id`, `technician_id`),
    INDEX `idx_ticket_technicians_ticket` (`ticket_id`),
    INDEX `idx_ticket_technicians_tech` (`technician_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Datos iniciales - Template por defecto
INSERT INTO `GimnacionChecklistTemplates` (`name`, `description`, `is_default`, `created_by`) VALUES 
('Mantenimiento Preventivo General', 'Checklist estándar para mantenimiento preventivo de gimnación', true, 1);

-- Items del template por defecto
INSERT INTO `GimnacionChecklistItems` (`template_id`, `item_text`, `item_order`, `is_required`, `category`) VALUES 
(1, 'Verificar funcionamiento general del equipo', 1, true, 'General'),
(1, 'Inspeccionar cables y conexiones eléctricas', 2, true, 'General'),
(1, 'Lubricar partes móviles según especificaciones', 3, true, 'General'),
(1, 'Verificar calibración de sensores', 4, false, 'General'),
(1, 'Limpiar y desinfectar superficies', 5, true, 'General'),
(1, 'Verificar sistemas de seguridad', 6, true, 'General'),
(1, 'Actualizar software/firmware si aplica', 7, false, 'General'),
(1, 'Documentar observaciones y recomendaciones', 8, true, 'General');

-- Crear índices adicionales para optimización de consultas
CREATE INDEX `idx_tickets_type_status` ON `Tickets` (`ticket_type`, `status`);
CREATE INDEX `idx_tickets_contract` ON `Tickets` (`contract_id`);

-- Vista para reportes de gimnación
CREATE VIEW `GimnacionTicketsReport` AS
SELECT 
    t.id as ticket_id,
    t.title,
    t.status,
    t.priority,
    t.created_at,
    t.updated_at,
    c.name as client_name,
    l.name as location_name,
    contract.id as contract_id,
    COUNT(tes.equipment_id) as total_equipment,
    COUNT(CASE WHEN tes.is_included = true THEN 1 END) as included_equipment,
    COUNT(CASE WHEN tes.is_included = false THEN 1 END) as excluded_equipment,
    COUNT(CASE WHEN tes.status = 'Completado' THEN 1 END) as completed_equipment,
    COUNT(tt.technician_id) as assigned_technicians,
    COUNT(CASE WHEN tgc.is_completed = true THEN 1 END) as completed_checklist_items,
    COUNT(tgc.id) as total_checklist_items
FROM `Tickets` t
LEFT JOIN `Clients` c ON t.client_id = c.id
LEFT JOIN `Locations` l ON t.location_id = l.id  
LEFT JOIN `Contracts` contract ON t.contract_id = contract.id
LEFT JOIN `TicketEquipmentScope` tes ON t.id = tes.ticket_id
LEFT JOIN `TicketTechnicians` tt ON t.id = tt.ticket_id
LEFT JOIN `TicketGimnacionChecklist` tgc ON t.id = tgc.ticket_id
WHERE t.ticket_type = 'gimnacion'
GROUP BY t.id;

COMMIT;

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================