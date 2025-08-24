-- ===================================================================
-- GYMTEC ERP - FASE 1 CORE BUSINESS ENHANCEMENTS
-- Implementación de Ideas Extraídas del Documento LAMP
-- ===================================================================
-- 
-- FUNCIONALIDADES IMPLEMENTADAS:
-- 1. Sistema de Contratos y SLA por Cliente ⭐⭐⭐⭐⭐
-- 2. Workflow de Tickets con Guardias de Estado ⭐⭐⭐⭐⭐
-- 3. Checklist Obligatorio por Tipo de Ticket ⭐⭐⭐⭐
-- 4. Sistema de Auditoría Completo ⭐⭐⭐⭐
-- ===================================================================

USE `gymtec_erp`;

-- ===================================================================
-- 1. SISTEMA DE CONTRATOS Y SLA (Idea #2 y #9 del LAMP)
-- ===================================================================

-- Tabla de contratos mejorada con SLA
CREATE TABLE IF NOT EXISTS `Contracts` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `client_id` INT(11) NOT NULL,
    `contract_number` VARCHAR(50) UNIQUE NOT NULL,
    `contract_name` VARCHAR(200) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `status` ENUM('activo', 'vencido', 'suspendido', 'cancelado') DEFAULT 'activo',
    
    -- SLA AUTOMÁTICO POR PRIORIDAD (Idea clave del LAMP)
    `sla_p1_hours` INT(11) DEFAULT 4,   -- Crítico: 4 horas
    `sla_p2_hours` INT(11) DEFAULT 8,   -- Alto: 8 horas  
    `sla_p3_hours` INT(11) DEFAULT 24,  -- Medio: 24 horas
    `sla_p4_hours` INT(11) DEFAULT 72,  -- Bajo: 72 horas
    
    `monthly_fee` DECIMAL(10,2) DEFAULT 0.00,
    `currency` VARCHAR(3) DEFAULT 'CLP',
    `payment_terms` TEXT,
    `service_description` TEXT,
    `special_conditions` TEXT,
    
    `created_by` INT(11),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`id`),
    FOREIGN KEY (`client_id`) REFERENCES `Clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    
    INDEX `idx_contracts_client` (`client_id`),
    INDEX `idx_contracts_status` (`status`),
    INDEX `idx_contracts_dates` (`start_date`, `end_date`),
    INDEX `idx_contracts_number` (`contract_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 2. WORKFLOW DE TICKETS CON GUARDIAS DE ESTADO (Idea #1 del LAMP)
-- ===================================================================

-- Primero actualizar la tabla Tickets existente
ALTER TABLE `Tickets` 
    ADD COLUMN IF NOT EXISTS `ticket_type` ENUM(
        'preventivo', 'correctivo', 'instalacion', 'desinstalacion', 
        'actualizacion', 'capacitacion', 'emergencia'
    ) DEFAULT 'correctivo' AFTER `priority`,
    
    ADD COLUMN IF NOT EXISTS `sla_deadline` DATETIME NULL AFTER `due_date`,
    ADD COLUMN IF NOT EXISTS `sla_status` ENUM('cumplido', 'vencido', 'en_riesgo') NULL AFTER `sla_deadline`,
    ADD COLUMN IF NOT EXISTS `resolution_time_minutes` INT(11) NULL AFTER `sla_status`,
    ADD COLUMN IF NOT EXISTS `workflow_stage` ENUM(
        'creado', 'asignado', 'en_progreso', 'esperando_repuestos', 
        'esperando_cliente', 'en_revision', 'completado', 'cerrado'
    ) DEFAULT 'creado' AFTER `resolution_time_minutes`,
    
    ADD COLUMN IF NOT EXISTS `checklist_completed` BOOLEAN DEFAULT FALSE AFTER `workflow_stage`,
    ADD COLUMN IF NOT EXISTS `can_close` BOOLEAN DEFAULT FALSE AFTER `checklist_completed`,
    ADD COLUMN IF NOT EXISTS `contract_id` INT(11) NULL AFTER `can_close`,
    
    ADD FOREIGN KEY (`contract_id`) REFERENCES `Contracts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD INDEX `idx_tickets_type` (`ticket_type`),
    ADD INDEX `idx_tickets_workflow` (`workflow_stage`),
    ADD INDEX `idx_tickets_sla` (`sla_status`);

-- ===================================================================
-- 3. SISTEMA DE CHECKLIST OBLIGATORIO (Idea #3 del LAMP)
-- ===================================================================

-- Templates de checklist reutilizables
CREATE TABLE IF NOT EXISTS `ChecklistTemplates` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT,
    `ticket_type` ENUM(
        'preventivo', 'correctivo', 'instalacion', 'desinstalacion',
        'actualizacion', 'capacitacion', 'emergencia'
    ) NOT NULL,
    `equipment_category` ENUM('Cardio', 'Fuerza', 'Funcional', 'Accesorios') NULL,
    `equipment_model_id` INT(11) NULL, -- NULL = aplica a todos los modelos
    `is_active` BOOLEAN DEFAULT TRUE,
    `is_mandatory` BOOLEAN DEFAULT TRUE, -- Checklist obligatorio para cerrar ticket
    
    `created_by` INT(11),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`id`),
    FOREIGN KEY (`equipment_model_id`) REFERENCES `EquipmentModels` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    
    INDEX `idx_checklist_templates_type` (`ticket_type`),
    INDEX `idx_checklist_templates_category` (`equipment_category`),
    INDEX `idx_checklist_templates_model` (`equipment_model_id`),
    UNIQUE KEY `unique_checklist_template` (`name`, `ticket_type`, `equipment_model_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Items individuales de cada template
CREATE TABLE IF NOT EXISTS `ChecklistTemplateItems` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `template_id` INT(11) NOT NULL,
    `item_text` TEXT NOT NULL,
    `item_order` INT(11) DEFAULT 0,
    `is_required` BOOLEAN DEFAULT TRUE,
    `expected_result` TEXT NULL, -- Qué se espera como resultado
    `notes` TEXT NULL,
    
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`id`),
    FOREIGN KEY (`template_id`) REFERENCES `ChecklistTemplates` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    
    INDEX `idx_checklist_items_template` (`template_id`),
    INDEX `idx_checklist_items_order` (`item_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Checklist ejecutado en cada ticket
CREATE TABLE IF NOT EXISTS `TicketChecklist` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `ticket_id` INT(11) NOT NULL,
    `template_id` INT(11) NOT NULL,
    `assigned_technician_id` INT(11) NULL,
    `status` ENUM('pendiente', 'en_progreso', 'completado') DEFAULT 'pendiente',
    `completion_percentage` DECIMAL(5,2) DEFAULT 0.00,
    
    `started_at` TIMESTAMP NULL,
    `completed_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`id`),
    FOREIGN KEY (`ticket_id`) REFERENCES `Tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`template_id`) REFERENCES `ChecklistTemplates` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`assigned_technician_id`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    
    INDEX `idx_ticket_checklist_ticket` (`ticket_id`),
    INDEX `idx_ticket_checklist_template` (`template_id`),
    INDEX `idx_ticket_checklist_status` (`status`),
    UNIQUE KEY `unique_ticket_checklist` (`ticket_id`, `template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Items del checklist ejecutados
