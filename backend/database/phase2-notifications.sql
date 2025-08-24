-- ===================================================================
-- GYMTEC ERP - FASE 2 AUTOMATIZACIÓN Y NOTIFICACIONES
-- Sistema de Notificaciones Inteligentes y Alertas Automáticas
-- ===================================================================
-- 
-- FUNCIONALIDADES IMPLEMENTADAS:
-- 1. Sistema de Notificaciones Inteligentes ⭐⭐⭐
-- 2. Alertas automáticas SLA ⭐⭐⭐⭐
-- 3. Notificaciones de stock bajo ⭐⭐⭐⭐
-- 4. CRON Jobs básicos ⭐⭐⭐
-- ===================================================================

USE gymtec_erp;

-- ===================================================================
-- 1. SISTEMA DE NOTIFICACIONES
-- ===================================================================

-- Tabla para gestionar notificaciones del sistema
CREATE TABLE IF NOT EXISTS NotificationTemplates (
    id INT(11) NOT NULL AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    type ENUM('email', 'sms', 'push', 'system') NOT NULL DEFAULT 'system',
    trigger_event VARCHAR(100) NOT NULL, -- sla_warning, sla_expired, stock_low, etc.
    subject_template TEXT,
    body_template TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    
    -- Configuración de envío
    send_immediately BOOLEAN DEFAULT TRUE,
    delay_minutes INT(11) DEFAULT 0,
    max_frequency_hours INT(11) DEFAULT 24, -- Evitar spam
    
    -- Destinatarios
    recipients_roles JSON NULL, -- ["admin", "technician", "manager"]
    recipients_emails JSON NULL, -- ["email1@example.com", "email2@example.com"]
    
    created_by INT(11),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    FOREIGN KEY (created_by) REFERENCES Users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    
    INDEX idx_notification_templates_trigger (trigger_event),
    INDEX idx_notification_templates_active (is_active),
    UNIQUE KEY unique_template_trigger (name, trigger_event)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla para el queue de notificaciones
CREATE TABLE IF NOT EXISTS NotificationQueue (
    id INT(11) NOT NULL AUTO_INCREMENT,
    template_id INT(11) NOT NULL,
    
    -- Datos del trigger
    trigger_event VARCHAR(100) NOT NULL,
    related_entity_type VARCHAR(50), -- 'ticket', 'client', 'spare_part', etc.
    related_entity_id INT(11),
    
    -- Datos del destinatario
    recipient_type ENUM('user', 'email', 'role') NOT NULL,
    recipient_identifier VARCHAR(255) NOT NULL, -- user_id, email, or role name
    
    -- Contenido procesado
    subject TEXT,
    body TEXT,
    
    -- Estado de envío
    status ENUM('pending', 'processing', 'sent', 'failed', 'cancelled') DEFAULT 'pending',
    attempts INT(11) DEFAULT 0,
    max_attempts INT(11) DEFAULT 3,
    
    -- Programación
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    failed_at TIMESTAMP NULL,
    error_message TEXT NULL,
    
    -- Metadata
    context_data JSON NULL, -- Datos adicionales para el template
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    FOREIGN KEY (template_id) REFERENCES NotificationTemplates (id) ON DELETE CASCADE ON UPDATE CASCADE,
    
    INDEX idx_notification_queue_status (status),
    INDEX idx_notification_queue_scheduled (scheduled_at),
    INDEX idx_notification_queue_priority (priority),
    INDEX idx_notification_queue_entity (related_entity_type, related_entity_id),
    INDEX idx_notification_queue_recipient (recipient_type, recipient_identifier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Log de notificaciones enviadas
CREATE TABLE IF NOT EXISTS NotificationLog (
    id INT(11) NOT NULL AUTO_INCREMENT,
    queue_id INT(11) NOT NULL,
    template_id INT(11) NOT NULL,
    
    -- Datos del envío
    recipient_type ENUM('user', 'email', 'role') NOT NULL,
    recipient_identifier VARCHAR(255) NOT NULL,
    delivery_method ENUM('email', 'sms', 'push', 'system') NOT NULL,
    
    -- Resultado del envío
    status ENUM('delivered', 'failed', 'bounced', 'opened', 'clicked') NOT NULL,
    delivery_details JSON NULL, -- Detalles del proveedor de envío
    
    -- Timestamps
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP NULL,
    opened_at TIMESTAMP NULL,
    
    PRIMARY KEY (id),
    FOREIGN KEY (queue_id) REFERENCES NotificationQueue (id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (template_id) REFERENCES NotificationTemplates (id) ON DELETE CASCADE ON UPDATE CASCADE,
    
    INDEX idx_notification_log_status (status),
    INDEX idx_notification_log_sent (sent_at),
    INDEX idx_notification_log_recipient (recipient_type, recipient_identifier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 2. SISTEMA DE ALERTAS AUTOMÁTICAS
-- ===================================================================

-- Tabla para configurar alertas automáticas
CREATE TABLE IF NOT EXISTS AutomatedAlerts (
    id INT(11) NOT NULL AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    alert_type ENUM('sla_warning', 'sla_expired', 'stock_low', 'unassigned_ticket', 'checklist_pending', 'maintenance_due') NOT NULL,
    
    -- Condiciones de trigger
    trigger_conditions JSON NOT NULL, -- Condiciones específicas para cada tipo
    
    -- Configuración de frecuencia
    check_frequency_minutes INT(11) DEFAULT 15, -- Cada cuanto verificar
    max_alerts_per_day INT(11) DEFAULT 10, -- Máximo por día para evitar spam
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    last_check_at TIMESTAMP NULL,
    last_triggered_at TIMESTAMP NULL,
    alerts_sent_today INT(11) DEFAULT 0,
    
    -- Template de notificación
    notification_template_id INT(11),
    
    created_by INT(11),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    FOREIGN KEY (notification_template_id) REFERENCES NotificationTemplates (id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (created_by) REFERENCES Users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    
    INDEX idx_automated_alerts_type (alert_type),
    INDEX idx_automated_alerts_active (is_active),
    INDEX idx_automated_alerts_check (last_check_at),
    UNIQUE KEY unique_alert_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 3. CONFIGURACIONES PARA CRON JOBS
-- ===================================================================

-- Tabla para gestionar jobs programados
CREATE TABLE IF NOT EXISTS ScheduledJobs (
    id INT(11) NOT NULL AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    job_type ENUM('alert_check', 'sla_monitor', 'report_generation', 'maintenance_reminder', 'cleanup', 'backup') NOT NULL,
    
    -- Configuración de programación (cron-like)
    schedule_pattern VARCHAR(100) NOT NULL, -- "*/15 * * * *" para cada 15 minutos
    timezone VARCHAR(50) DEFAULT 'America/Santiago',
    
    -- Estado del job
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMP NULL,
    next_run_at TIMESTAMP NULL,
    last_duration_seconds INT(11) NULL,
    last_status ENUM('success', 'failed', 'running') NULL,
    last_error_message TEXT NULL,
    
    -- Configuración específica del job
    job_config JSON NULL,
    
    -- Estadísticas
    total_runs INT(11) DEFAULT 0,
    successful_runs INT(11) DEFAULT 0,
    failed_runs INT(11) DEFAULT 0,
    
    created_by INT(11),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    FOREIGN KEY (created_by) REFERENCES Users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    
    INDEX idx_scheduled_jobs_active (is_active),
    INDEX idx_scheduled_jobs_next_run (next_run_at),
    INDEX idx_scheduled_jobs_type (job_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Log de ejecución de jobs
CREATE TABLE IF NOT EXISTS JobExecutionLog (
    id INT(11) NOT NULL AUTO_INCREMENT,
    job_id INT(11) NOT NULL,
    
    -- Datos de la ejecución
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP NULL,
    duration_seconds INT(11) NULL,
    status ENUM('running', 'success', 'failed', 'cancelled') NOT NULL DEFAULT 'running',
    
    -- Resultados
    records_processed INT(11) DEFAULT 0,
    notifications_sent INT(11) DEFAULT 0,
    errors_count INT(11) DEFAULT 0,
    
    -- Logs y errores
    execution_log TEXT NULL,
    error_details TEXT NULL,
    
    -- Metadata
    server_instance VARCHAR(100) NULL, -- Para identificar qué servidor ejecutó el job
    memory_usage_mb DECIMAL(10,2) NULL,
    cpu_usage_percent DECIMAL(5,2) NULL,
    
    PRIMARY KEY (id),
    FOREIGN KEY (job_id) REFERENCES ScheduledJobs (id) ON DELETE CASCADE ON UPDATE CASCADE,
    
    INDEX idx_job_execution_log_job (job_id),
    INDEX idx_job_execution_log_started (started_at),
    INDEX idx_job_execution_log_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 4. DATOS INICIALES PARA NOTIFICACIONES
-- ===================================================================

-- Templates de notificación básicos
INSERT IGNORE INTO NotificationTemplates (name, type, trigger_event, subject_template, body_template, priority, recipients_roles) VALUES
('SLA Warning', 'email', 'sla_warning', 
 'ALERTA: SLA próximo a vencer - Ticket #{{ticket_id}}',
 'El ticket #{{ticket_id}} "{{ticket_title}}" del cliente {{client_name}} tiene SLA próximo a vencer en {{hours_remaining}} horas.\n\nDetalles:\n- Prioridad: {{priority}}\n- Fecha límite: {{sla_deadline}}\n- Estado actual: {{status}}\n\nPor favor, tome acción inmediata.',
 'high',
 '["admin", "manager", "technician"]'),

('SLA Expired', 'email', 'sla_expired',
 'CRÍTICO: SLA VENCIDO - Ticket #{{ticket_id}}',
 'ALERTA CRÍTICA: El ticket #{{ticket_id}} "{{ticket_title}}" del cliente {{client_name}} tiene SLA VENCIDO.\n\nDetalles:\n- Prioridad: {{priority}}\n- Vencido desde: {{hours_overdue}} horas\n- Estado actual: {{status}}\n\nACCIÓN INMEDIATA REQUERIDA.',
 'critical',
 '["admin", "manager"]'),

('Stock Low Alert', 'email', 'stock_low',
 'ALERTA: Stock bajo - {{part_name}}',
 'El repuesto "{{part_name}}" tiene stock bajo.\n\nDetalles:\n- Stock actual: {{current_stock}}\n- Stock mínimo: {{minimum_stock}}\n- Ubicación: {{location}}\n\nSe recomienda realizar pedido de reposición.',
 'medium',
 '["admin", "inventory_manager"]'),

('Unassigned Ticket', 'email', 'unassigned_ticket',
 'Ticket sin asignar - #{{ticket_id}}',
 'El ticket #{{ticket_id}} "{{ticket_title}}" lleva {{minutes_unassigned}} minutos sin asignar.\n\nDetalles:\n- Cliente: {{client_name}}\n- Prioridad: {{priority}}\n- Creado: {{created_at}}\n\nPor favor, asigne un técnico.',
 'medium',
 '["admin", "manager"]'),

('Checklist Pending', 'email', 'checklist_pending',
 'Checklist pendiente - Ticket #{{ticket_id}}',
 'El ticket #{{ticket_id}} tiene checklist pendiente de completar.\n\nDetalles:\n- Progreso: {{completion_percentage}}%\n- Items pendientes: {{pending_items}}\n- Técnico asignado: {{technician_name}}\n\nPor favor, complete el checklist para poder cerrar el ticket.',
 'medium',
 '["technician"]');

-- Alertas automáticas básicas
INSERT IGNORE INTO AutomatedAlerts (name, description, alert_type, trigger_conditions, check_frequency_minutes, notification_template_id) VALUES
('SLA Warning Monitor', 'Verificar tickets próximos a vencer SLA', 'sla_warning', 
 '{"warning_hours": 1, "priorities": ["Urgente", "Alta"], "statuses": ["Abierto", "En Progreso"]}',
 15,
 (SELECT id FROM NotificationTemplates WHERE name = 'SLA Warning')),

('SLA Expired Monitor', 'Verificar tickets con SLA vencido', 'sla_expired',
 '{"check_overdue": true, "priorities": ["Urgente", "Alta", "Media"], "statuses": ["Abierto", "En Progreso"]}',
 15,
 (SELECT id FROM NotificationTemplates WHERE name = 'SLA Expired')),

('Unassigned Tickets Monitor', 'Verificar tickets sin asignar', 'unassigned_ticket',
 '{"max_unassigned_minutes": 30, "priorities": ["Urgente", "Alta"]}',
 30,
 (SELECT id FROM NotificationTemplates WHERE name = 'Unassigned Ticket'));

-- Jobs programados básicos
INSERT IGNORE INTO ScheduledJobs (name, description, job_type, schedule_pattern, job_config) VALUES
('SLA Monitor', 'Verificar estado de SLA cada 15 minutos', 'sla_monitor', '*/15 * * * *',
 '{"alerts": ["sla_warning", "sla_expired"], "batch_size": 50}'),

('Alert Processor', 'Procesar alertas automáticas', 'alert_check', '*/5 * * * *',
 '{"max_processing_time": 300, "batch_size": 20}'),

('Daily Maintenance', 'Limpieza diaria de logs y estadísticas', 'cleanup', '0 2 * * *',
 '{"retention_days": 30, "cleanup_logs": true, "update_stats": true}'),

('Notification Queue Processor', 'Procesar cola de notificaciones', 'alert_check', '*/2 * * * *',
 '{"max_batch_size": 10, "retry_failed": true}');

-- Configuraciones adicionales del sistema
INSERT IGNORE INTO SystemSettings (setting_key, setting_value, setting_type, description, category) VALUES
('notifications_enabled', 'true', 'boolean', 'Sistema de notificaciones activado', 'notifications'),
('email_smtp_host', 'smtp.gmail.com', 'string', 'Servidor SMTP para envío de emails', 'notifications'),
('email_smtp_port', '587', 'integer', 'Puerto SMTP', 'notifications'),
('email_smtp_secure', 'true', 'boolean', 'Usar TLS/SSL', 'notifications'),
('email_from_address', 'noreply@gymtec.com', 'email', 'Email remitente por defecto', 'notifications'),
('email_from_name', 'Gymtec ERP System', 'string', 'Nombre remitente por defecto', 'notifications'),
('sla_warning_hours', '1', 'integer', 'Horas antes del vencimiento para alertar', 'sla'),
('max_notifications_per_hour', '50', 'integer', 'Máximo de notificaciones por hora', 'notifications'),
('unassigned_ticket_alert_minutes', '30', 'integer', 'Minutos para alertar ticket sin asignar', 'workflow'),
('cron_jobs_enabled', 'true', 'boolean', 'Jobs automáticos activados', 'automation');

COMMIT;

-- ===================================================================
-- RESUMEN DE IMPLEMENTACIÓN FASE 2:
-- ===================================================================
-- ✅ Sistema de notificaciones con templates dinámicos
-- ✅ Cola de notificaciones con retry automático
-- ✅ Alertas automáticas configurables
-- ✅ Jobs programados con logging detallado
-- ✅ Templates básicos para SLA, stock, tickets
-- ✅ Configuraciones del sistema para SMTP
-- 
-- PRÓXIMOS PASOS:
-- 1. Implementar APIs para gestión de notificaciones
-- 2. Crear motor de procesamiento de alertas
-- 3. Implementar scheduler para CRON jobs
-- 4. Crear dashboard de monitoreo de notificaciones
-- ===================================================================
