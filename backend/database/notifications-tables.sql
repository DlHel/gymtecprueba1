-- ===================================================================
-- GYMTEC ERP - SISTEMA DE NOTIFICACIONES INTELIGENTES v2.0
-- ===================================================================
-- Archivo: notifications-tables.sql
-- Fecha: 2025-09-20
-- Propósito: Crear tablas para sistema de notificaciones correlacionado con tickets
-- ===================================================================

-- ===================================================================
-- 1. TABLA PRINCIPAL DE TEMPLATES DE NOTIFICACIONES
-- ===================================================================

CREATE TABLE IF NOT EXISTS `NotificationTemplates` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL COMMENT 'Nombre del template',
    `type` ENUM('email', 'sms', 'push', 'in_app', 'webhook') DEFAULT 'email',
    `trigger_event` ENUM(
        'ticket_created', 
        'ticket_updated', 
        'ticket_overdue', 
        'sla_warning', 
        'sla_breach',
        'maintenance_due',
        'maintenance_overdue',
        'equipment_warranty_expiring',
        'status_change',
        'assignment_change',
        'priority_escalation'
    ) NOT NULL COMMENT 'Evento que dispara la notificación',
    
    -- Contenido del mensaje
    `subject_template` VARCHAR(255) NOT NULL,
    `body_template` TEXT NOT NULL,
    
    -- Configuración de destinatarios
    `recipients_roles` JSON COMMENT 'Roles que reciben la notificación: ["admin", "manager", "technician"]',
    `recipients_emails` JSON COMMENT 'Emails específicos adicionales',
    
    -- Condiciones de activación
    `conditions` JSON COMMENT 'Condiciones para activar: {"priority": ["Alta", "Urgente"], "status": ["Abierto"]}',
    
    -- Configuración de tiempo
    `trigger_delay_minutes` INT DEFAULT 0 COMMENT 'Minutos de retraso antes de enviar',
    `trigger_before_hours` INT DEFAULT NULL COMMENT 'Horas antes del evento (para warnings)',
    
    -- Estado y metadatos
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_by` INT(11),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`id`),
    FOREIGN KEY (`created_by`) REFERENCES `Users` (`id`) ON DELETE SET NULL,
    UNIQUE KEY `unique_template_event` (`name`, `trigger_event`),
    INDEX `idx_templates_event` (`trigger_event`),
    INDEX `idx_templates_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Templates de notificaciones para diferentes eventos';

-- ===================================================================
-- 2. COLA DE NOTIFICACIONES PENDIENTES
-- ===================================================================

CREATE TABLE IF NOT EXISTS `NotificationQueue` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `template_id` INT(11) NOT NULL,
    
    -- Correlación con entidades
    `related_entity_type` ENUM('ticket', 'equipment', 'client', 'user', 'contract') NOT NULL,
    `related_entity_id` INT(11) NOT NULL COMMENT 'ID de la entidad relacionada',
    `ticket_id` INT(11) DEFAULT NULL COMMENT 'Referencia directa al ticket si aplica',
    
    -- Contenido de la notificación (procesado desde template)
    `type` ENUM('email', 'sms', 'push', 'in_app', 'webhook') NOT NULL,
    `priority` ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    `subject` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `recipients` JSON NOT NULL COMMENT 'Lista de destinatarios con sus métodos de contacto',
    
    -- Programación y estado
    `status` ENUM('pending', 'scheduled', 'processing', 'sent', 'failed', 'cancelled') DEFAULT 'pending',
    `scheduled_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Cuándo debe enviarse',
    `attempts` INT DEFAULT 0 COMMENT 'Número de intentos de envío',
    `max_attempts` INT DEFAULT 3,
    
    -- Metadatos
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `processed_at` TIMESTAMP NULL,
    `error_message` TEXT COMMENT 'Mensaje de error si falla el envío',
    
    PRIMARY KEY (`id`),
    FOREIGN KEY (`template_id`) REFERENCES `NotificationTemplates` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`ticket_id`) REFERENCES `Tickets` (`id`) ON DELETE CASCADE,
    
    INDEX `idx_queue_status` (`status`),
    INDEX `idx_queue_scheduled` (`scheduled_at`),
    INDEX `idx_queue_ticket` (`ticket_id`),
    INDEX `idx_queue_entity` (`related_entity_type`, `related_entity_id`),
    INDEX `idx_queue_priority` (`priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cola de notificaciones pendientes de envío';