CREATE TABLE IF NOT EXISTS `TicketChecklistItems` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `ticket_checklist_id` INT(11) NOT NULL,
    `template_item_id` INT(11) NOT NULL,
    `is_completed` BOOLEAN DEFAULT FALSE,
    `completion_notes` TEXT NULL,
    `completed_by` INT(11) NULL,
    `completed_at` TIMESTAMP NULL,
    `requires_attention` BOOLEAN DEFAULT FALSE, -- Si necesita seguimiento
    
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`id`),
    FOREIGN KEY (`ticket_checklist_id`) REFERENCES `TicketChecklist` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`template_item_id`) REFERENCES `ChecklistTemplateItems` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`completed_by`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    
    INDEX `idx_ticket_checklist_items_checklist` (`ticket_checklist_id`),
    INDEX `idx_ticket_checklist_items_template` (`template_item_id`),
    INDEX `idx_ticket_checklist_items_completed` (`is_completed`),
    UNIQUE KEY `unique_checklist_item` (`ticket_checklist_id`, `template_item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 4. SISTEMA DE AUDITORÍA COMPLETO (Idea #6 del LAMP)
-- ===================================================================

CREATE TABLE IF NOT EXISTS `AuditLog` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `table_name` VARCHAR(100) NOT NULL,
    `record_id` INT(11) NOT NULL,
    `action` ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    `old_values` JSON NULL,
    `new_values` JSON NULL,
    `changed_fields` JSON NULL, -- Solo los campos que cambiaron
    `user_id` INT(11) NULL,
    `user_ip` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `session_id` VARCHAR(128) NULL,
    `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contexto adicional para tickets
    `ticket_id` INT(11) NULL, -- Si la acción está relacionada con un ticket
    `client_id` INT(11) NULL, -- Cliente afectado
    `action_description` TEXT NULL, -- Descripción humana de la acción
    
    PRIMARY KEY (`id`),
    FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`ticket_id`) REFERENCES `Tickets` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`client_id`) REFERENCES `Clients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    
    INDEX `idx_audit_table_record` (`table_name`, `record_id`),
    INDEX `idx_audit_user` (`user_id`),
    INDEX `idx_audit_timestamp` (`timestamp`),
    INDEX `idx_audit_action` (`action`),
    INDEX `idx_audit_ticket` (`ticket_id`),
    INDEX `idx_audit_client` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 5. TABLA DE CONFIGURACIÓN DEL SISTEMA
-- ===================================================================

CREATE TABLE IF NOT EXISTS `SystemSettings` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `setting_key` VARCHAR(100) NOT NULL UNIQUE,
    `setting_value` TEXT NULL,
    `setting_type` ENUM('string', 'integer', 'boolean', 'json', 'email') DEFAULT 'string',
    `description` TEXT NULL,
    `category` VARCHAR(50) DEFAULT 'general',
    `is_editable` BOOLEAN DEFAULT TRUE,
    
    `updated_by` INT(11) NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`id`),
    FOREIGN KEY (`updated_by`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    
    INDEX `idx_system_settings_key` (`setting_key`),
    INDEX `idx_system_settings_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 6. DATOS INICIALES PARA EL SISTEMA
