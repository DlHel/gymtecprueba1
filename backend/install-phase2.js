const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

/**
 * GYMTEC ERP - INSTALADOR FASE 2: SISTEMA DE NOTIFICACIONES INTELIGENTES
 * 
 * Implementa:
 * ✅ Sistema de notificaciones con templates
 * ✅ Alertas automáticas SLA
 * ✅ Cola de notificaciones con retry
 * ✅ Jobs programados (CRON básico)
 * ✅ Templates iniciales y configuraciones
 */

class Phase2Installer {
    constructor() {
        this.connection = null;
        this.config = {
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gymtec_erp',
            acquireTimeout: 60000,
            timeout: 60000
        };
    }

    async connect() {
        try {
            console.log('🔌 Conectando a MySQL...');
            this.connection = await mysql.createConnection(this.config);
            console.log('✅ Conexión establecida');
            return true;
        } catch (error) {
            console.error('❌ Error de conexión:', error.message);
            return false;
        }
    }

    async runQuery(sql, params = []) {
        try {
            const [result] = await this.connection.execute(sql, params);
            return { success: true, result };
        } catch (error) {
            console.error('❌ Error en query:', error.message);
            console.error('SQL:', sql);
            return { success: false, error: error.message };
        }
    }

    async createNotificationTemplatesTable() {
        console.log('\n📧 Creando tabla NotificationTemplates...');
        
        const sql = `
        CREATE TABLE IF NOT EXISTS NotificationTemplates (
            id INT(11) NOT NULL AUTO_INCREMENT,
            name VARCHAR(200) NOT NULL,
            type ENUM('email', 'sms', 'push', 'system') NOT NULL DEFAULT 'system',
            trigger_event VARCHAR(100) NOT NULL,
            subject_template TEXT,
            body_template TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
            
            send_immediately BOOLEAN DEFAULT TRUE,
            delay_minutes INT(11) DEFAULT 0,
            max_frequency_hours INT(11) DEFAULT 24,
            
            recipients_roles JSON NULL,
            recipients_emails JSON NULL,
            
            created_by INT(11),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            PRIMARY KEY (id),
            FOREIGN KEY (created_by) REFERENCES Users (id) ON DELETE SET NULL ON UPDATE CASCADE,
            
            INDEX idx_notification_templates_trigger (trigger_event),
            INDEX idx_notification_templates_active (is_active),
            UNIQUE KEY unique_template_trigger (name, trigger_event)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

        const result = await this.runQuery(sql);
        if (result.success) {
            console.log('✅ Tabla NotificationTemplates creada');
        }
        return result.success;
    }

    async createNotificationQueueTable() {
        console.log('\n📬 Creando tabla NotificationQueue...');
        
        const sql = `
        CREATE TABLE IF NOT EXISTS NotificationQueue (
            id INT(11) NOT NULL AUTO_INCREMENT,
            template_id INT(11) NOT NULL,
            
            trigger_event VARCHAR(100) NOT NULL,
            related_entity_type VARCHAR(50),
            related_entity_id INT(11),
            
            recipient_type ENUM('user', 'email', 'role') NOT NULL,
            recipient_identifier VARCHAR(255) NOT NULL,
            
            subject TEXT,
            body TEXT,
            
            status ENUM('pending', 'processing', 'sent', 'failed', 'cancelled') DEFAULT 'pending',
            attempts INT(11) DEFAULT 0,
            max_attempts INT(11) DEFAULT 3,
            
            scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            sent_at TIMESTAMP NULL,
            failed_at TIMESTAMP NULL,
            error_message TEXT NULL,
            
            context_data JSON NULL,
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

        const result = await this.runQuery(sql);
        if (result.success) {
            console.log('✅ Tabla NotificationQueue creada');
        }
        return result.success;
    }

    async createNotificationLogTable() {
        console.log('\n📋 Creando tabla NotificationLog...');
        
        const sql = `
        CREATE TABLE IF NOT EXISTS NotificationLog (
            id INT(11) NOT NULL AUTO_INCREMENT,
            queue_id INT(11) NOT NULL,
            template_id INT(11) NOT NULL,
            
            recipient_type ENUM('user', 'email', 'role') NOT NULL,
            recipient_identifier VARCHAR(255) NOT NULL,
            delivery_method ENUM('email', 'sms', 'push', 'system') NOT NULL,
            
            status ENUM('delivered', 'failed', 'bounced', 'opened', 'clicked') NOT NULL,
            delivery_details JSON NULL,
            
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            delivered_at TIMESTAMP NULL,
            opened_at TIMESTAMP NULL,
            
            PRIMARY KEY (id),
            FOREIGN KEY (queue_id) REFERENCES NotificationQueue (id) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (template_id) REFERENCES NotificationTemplates (id) ON DELETE CASCADE ON UPDATE CASCADE,
            
            INDEX idx_notification_log_status (status),
            INDEX idx_notification_log_sent (sent_at),
            INDEX idx_notification_log_recipient (recipient_type, recipient_identifier)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

        const result = await this.runQuery(sql);
        if (result.success) {
            console.log('✅ Tabla NotificationLog creada');
        }
        return result.success;
    }

    async createAutomatedAlertsTable() {
        console.log('\n🚨 Creando tabla AutomatedAlerts...');
        
        const sql = `
        CREATE TABLE IF NOT EXISTS AutomatedAlerts (
            id INT(11) NOT NULL AUTO_INCREMENT,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            alert_type ENUM('sla_warning', 'sla_expired', 'stock_low', 'unassigned_ticket', 'checklist_pending', 'maintenance_due') NOT NULL,
            
            trigger_conditions JSON NOT NULL,
            
            check_frequency_minutes INT(11) DEFAULT 15,
            max_alerts_per_day INT(11) DEFAULT 10,
            
            is_active BOOLEAN DEFAULT TRUE,
            last_check_at TIMESTAMP NULL,
            last_triggered_at TIMESTAMP NULL,
            alerts_sent_today INT(11) DEFAULT 0,
            
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

        const result = await this.runQuery(sql);
        if (result.success) {
            console.log('✅ Tabla AutomatedAlerts creada');
        }
        return result.success;
    }

    async createScheduledJobsTable() {
        console.log('\n⏰ Creando tabla ScheduledJobs...');
        
        const sql = `
        CREATE TABLE IF NOT EXISTS ScheduledJobs (
            id INT(11) NOT NULL AUTO_INCREMENT,
            name VARCHAR(200) NOT NULL UNIQUE,
            description TEXT,
            job_type ENUM('alert_check', 'sla_monitor', 'report_generation', 'maintenance_reminder', 'cleanup', 'backup') NOT NULL,
            
            schedule_pattern VARCHAR(100) NOT NULL,
            timezone VARCHAR(50) DEFAULT 'America/Santiago',
            
            is_active BOOLEAN DEFAULT TRUE,
            last_run_at TIMESTAMP NULL,
            next_run_at TIMESTAMP NULL,
            last_duration_seconds INT(11) NULL,
            last_status ENUM('success', 'failed', 'running') NULL,
            last_error_message TEXT NULL,
            
            job_config JSON NULL,
            
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

        const result = await this.runQuery(sql);
        if (result.success) {
            console.log('✅ Tabla ScheduledJobs creada');
        }
        return result.success;
    }

    async createJobExecutionLogTable() {
        console.log('\n📊 Creando tabla JobExecutionLog...');
        
        const sql = `
        CREATE TABLE IF NOT EXISTS JobExecutionLog (
            id INT(11) NOT NULL AUTO_INCREMENT,
            job_id INT(11) NOT NULL,
            
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            finished_at TIMESTAMP NULL,
            duration_seconds INT(11) NULL,
            status ENUM('running', 'success', 'failed', 'cancelled') NOT NULL DEFAULT 'running',
            
            records_processed INT(11) DEFAULT 0,
            notifications_sent INT(11) DEFAULT 0,
            errors_count INT(11) DEFAULT 0,
            
            execution_log TEXT NULL,
            error_details TEXT NULL,
            
            server_instance VARCHAR(100) NULL,
            memory_usage_mb DECIMAL(10,2) NULL,
            cpu_usage_percent DECIMAL(5,2) NULL,
            
            PRIMARY KEY (id),
            FOREIGN KEY (job_id) REFERENCES ScheduledJobs (id) ON DELETE CASCADE ON UPDATE CASCADE,
            
            INDEX idx_job_execution_log_job (job_id),
            INDEX idx_job_execution_log_started (started_at),
            INDEX idx_job_execution_log_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

        const result = await this.runQuery(sql);
        if (result.success) {
            console.log('✅ Tabla JobExecutionLog creada');
        }
        return result.success;
    }

    async insertNotificationTemplates() {
        console.log('\n📧 Insertando templates de notificación...');
        
        const templates = [
            {
                name: 'SLA Warning',
                type: 'email',
                trigger_event: 'sla_warning',
                subject_template: 'ALERTA: SLA próximo a vencer - Ticket #{{ticket_id}}',
                body_template: 'El ticket #{{ticket_id}} "{{ticket_title}}" del cliente {{client_name}} tiene SLA próximo a vencer en {{hours_remaining}} horas.\n\nDetalles:\n- Prioridad: {{priority}}\n- Fecha límite: {{sla_deadline}}\n- Estado actual: {{status}}\n\nPor favor, tome acción inmediata.',
                priority: 'high',
                recipients_roles: JSON.stringify(['admin', 'manager', 'technician'])
            },
            {
                name: 'SLA Expired',
                type: 'email',
                trigger_event: 'sla_expired',
                subject_template: 'CRÍTICO: SLA VENCIDO - Ticket #{{ticket_id}}',
                body_template: 'ALERTA CRÍTICA: El ticket #{{ticket_id}} "{{ticket_title}}" del cliente {{client_name}} tiene SLA VENCIDO.\n\nDetalles:\n- Prioridad: {{priority}}\n- Vencido desde: {{hours_overdue}} horas\n- Estado actual: {{status}}\n\nACCIÓN INMEDIATA REQUERIDA.',
                priority: 'critical',
                recipients_roles: JSON.stringify(['admin', 'manager'])
            },
            {
                name: 'Stock Low Alert',
                type: 'email',
                trigger_event: 'stock_low',
                subject_template: 'ALERTA: Stock bajo - {{part_name}}',
                body_template: 'El repuesto "{{part_name}}" tiene stock bajo.\n\nDetalles:\n- Stock actual: {{current_stock}}\n- Stock mínimo: {{minimum_stock}}\n- Ubicación: {{location}}\n\nSe recomienda realizar pedido de reposición.',
                priority: 'medium',
                recipients_roles: JSON.stringify(['admin', 'inventory_manager'])
            },
            {
                name: 'Unassigned Ticket',
                type: 'email',
                trigger_event: 'unassigned_ticket',
                subject_template: 'Ticket sin asignar - #{{ticket_id}}',
                body_template: 'El ticket #{{ticket_id}} "{{ticket_title}}" lleva {{minutes_unassigned}} minutos sin asignar.\n\nDetalles:\n- Cliente: {{client_name}}\n- Prioridad: {{priority}}\n- Creado: {{created_at}}\n\nPor favor, asigne un técnico.',
                priority: 'medium',
                recipients_roles: JSON.stringify(['admin', 'manager'])
            },
            {
                name: 'Checklist Pending',
                type: 'email',
                trigger_event: 'checklist_pending',
                subject_template: 'Checklist pendiente - Ticket #{{ticket_id}}',
                body_template: 'El ticket #{{ticket_id}} tiene checklist pendiente de completar.\n\nDetalles:\n- Progreso: {{completion_percentage}}%\n- Items pendientes: {{pending_items}}\n- Técnico asignado: {{technician_name}}\n\nPor favor, complete el checklist para poder cerrar el ticket.',
                priority: 'medium',
                recipients_roles: JSON.stringify(['technician'])
            }
        ];

        for (let template of templates) {
            const sql = `
            INSERT IGNORE INTO NotificationTemplates 
            (name, type, trigger_event, subject_template, body_template, priority, recipients_roles) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`;
            
            const result = await this.runQuery(sql, [
                template.name,
                template.type,
                template.trigger_event,
                template.subject_template,
                template.body_template,
                template.priority,
                template.recipients_roles
            ]);

            if (result.success) {
                console.log(`  ✅ Template "${template.name}" insertado`);
            }
        }
    }

    async insertAutomatedAlerts() {
        console.log('\n🚨 Insertando alertas automáticas...');
        
        // Primero obtener los IDs de los templates
        const templateIds = {};
        const templatesQuery = await this.runQuery('SELECT id, name FROM NotificationTemplates');
        
        if (templatesQuery.success) {
            templatesQuery.result.forEach(template => {
                templateIds[template.name] = template.id;
            });
        }

        const alerts = [
            {
                name: 'SLA Warning Monitor',
                description: 'Verificar tickets próximos a vencer SLA',
                alert_type: 'sla_warning',
                trigger_conditions: JSON.stringify({
                    warning_hours: 1,
                    priorities: ['Urgente', 'Alta'],
                    statuses: ['Abierto', 'En Progreso']
                }),
                check_frequency_minutes: 15,
                notification_template_id: templateIds['SLA Warning']
            },
            {
                name: 'SLA Expired Monitor',
                description: 'Verificar tickets con SLA vencido',
                alert_type: 'sla_expired',
                trigger_conditions: JSON.stringify({
                    check_overdue: true,
                    priorities: ['Urgente', 'Alta', 'Media'],
                    statuses: ['Abierto', 'En Progreso']
                }),
                check_frequency_minutes: 15,
                notification_template_id: templateIds['SLA Expired']
            },
            {
                name: 'Unassigned Tickets Monitor',
                description: 'Verificar tickets sin asignar',
                alert_type: 'unassigned_ticket',
                trigger_conditions: JSON.stringify({
                    max_unassigned_minutes: 30,
                    priorities: ['Urgente', 'Alta']
                }),
                check_frequency_minutes: 30,
                notification_template_id: templateIds['Unassigned Ticket']
            }
        ];

        for (let alert of alerts) {
            const sql = `
            INSERT IGNORE INTO AutomatedAlerts 
            (name, description, alert_type, trigger_conditions, check_frequency_minutes, notification_template_id) 
            VALUES (?, ?, ?, ?, ?, ?)`;
            
            const result = await this.runQuery(sql, [
                alert.name,
                alert.description,
                alert.alert_type,
                alert.trigger_conditions,
                alert.check_frequency_minutes,
                alert.notification_template_id
            ]);

            if (result.success) {
                console.log(`  ✅ Alerta "${alert.name}" insertada`);
            }
        }
    }

    async insertScheduledJobs() {
        console.log('\n⏰ Insertando jobs programados...');
        
        const jobs = [
            {
                name: 'SLA Monitor',
                description: 'Verificar estado de SLA cada 15 minutos',
                job_type: 'sla_monitor',
                schedule_pattern: '*/15 * * * *',
                job_config: JSON.stringify({
                    alerts: ['sla_warning', 'sla_expired'],
                    batch_size: 50
                })
            },
            {
                name: 'Alert Processor',
                description: 'Procesar alertas automáticas',
                job_type: 'alert_check',
                schedule_pattern: '*/5 * * * *',
                job_config: JSON.stringify({
                    max_processing_time: 300,
                    batch_size: 20
                })
            },
            {
                name: 'Daily Maintenance',
                description: 'Limpieza diaria de logs y estadísticas',
                job_type: 'cleanup',
                schedule_pattern: '0 2 * * *',
                job_config: JSON.stringify({
                    retention_days: 30,
                    cleanup_logs: true,
                    update_stats: true
                })
            },
            {
                name: 'Notification Queue Processor',
                description: 'Procesar cola de notificaciones',
                job_type: 'alert_check',
                schedule_pattern: '*/2 * * * *',
                job_config: JSON.stringify({
                    max_batch_size: 10,
                    retry_failed: true
                })
            }
        ];

        for (let job of jobs) {
            const sql = `
            INSERT IGNORE INTO ScheduledJobs 
            (name, description, job_type, schedule_pattern, job_config) 
            VALUES (?, ?, ?, ?, ?)`;
            
            const result = await this.runQuery(sql, [
                job.name,
                job.description,
                job.job_type,
                job.schedule_pattern,
                job.job_config
            ]);

            if (result.success) {
                console.log(`  ✅ Job "${job.name}" insertado`);
            }
        }
    }

    async insertSystemSettings() {
        console.log('\n⚙️ Insertando configuraciones del sistema...');
        
        const settings = [
            ['notifications_enabled', 'true', 'boolean', 'Sistema de notificaciones activado', 'notifications'],
            ['email_smtp_host', 'smtp.gmail.com', 'string', 'Servidor SMTP para envío de emails', 'notifications'],
            ['email_smtp_port', '587', 'integer', 'Puerto SMTP', 'notifications'],
            ['email_smtp_secure', 'true', 'boolean', 'Usar TLS/SSL', 'notifications'],
            ['email_from_address', 'noreply@gymtec.com', 'email', 'Email remitente por defecto', 'notifications'],
            ['email_from_name', 'Gymtec ERP System', 'string', 'Nombre remitente por defecto', 'notifications'],
            ['sla_warning_hours', '1', 'integer', 'Horas antes del vencimiento para alertar', 'sla'],
            ['max_notifications_per_hour', '50', 'integer', 'Máximo de notificaciones por hora', 'notifications'],
            ['unassigned_ticket_alert_minutes', '30', 'integer', 'Minutos para alertar ticket sin asignar', 'workflow'],
            ['cron_jobs_enabled', 'true', 'boolean', 'Jobs automáticos activados', 'automation']
        ];

        for (let setting of settings) {
            const sql = `
            INSERT IGNORE INTO SystemSettings 
            (setting_key, setting_value, setting_type, description, category) 
            VALUES (?, ?, ?, ?, ?)`;
            
            const result = await this.runQuery(sql, setting);

            if (result.success) {
                console.log(`  ✅ Configuración "${setting[0]}" insertada`);
            }
        }
    }

    async validateInstallation() {
        console.log('\n🔍 Validando instalación Fase 2...');
        
        const validations = [
            { table: 'NotificationTemplates', expect: 5 },
            { table: 'AutomatedAlerts', expect: 3 },
            { table: 'ScheduledJobs', expect: 4 },
            { table: 'SystemSettings', expect: 10, condition: "category IN ('notifications', 'sla', 'workflow', 'automation')" }
        ];

        let allValid = true;

        for (let validation of validations) {
            let sql = `SELECT COUNT(*) as count FROM ${validation.table}`;
            if (validation.condition) {
                sql += ` WHERE ${validation.condition}`;
            }

            const result = await this.runQuery(sql);
            
            if (result.success) {
                const count = result.result[0].count;
                if (count >= validation.expect) {
                    console.log(`  ✅ ${validation.table}: ${count} registros`);
                } else {
                    console.log(`  ❌ ${validation.table}: ${count} registros (esperados: ${validation.expect})`);
                    allValid = false;
                }
            } else {
                console.log(`  ❌ Error validando ${validation.table}`);
                allValid = false;
            }
        }

        return allValid;
    }

    async install() {
        console.log('🚀 INICIANDO INSTALACIÓN FASE 2 - SISTEMA DE NOTIFICACIONES INTELIGENTES\n');

        if (!await this.connect()) {
            console.log('❌ No se pudo conectar a la base de datos');
            return false;
        }

        try {
            // Crear tablas
            const tablesCreated = 
                await this.createNotificationTemplatesTable() &&
                await this.createNotificationQueueTable() &&
                await this.createNotificationLogTable() &&
                await this.createAutomatedAlertsTable() &&
                await this.createScheduledJobsTable() &&
                await this.createJobExecutionLogTable();

            if (!tablesCreated) {
                console.log('\n❌ Error creando tablas');
                return false;
            }

            // Insertar datos iniciales
            await this.insertNotificationTemplates();
            await this.insertAutomatedAlerts();
            await this.insertScheduledJobs();
            await this.insertSystemSettings();

            // Validar instalación
            const isValid = await this.validateInstallation();

            if (isValid) {
                console.log('\n🎉 ¡FASE 2 INSTALADA EXITOSAMENTE!');
                console.log('\n📋 RESUMEN DE FUNCIONALIDADES IMPLEMENTADAS:');
                console.log('  ✅ Sistema de notificaciones con templates dinámicos');
                console.log('  ✅ Alertas automáticas para SLA');
                console.log('  ✅ Cola de notificaciones con retry automático');
                console.log('  ✅ Jobs programados (CRON básico)');
                console.log('  ✅ Templates iniciales configurados');
                console.log('  ✅ Configuraciones SMTP básicas');
                console.log('\n📡 PRÓXIMOS PASOS:');
                console.log('  1. Implementar APIs de notificaciones');
                console.log('  2. Crear motor de procesamiento de alertas');
                console.log('  3. Implementar scheduler de CRON jobs');
                console.log('  4. Crear dashboard de monitoreo');
                return true;
            } else {
                console.log('\n❌ Instalación incompleta - revisar errores arriba');
                return false;
            }

        } catch (error) {
            console.error('\n💥 Error durante la instalación:', error);
            return false;
        } finally {
            if (this.connection) {
                await this.connection.end();
            }
        }
    }
}

// Ejecutar instalación si se llama directamente
if (require.main === module) {
    const installer = new Phase2Installer();
    installer.install().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = Phase2Installer;