-- ===================================================================
-- 3. LOG DE NOTIFICACIONES ENVIADAS
-- ===================================================================

CREATE TABLE IF NOT EXISTS `NotificationLogs` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `queue_id` INT(11) DEFAULT NULL COMMENT 'Referencia a la cola original',
    `template_id` INT(11),
    
    -- Correlación con entidades
    `related_entity_type` ENUM('ticket', 'equipment', 'client', 'user', 'contract') NOT NULL,
    `related_entity_id` INT(11) NOT NULL,
    `ticket_id` INT(11) DEFAULT NULL,
    
    -- Contenido enviado
    `type` ENUM('email', 'sms', 'push', 'in_app', 'webhook') NOT NULL,
    `priority` ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `recipients` JSON NOT NULL,
    
    -- Estado del envío
    `status` ENUM('sent', 'delivered', 'failed', 'bounced') NOT NULL,
    `sent_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `delivered_at` TIMESTAMP NULL,
    `failed_at` TIMESTAMP NULL,
    `bounce_reason` VARCHAR(255) DEFAULT NULL,
    
    -- Metadatos de envío
    `provider` VARCHAR(50) COMMENT 'Proveedor usado (SendGrid, AWS SES, etc.)',
    `provider_message_id` VARCHAR(255) COMMENT 'ID del mensaje del proveedor',
    `response_data` JSON COMMENT 'Respuesta completa del proveedor',
    
    PRIMARY KEY (`id`),
    FOREIGN KEY (`queue_id`) REFERENCES `NotificationQueue` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`template_id`) REFERENCES `NotificationTemplates` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`ticket_id`) REFERENCES `Tickets` (`id`) ON DELETE CASCADE,
    
    INDEX `idx_logs_status` (`status`),
    INDEX `idx_logs_sent` (`sent_at`),
    INDEX `idx_logs_ticket` (`ticket_id`),
    INDEX `idx_logs_entity` (`related_entity_type`, `related_entity_id`),
    INDEX `idx_logs_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Historial de notificaciones enviadas';

-- ===================================================================
-- 4. CONFIGURACIÓN DE EVENTOS DE NOTIFICACIÓN
-- ===================================================================

CREATE TABLE IF NOT EXISTS `NotificationEvents` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `entity_type` ENUM('ticket', 'equipment', 'client', 'user', 'contract') NOT NULL,
    `entity_id` INT(11) NOT NULL,
    `event_type` VARCHAR(50) NOT NULL COMMENT 'Tipo de evento que ocurrió',
    `event_data` JSON COMMENT 'Datos del evento (cambios, valores anteriores, etc.)',
    `triggered_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `processed` BOOLEAN DEFAULT FALSE COMMENT 'Si ya se procesó para notificaciones',
    
    PRIMARY KEY (`id`),
    INDEX `idx_events_entity` (`entity_type`, `entity_id`),
    INDEX `idx_events_type` (`event_type`),
    INDEX `idx_events_processed` (`processed`),
    INDEX `idx_events_triggered` (`triggered_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de eventos para disparar notificaciones';

-- ===================================================================
-- 5. PREFERENCIAS DE NOTIFICACIÓN POR USUARIO
-- ===================================================================