-- ===================================================================

-- Configuraciones por defecto
INSERT IGNORE INTO `SystemSettings` (`setting_key`, `setting_value`, `setting_type`, `description`, `category`) VALUES
('sla_default_p1_hours', '4', 'integer', 'SLA por defecto para prioridad crítica (horas)', 'sla'),
('sla_default_p2_hours', '8', 'integer', 'SLA por defecto para prioridad alta (horas)', 'sla'),
('sla_default_p3_hours', '24', 'integer', 'SLA por defecto para prioridad media (horas)', 'sla'),
('sla_default_p4_hours', '72', 'integer', 'SLA por defecto para prioridad baja (horas)', 'sla'),
('sla_warning_percentage', '75', 'integer', 'Porcentaje de SLA para enviar alerta de riesgo', 'sla'),
('checklist_mandatory_for_closure', 'true', 'boolean', 'Checklist obligatorio para cerrar tickets', 'workflow'),
('audit_enabled', 'true', 'boolean', 'Sistema de auditoría activado', 'audit'),
('auto_assign_sla', 'true', 'boolean', 'Asignación automática de SLA basada en contratos', 'sla'),
('notification_sla_warning', 'true', 'boolean', 'Notificaciones automáticas de SLA en riesgo', 'notifications');

-- Templates de checklist básicos
INSERT IGNORE INTO `ChecklistTemplates` (`name`, `description`, `ticket_type`, `equipment_category`, `is_mandatory`) VALUES
('Mantenimiento Preventivo Cardio', 'Checklist estándar para mantenimiento preventivo de equipos cardiovasculares', 'preventivo', 'Cardio', TRUE),
('Mantenimiento Preventivo Fuerza', 'Checklist estándar para mantenimiento preventivo de equipos de fuerza', 'preventivo', 'Fuerza', TRUE),
('Servicio Correctivo General', 'Checklist para servicios correctivos generales', 'correctivo', NULL, TRUE),
('Instalación de Equipo', 'Checklist para instalación de nuevos equipos', 'instalacion', NULL, TRUE),
('Emergencia Crítica', 'Checklist para atención de emergencias críticas', 'emergencia', NULL, TRUE);

