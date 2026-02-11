-- ===================================================================
-- GYMTEC ERP - SISTEMA DE ALERTAS Y JOBS AUTOMÁTICOS
-- ===================================================================
-- Archivo: automated-alerts-tables.sql
-- Fecha: 2026-02-05
-- Propósito: Crear tablas para alertas automáticas y jobs CRON
-- ===================================================================

-- ===================================================================
-- 1. TABLA DE ALERTAS AUTOMÁTICAS
-- ===================================================================

CREATE TABLE IF NOT EXISTS `AutomatedAlerts` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL COMMENT 'Nombre descriptivo de la alerta',
    `description` TEXT COMMENT 'Descripción detallada',
    `alert_type` ENUM(
        'sla_warning',
        'sla_expired',
        'unassigned_ticket',
        'checklist_pending',
        'stock_low',
        'maintenance_due',
        'contract_expiring'
    ) NOT NULL COMMENT 'Tipo de alerta',
    
    -- Configuración de disparo
    `trigger_conditions` JSON NOT NULL COMMENT 'Condiciones para disparar: {"warning_hours": 1, "priorities": ["Alta"]}',
    `check_frequency_minutes` INT DEFAULT 15 COMMENT 'Cada cuántos minutos verificar',
    
    -- Límites de envío
    `max_alerts_per_day` INT DEFAULT 10 COMMENT 'Máximo de alertas por día',
    `alerts_sent_today` INT DEFAULT 0 COMMENT 'Contador de alertas enviadas hoy',
    
    -- Relación con templates de notificación
    `notification_template_id` INT(11) COMMENT 'Template a usar para la notificación',
    
    -- Estado y tracking
    `is_active` BOOLEAN DEFAULT TRUE,
    `last_check_at` TIMESTAMP NULL COMMENT 'Última vez que se verificó',
    `last_triggered_at` TIMESTAMP NULL COMMENT 'Última vez que se disparó',
    
    -- Metadatos
    `created_by` INT(11),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`id`),
    FOREIGN KEY (`notification_template_id`) REFERENCES `NotificationTemplates` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`created_by`) REFERENCES `Users` (`id`) ON DELETE SET NULL,
    INDEX `idx_alerts_type` (`alert_type`),
    INDEX `idx_alerts_active` (`is_active`),
    INDEX `idx_alerts_last_check` (`last_check_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Configuración de alertas automáticas del sistema';

-- ===================================================================
-- 3. TABLA DE JOBS PROGRAMADOS
-- ===================================================================

CREATE TABLE IF NOT EXISTS `ScheduledJobs` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL COMMENT 'Nombre del job',
    `description` TEXT COMMENT 'Descripción del job',
    `job_type` ENUM(
        'sla_monitor',
        'alert_check',
        'cleanup',
        'report_generation',
        'maintenance_reminder',
        'backup'
    ) NOT NULL COMMENT 'Tipo de job',
    
    -- Configuración de ejecución
    `schedule_pattern` VARCHAR(50) NOT NULL COMMENT 'Patrón CRON: */15 * * * *',
    `timezone` VARCHAR(50) DEFAULT 'America/Santiago',
    `job_config` JSON COMMENT 'Configuración específica del job',
    
    -- Estadísticas de ejecución
    `is_active` BOOLEAN DEFAULT TRUE,
    `total_runs` INT DEFAULT 0,
    `successful_runs` INT DEFAULT 0,
    `failed_runs` INT DEFAULT 0,
    `last_run_at` TIMESTAMP NULL,
    `last_status` ENUM('pending', 'running', 'success', 'failed') DEFAULT 'pending',
    `last_duration_seconds` INT DEFAULT 0,
    `next_run_at` TIMESTAMP NULL,
    
    -- Metadatos
    `created_by` INT(11),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`id`),
    FOREIGN KEY (`created_by`) REFERENCES `Users` (`id`) ON DELETE SET NULL,
    UNIQUE KEY `unique_job_name` (`name`),
    INDEX `idx_jobs_active` (`is_active`),
    INDEX `idx_jobs_type` (`job_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Jobs programados del sistema';

-- ===================================================================
-- 4. TABLA DE LOG DE EJECUCIÓN DE JOBS
-- ===================================================================

CREATE TABLE IF NOT EXISTS `JobExecutionLog` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `job_id` INT(11) NOT NULL,
    `status` ENUM('running', 'success', 'failed') DEFAULT 'running',
    `started_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `finished_at` TIMESTAMP NULL,
    `duration_seconds` INT DEFAULT 0,
    `records_processed` INT DEFAULT 0,
    `notifications_sent` INT DEFAULT 0,
    `errors_count` INT DEFAULT 0,
    `error_details` TEXT,
    
    PRIMARY KEY (`id`),
    FOREIGN KEY (`job_id`) REFERENCES `ScheduledJobs` (`id`) ON DELETE CASCADE,
    INDEX `idx_log_job` (`job_id`),
    INDEX `idx_log_started` (`started_at`),
    INDEX `idx_log_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de ejecución de jobs programados';

-- ===================================================================
-- 5. INSERTAR ALERTAS PREDETERMINADAS
-- ===================================================================

-- Alerta: SLA próximo a vencer (1 hora antes)
INSERT INTO `AutomatedAlerts` (
    `name`, `description`, `alert_type`, `trigger_conditions`, 
    `check_frequency_minutes`, `max_alerts_per_day`, `notification_template_id`, `is_active`
) VALUES (
    'SLA Warning - 1 hora',
    'Alerta cuando un ticket está a 1 hora de vencer su SLA',
    'sla_warning',
    '{"warning_hours": 1, "priorities": ["Alta", "Crítica"], "statuses": ["Abierto", "En Progreso"]}',
    15,  -- Verificar cada 15 minutos
    50,  -- Máximo 50 alertas por día
    (SELECT id FROM NotificationTemplates WHERE trigger_event = 'sla_warning' LIMIT 1),
    TRUE
);

-- Alerta: SLA vencido
INSERT INTO `AutomatedAlerts` (
    `name`, `description`, `alert_type`, `trigger_conditions`, 
    `check_frequency_minutes`, `max_alerts_per_day`, `notification_template_id`, `is_active`
) VALUES (
    'SLA Breach',
    'Alerta cuando un ticket ha excedido su SLA',
    'sla_expired',
    '{"priorities": ["Alta", "Crítica", "Media"]}',
    15,
    100,
    (SELECT id FROM NotificationTemplates WHERE trigger_event = 'sla_breach' LIMIT 1),
    TRUE
);

-- Alerta: Ticket sin asignar por más de 30 minutos
INSERT INTO `AutomatedAlerts` (
    `name`, `description`, `alert_type`, `trigger_conditions`, 
    `check_frequency_minutes`, `max_alerts_per_day`, `notification_template_id`, `is_active`
) VALUES (
    'Ticket Sin Asignar',
    'Alerta cuando un ticket lleva más de 30 minutos sin técnico asignado',
    'unassigned_ticket',
    '{"max_unassigned_minutes": 30, "priorities": ["Alta", "Crítica"]}',
    10,
    30,
    (SELECT id FROM NotificationTemplates WHERE trigger_event = 'assignment_change' LIMIT 1),
    TRUE
);

-- ===================================================================
-- 6. INSERTAR JOBS PROGRAMADOS
-- ===================================================================

-- Job: Monitor de SLA (cada 15 minutos)
INSERT INTO `ScheduledJobs` (
    `name`, `description`, `job_type`, `schedule_pattern`, `job_config`, `is_active`
) VALUES (
    'SLA Monitor',
    'Monitoreo automático de SLA de tickets',
    'sla_monitor',
    '*/15 * * * *',  -- Cada 15 minutos
    '{"check_warnings": true, "check_expired": true}',
    TRUE
);

-- Job: Procesador de cola de notificaciones (cada 5 minutos)
INSERT INTO `ScheduledJobs` (
    `name`, `description`, `job_type`, `schedule_pattern`, `job_config`, `is_active`
) VALUES (
    'Notification Processor',
    'Procesa la cola de notificaciones pendientes y las marca como enviadas',
    'alert_check',
    '*/5 * * * *',  -- Cada 5 minutos
    '{"batch_size": 10}',
    TRUE
);

-- Job: Limpieza de logs (diario a las 3 AM)
INSERT INTO `ScheduledJobs` (
    `name`, `description`, `job_type`, `schedule_pattern`, `job_config`, `is_active`
) VALUES (
    'Log Cleanup',
    'Limpieza de logs antiguos del sistema',
    'cleanup',
    '0 3 * * *',  -- 3:00 AM diario
    '{"retention_days": 30}',
    TRUE
);
-- ===================================================================
-- RESUMEN DE CONFIGURACIÓN
-- ===================================================================
SELECT 'Tablas de alertas automáticas creadas exitosamente' AS status;
SELECT COUNT(*) AS total_alertas FROM AutomatedAlerts;
SELECT COUNT(*) AS total_jobs FROM ScheduledJobs;