CREATE TABLE IF NOT EXISTS `UserNotificationPreferences` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `user_id` INT(11) NOT NULL,
    `notification_type` ENUM(
        'ticket_created', 
        'ticket_updated', 
        'ticket_overdue', 
        'sla_warning', 
        'sla_breach',
        'maintenance_due',
        'maintenance_overdue',
        'equipment_warranty_expiring',
        'status_change',
        'assignment_change',
        'priority_escalation'
    ) NOT NULL,
    `delivery_method` ENUM('email', 'sms', 'push', 'in_app') NOT NULL,
    `is_enabled` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`id`),
    FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_user_notification` (`user_id`, `notification_type`, `delivery_method`),
    INDEX `idx_preferences_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Preferencias de notificación por usuario';

-- ===================================================================
-- 6. INSERTAR TEMPLATES PREDETERMINADOS
-- ===================================================================

INSERT INTO `NotificationTemplates` (
    `name`, `type`, `trigger_event`, `subject_template`, `body_template`, 
    `recipients_roles`, `trigger_before_hours`, `is_active`
) VALUES

-- Template para nuevo ticket
('Nuevo Ticket Creado', 'email', 'ticket_created', 
 'Nuevo Ticket #{ticket_id}: {ticket_title}',
 'Se ha creado un nuevo ticket:\n\nID: #{ticket_id}\nTítulo: {ticket_title}\nPrioridad: {ticket_priority}\nCliente: {client_name}\nEquipo: {equipment_name}\nDescripción: {ticket_description}\n\nAsignado a: {assigned_technician}\nFecha de vencimiento: {due_date}',
 '["admin", "manager", "technician"]', NULL, TRUE),

-- Template para SLA Warning  
('Advertencia SLA - Ticket por Vencer', 'email', 'sla_warning',
 'ADVERTENCIA SLA: Ticket #{ticket_id} vence en {hours_remaining} horas',
 'ATENCIÓN: El siguiente ticket está próximo a vencer su SLA:\n\nID: #{ticket_id}\nTítulo: {ticket_title}\nCliente: {client_name}\nTiempo restante: {hours_remaining} horas\nFecha límite: {due_date}\n\nPor favor, tome las acciones necesarias.',
 '["admin", "manager"]', 4, TRUE),

-- Template para SLA Breach
('Incumplimiento SLA - Ticket Vencido', 'email', 'sla_breach',
 'URGENTE: Ticket #{ticket_id} ha excedido el SLA',
 'ALERTA CRÍTICA: El siguiente ticket ha excedido su SLA:\n\nID: #{ticket_id}\nTítulo: {ticket_title}\nCliente: {client_name}\nFecha de vencimiento: {due_date}\nTiempo excedido: {hours_overdue} horas\n\nAcción inmediata requerida.',
 '["admin", "manager"]', NULL, TRUE),

-- Template para mantenimiento preventivo
('Mantenimiento Preventivo Programado', 'email', 'maintenance_due',
 'Mantenimiento Preventivo: {equipment_name}',
 'Es hora de realizar mantenimiento preventivo al siguiente equipo:\n\nEquipo: {equipment_name}\nUbicación: {location_name}\nÚltimo mantenimiento: {last_maintenance_date}\nCliente: {client_name}\n\nPor favor, programe el mantenimiento.',
 '["admin", "manager", "technician"]', 72, TRUE),

-- Template para cambio de estado
('Cambio de Estado - Ticket #{ticket_id}', 'email', 'status_change',
 'Ticket #{ticket_id}: Estado cambiado a {new_status}',
 'El estado del ticket ha cambiado:\n\nID: #{ticket_id}\nTítulo: {ticket_title}\nEstado anterior: {old_status}\nNuevo estado: {new_status}\nCambiado por: {changed_by}\nFecha: {change_date}',
 '["admin", "manager"]', NULL, TRUE),

-- Template para asignación
('Ticket Asignado', 'email', 'assignment_change',
 'Ticket #{ticket_id} asignado: {ticket_title}',
 'Se le ha asignado un nuevo ticket:\n\nID: #{ticket_id}\nTítulo: {ticket_title}\nPrioridad: {ticket_priority}\nCliente: {client_name}\nDescripción: {ticket_description}\n\nFecha límite: {due_date}',
 '["technician"]', NULL, TRUE);