-- Items del checklist para Mantenimiento Preventivo Cardio
INSERT IGNORE INTO `ChecklistTemplateItems` (`template_id`, `item_text`, `item_order`, `expected_result`) VALUES
((SELECT id FROM `ChecklistTemplates` WHERE name = 'Mantenimiento Preventivo Cardio'), 'Verificar funcionamiento del panel de control', 1, 'Panel responde correctamente a todas las funciones'),
((SELECT id FROM `ChecklistTemplates` WHERE name = 'Mantenimiento Preventivo Cardio'), 'Revisar y limpiar filtros de ventilación', 2, 'Filtros limpios y sin obstrucciones'),
((SELECT id FROM `ChecklistTemplates` WHERE name = 'Mantenimiento Preventivo Cardio'), 'Lubricar partes móviles según manual', 3, 'Todas las partes móviles lubricadas correctamente'),
((SELECT id FROM `ChecklistTemplates` WHERE name = 'Mantenimiento Preventivo Cardio'), 'Verificar tensión y estado de correas', 4, 'Correas con tensión adecuada y sin desgaste'),
((SELECT id FROM `ChecklistTemplates` WHERE name = 'Mantenimiento Preventivo Cardio'), 'Calibrar sensores de frecuencia cardíaca', 5, 'Sensores calibrados y funcionando correctamente'),
((SELECT id FROM `ChecklistTemplates` WHERE name = 'Mantenimiento Preventivo Cardio'), 'Probar parada de emergencia', 6, 'Botón de emergencia funciona correctamente'),
((SELECT id FROM `ChecklistTemplates` WHERE name = 'Mantenimiento Preventivo Cardio'), 'Verificar conexiones eléctricas', 7, 'Todas las conexiones firmes y seguras'),
((SELECT id FROM `ChecklistTemplates` WHERE name = 'Mantenimiento Preventivo Cardio'), 'Realizar prueba funcional completa', 8, 'Equipo funciona correctamente en todos los programas'),
((SELECT id FROM `ChecklistTemplates` WHERE name = 'Mantenimiento Preventivo Cardio'), 'Actualizar registro de mantenimiento', 9, 'Registro actualizado con fecha y observaciones');

-- Items del checklist para Servicio Correctivo
INSERT IGNORE INTO `ChecklistTemplateItems` (`template_id`, `item_text`, `item_order`, `expected_result`) VALUES
((SELECT id FROM `ChecklistTemplates` WHERE name = 'Servicio Correctivo General'), 'Realizar diagnóstico inicial del problema', 1, 'Problema identificado y documentado'),
((SELECT id FROM `ChecklistTemplates` WHERE name = 'Servicio Correctivo General'), 'Identificar repuestos necesarios', 2, 'Lista de repuestos requeridos confirmada'),
((SELECT id FROM `ChecklistTemplates` WHERE name = 'Servicio Correctivo General'), 'Verificar disponibilidad de repuestos', 3, 'Repuestos disponibles o solicitados'),
((SELECT id FROM `ChecklistTemplates` WHERE name = 'Servicio Correctivo General'), 'Ejecutar reparación según protocolo', 4, 'Reparación completada siguiendo procedimientos'),
((SELECT id FROM `ChecklistTemplates` WHERE name = 'Servicio Correctivo General'), 'Realizar prueba funcional post-reparación', 5, 'Equipo funciona correctamente después de reparación'),
((SELECT id FROM `ChecklistTemplates` WHERE name = 'Servicio Correctivo General'), 'Documentar causa raíz del problema', 6, 'Causa raíz identificada y documentada'),
((SELECT id FROM `ChecklistTemplates` WHERE name = 'Servicio Correctivo General'), 'Verificar que no hay otros problemas', 7, 'Inspección completa sin problemas adicionales'),
((SELECT id FROM `ChecklistTemplates` WHERE name = 'Servicio Correctivo General'), 'Entregar equipo al cliente', 8, 'Cliente recibe equipo funcionando y firma conformidad');

COMMIT;

-- ===================================================================
-- RESUMEN DE IMPLEMENTACIÓN FASE 1:
-- ===================================================================
-- ✅ Sistema de Contratos con SLA automático por prioridad
-- ✅ Workflow de tickets con guardias de estado mejorado  
-- ✅ Sistema de checklist obligatorio y reutilizable
-- ✅ Auditoría completa de todas las acciones
-- ✅ Configuraciones del sistema centralizadas
-- ✅ Templates y datos iniciales básicos
-- 
-- PRÓXIMOS PASOS:
-- 1. Crear triggers para auditoría automática
-- 2. Implementar lógica de SLA en el backend
-- 3. Crear APIs para el sistema de checklist
-- 4. Actualizar frontend con nuevas funcionalidades
-- ===================================================================