-- ===================================================================
-- 7. CONFIGURAR PREFERENCIAS PREDETERMINADAS PARA ROLES
-- ===================================================================

-- Insertar preferencias por defecto para usuarios existentes
INSERT INTO `UserNotificationPreferences` (`user_id`, `notification_type`, `delivery_method`, `is_enabled`)
SELECT 
    u.id, 
    'ticket_created', 
    'email', 
    CASE 
        WHEN u.role IN ('admin', 'manager') THEN TRUE 
        ELSE FALSE 
    END
FROM `Users` u
WHERE NOT EXISTS (
    SELECT 1 FROM `UserNotificationPreferences` unp 
    WHERE unp.user_id = u.id AND unp.notification_type = 'ticket_created'
);

INSERT INTO `UserNotificationPreferences` (`user_id`, `notification_type`, `delivery_method`, `is_enabled`)
SELECT 
    u.id, 
    'sla_warning', 
    'email', 
    CASE 
        WHEN u.role IN ('admin', 'manager') THEN TRUE 
        ELSE FALSE 
    END
FROM `Users` u
WHERE NOT EXISTS (
    SELECT 1 FROM `UserNotificationPreferences` unp 
    WHERE unp.user_id = u.id AND unp.notification_type = 'sla_warning'
);

INSERT INTO `UserNotificationPreferences` (`user_id`, `notification_type`, `delivery_method`, `is_enabled`)
SELECT 
    u.id, 
    'assignment_change', 
    'email', 
    TRUE
FROM `Users` u
WHERE u.role = 'technician'
AND NOT EXISTS (
    SELECT 1 FROM `UserNotificationPreferences` unp 
    WHERE unp.user_id = u.id AND unp.notification_type = 'assignment_change'
);

-- ===================================================================
-- 8. ÍNDICES ADICIONALES PARA PERFORMANCE
-- ===================================================================

-- Índices compuestos para consultas frecuentes
CREATE INDEX `idx_queue_status_scheduled` ON `NotificationQueue` (`status`, `scheduled_at`);
CREATE INDEX `idx_logs_entity_date` ON `NotificationLogs` (`related_entity_type`, `related_entity_id`, `sent_at`);
CREATE INDEX `idx_events_entity_processed` ON `NotificationEvents` (`entity_type`, `entity_id`, `processed`);

-- ===================================================================
-- 9. COMENTARIOS Y DOCUMENTACIÓN
-- ===================================================================

-- Comentario en tablas para documentar el sistema
ALTER TABLE `NotificationTemplates` COMMENT = 'Templates reutilizables para diferentes tipos de notificaciones del sistema';
ALTER TABLE `NotificationQueue` COMMENT = 'Cola de notificaciones pendientes de envío, procesada por trabajadores en background';
ALTER TABLE `NotificationLogs` COMMENT = 'Historial completo de notificaciones enviadas con seguimiento de entrega';
ALTER TABLE `NotificationEvents` COMMENT = 'Log de eventos del sistema que pueden disparar notificaciones';
ALTER TABLE `UserNotificationPreferences` COMMENT = 'Preferencias individuales de cada usuario para recibir notificaciones';

-- ===================================================================
-- RESUMEN DE CORRELACIONES CON TICKETS:
-- ===================================================================
-- 1. ticket_created -> Se dispara al crear un ticket
-- 2. ticket_updated -> Se dispara al actualizar campos importantes
-- 3. ticket_overdue -> Se dispara cuando due_date < NOW()
-- 4. sla_warning -> Se dispara X horas antes de due_date
-- 5. sla_breach -> Se dispara cuando se excede due_date
-- 6. maintenance_due -> Se dispara basado en last_maintenance_date del equipo
-- 7. status_change -> Se dispara al cambiar status del ticket
-- 8. assignment_change -> Se dispara al cambiar assigned_technician_id
-- 9. priority_escalation -> Se dispara al cambiar priority a Mayor nivel
-- ===================================================================

SELECT 'Tablas de notificaciones creadas exitosamente' AS status;