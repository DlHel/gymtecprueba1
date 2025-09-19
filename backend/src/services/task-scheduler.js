const cron = require('node-cron');
const DatabaseAdapter = require('../db-adapter');
const logger = require('./logger');
const db = require('../db-adapter');
const alertProcessor = require('./alert-processor');

/**
 * GYMTEC ERP - SCHEDULER DE TAREAS PROGRAMADAS
 * 
 * Funcionalidades:
 * ✅ Ejecutor de jobs tipo CRON
 * ✅ SLA monitoring automático
 * ✅ Procesamiento de alertas
 * ✅ Limpieza de logs automática
 * ✅ Estadísticas y logging detallado
 */

class TaskScheduler {
    constructor() {
        this.jobs = new Map();
        this.isInitialized = false;
        this.executionStats = {
            totalJobs: 0,
            successfulJobs: 0,
            failedJobs: 0,
            averageExecutionTime: 0
        };
    }

    /**
     * Inicializar el scheduler con jobs de la base de datos
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('⚠️ Scheduler ya inicializado');
            return;
        }

        console.log('🚀 Inicializando Task Scheduler...');

        try {
            // Verificar si los CRON jobs están habilitados
            const cronEnabled = await this.isCronEnabled();
            if (!cronEnabled) {
                console.log('⚠️ CRON jobs deshabilitados en configuración');
                return;
            }

            // Cargar jobs de la base de datos
            await this.loadJobsFromDatabase();

            // Programar jobs básicos por defecto
            this.scheduleDefaultJobs();

            this.isInitialized = true;
            console.log('✅ Task Scheduler inicializado exitosamente');

        } catch (error) {
            console.error('❌ Error inicializando scheduler:', error);
        }
    }

    /**
     * Verificar si los CRON jobs están habilitados
     */
    async isCronEnabled() {
        try {
            const result = await db.all(
                'SELECT setting_value FROM SystemSettings WHERE setting_key = ?',
                ['cron_jobs_enabled']
            );

            return result && result.length > 0 && result[0].setting_value === 'true';
        } catch (error) {
            console.error('Error verificando configuración CRON:', error);
            return false; // Por defecto deshabilitado si hay error
        }
    }

    /**
     * Cargar jobs programados de la base de datos
     */
    async loadJobsFromDatabase() {
        try {
            const jobs = await db.all(
                'SELECT * FROM ScheduledJobs WHERE is_active = true ORDER BY name'
            );

            console.log(`📋 Cargando ${jobs.length} jobs programados...`);

            for (let jobData of jobs) {
                await this.scheduleJob(jobData);
            }

        } catch (error) {
            console.error('Error cargando jobs:', error);
        }
    }

    /**
     * Programar un job específico
     */
    async scheduleJob(jobData) {
        try {
            const { id, name, schedule_pattern, job_type, job_config } = jobData;

            // Validar patrón CRON
            if (!cron.validate(schedule_pattern)) {
                console.error(`❌ Patrón CRON inválido para job "${name}": ${schedule_pattern}`);
                return false;
            }

            // Crear función ejecutora
            const executeJob = async () => {
                await this.executeJob(jobData);
            };

            // Programar job
            const task = cron.schedule(schedule_pattern, executeJob, {
                scheduled: true,
                timezone: jobData.timezone || 'America/Santiago'
            });

            this.jobs.set(id, {
                task,
                data: jobData,
                lastExecution: null
            });

            console.log(`✅ Job "${name}" programado: ${schedule_pattern}`);
            
            // Actualizar próxima ejecución en BD
            await this.updateNextRunTime(id, schedule_pattern);

            return true;

        } catch (error) {
            console.error(`❌ Error programando job "${jobData.name}":`, error);
            return false;
        }
    }

    /**
     * Ejecutar un job específico
     */
    async executeJob(jobData) {
        const startTime = Date.now();
        const executionId = await this.logJobStart(jobData.id);

        console.log(`🚀 Ejecutando job: ${jobData.name}`);

        try {
            let result = { success: false, recordsProcessed: 0, notificationsSent: 0 };

            // Ejecutar según tipo de job
            switch (jobData.job_type) {
                case 'sla_monitor':
                    result = await this.executeSLAMonitor(jobData);
                    break;
                
                case 'alert_check':
                    result = await this.executeAlertCheck(jobData);
                    break;
                
                case 'cleanup':
                    result = await this.executeCleanup(jobData);
                    break;
                
                case 'report_generation':
                    result = await this.executeReportGeneration(jobData);
                    break;
                
                case 'maintenance_reminder':
                    result = await this.executeMaintenanceReminder(jobData);
                    break;
                
                default:
                    throw new Error(`Tipo de job no implementado: ${jobData.job_type}`);
            }

            const duration = Date.now() - startTime;
            
            // Log exitoso
            await this.logJobSuccess(executionId, duration, result);
            
            // Actualizar estadísticas del job
            await this.updateJobStats(jobData.id, true, duration);
            
            this.executionStats.successfulJobs++;
            console.log(`✅ Job "${jobData.name}" completado en ${duration}ms`);

        } catch (error) {
            const duration = Date.now() - startTime;
            
            // Log error
            await this.logJobError(executionId, duration, error);
            
            // Actualizar estadísticas del job
            await this.updateJobStats(jobData.id, false, duration);
            
            this.executionStats.failedJobs++;
            console.error(`❌ Job "${jobData.name}" falló:`, error);
        }

        this.executionStats.totalJobs++;
    }

    /**
     * Ejecutar monitoreo de SLA
     */
    async executeSLAMonitor(jobData) {
        console.log('🔍 Ejecutando monitoreo de SLA...');
        
        const config = JSON.parse(jobData.job_config || '{}');
        const processed = await alertProcessor.processAllAlerts();
        
        return {
            success: processed,
            recordsProcessed: alertProcessor.getProcessingStats().totalChecked,
            notificationsSent: alertProcessor.getProcessingStats().notificationsSent
        };
    }

    /**
     * Ejecutar verificación de alertas
     */
    async executeAlertCheck(jobData) {
        console.log('📧 Procesando cola de notificaciones...');
        
        // Procesar notificaciones pendientes
        const pendingNotifications = await db.all(`
            SELECT * FROM NotificationQueue 
            WHERE status = 'pending' 
            AND scheduled_at <= NOW() 
            ORDER BY priority DESC, scheduled_at ASC 
            LIMIT 10
        `);

        let processed = 0;
        let sent = 0;

        for (let notification of pendingNotifications) {
            try {
                // Simular envío (aquí se integraría con servicio real de email/SMS)
                await this.simulateNotificationSend(notification);
                
                // Actualizar estado
                await db.all(
                    'UPDATE NotificationQueue SET status = ?, sent_at = NOW() WHERE id = ?',
                    ['sent', notification.id]
                );
                
                // Log del envío
                await db.all(`
                    INSERT INTO NotificationLog 
                    (queue_id, template_id, recipient_type, recipient_identifier, 
                     delivery_method, status)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    notification.id,
                    notification.template_id,
                    notification.recipient_type,
                    notification.recipient_identifier,
                    'email', // Método por defecto
                    'delivered'
                ]);

                sent++;
                processed++;

            } catch (error) {
                console.error('Error enviando notificación:', error);
                
                // Incrementar intentos
                await db.all(
                    'UPDATE NotificationQueue SET attempts = attempts + 1, error_message = ? WHERE id = ?',
                    [error.message, notification.id]
                );
                
                // Marcar como fallida si excede intentos
                if (notification.attempts >= notification.max_attempts) {
                    await db.all(
                        'UPDATE NotificationQueue SET status = ?, failed_at = NOW() WHERE id = ?',
                        ['failed', notification.id]
                    );
                }
                
                processed++;
            }
        }

        console.log(`📧 Procesadas ${processed} notificaciones, ${sent} enviadas exitosamente`);

        return {
            success: true,
            recordsProcessed: processed,
            notificationsSent: sent
        };
    }

    /**
     * Ejecutar limpieza de logs
     */
    async executeCleanup(jobData) {
        console.log('🧹 Ejecutando limpieza de sistema...');
        
        const config = JSON.parse(jobData.job_config || '{}');
        const retentionDays = config.retention_days || 30;
        
        let cleaned = 0;

        // Limpiar logs antiguos de notificaciones
        const notificationLogsResult = await db.all(`
            DELETE FROM NotificationLog 
            WHERE sent_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        `, [retentionDays]);
        
        cleaned += notificationLogsResult.affectedRows || 0;

        // Limpiar cola de notificaciones completadas
        const queueResult = await db.all(`
            DELETE FROM NotificationQueue 
            WHERE status IN ('sent', 'failed') 
            AND (sent_at < DATE_SUB(NOW(), INTERVAL ? DAY) 
                 OR failed_at < DATE_SUB(NOW(), INTERVAL ? DAY))
        `, [retentionDays, retentionDays]);
        
        cleaned += queueResult.affectedRows || 0;

        // Limpiar logs de ejecución de jobs antiguos
        const jobLogsResult = await db.all(`
            DELETE FROM JobExecutionLog 
            WHERE started_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        `, [retentionDays]);
        
        cleaned += jobLogsResult.affectedRows || 0;

        console.log(`🧹 Limpieza completada: ${cleaned} registros eliminados`);

        return {
            success: true,
            recordsProcessed: cleaned,
            notificationsSent: 0
        };
    }

    /**
     * Simulación de envío de notificación (placeholder)
     */
    async simulateNotificationSend(notification) {
        // Simular delay de envío
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log(`📧 Notificación enviada a ${notification.recipient_identifier}: ${notification.subject}`);
        
        // Aquí se integraría con:
        // - Servicio de email (SendGrid, AWS SES, etc.)
        // - Servicio de SMS
        // - Push notifications
        // - Slack/Teams webhooks
    }

    /**
     * Programar jobs por defecto del sistema
     */
    scheduleDefaultJobs() {
        // Job de prueba cada 5 minutos (solo para desarrollo)
        if (process.env.NODE_ENV === 'development') {
            cron.schedule('*/5 * * * *', async () => {
                console.log('🔄 Heartbeat del scheduler - Sistema operativo');
            });
        }

        // Job de estadísticas cada hora
        cron.schedule('0 * * * *', async () => {
            await this.updateSystemStats();
        });
    }

    /**
     * Actualizar estadísticas del sistema
     */
    async updateSystemStats() {
        try {
            console.log('📊 Actualizando estadísticas del sistema...');
            
            // Estadísticas de notificaciones
            const notificationStats = await db.all(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
                FROM NotificationLog 
                WHERE sent_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `);

            // Estadísticas de jobs
            const jobStats = await db.all(`
                SELECT 
                    COUNT(*) as total_executions,
                    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
                    AVG(duration_seconds) as avg_duration
                FROM JobExecutionLog 
                WHERE started_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `);

            console.log('📊 Estadísticas actualizadas:', {
                notifications: notificationStats[0],
                jobs: jobStats[0]
            });

        } catch (error) {
            console.error('Error actualizando estadísticas:', error);
        }
    }

    /**
     * Logging de ejecuciones
     */
    async logJobStart(jobId) {
        try {
            const result = await db.all(`
                INSERT INTO JobExecutionLog (job_id, status) 
                VALUES (?, 'running')
            `, [jobId]);

            return result.insertId;
        } catch (error) {
            console.error('Error logging job start:', error);
            return null;
        }
    }

    async logJobSuccess(executionId, duration, result) {
        if (!executionId) return;

        try {
            await db.all(`
                UPDATE JobExecutionLog 
                SET status = 'success', 
                    finished_at = NOW(), 
                    duration_seconds = ?, 
                    records_processed = ?, 
                    notifications_sent = ?
                WHERE id = ?
            `, [
                Math.round(duration / 1000),
                result.recordsProcessed || 0,
                result.notificationsSent || 0,
                executionId
            ]);
        } catch (error) {
            console.error('Error logging job success:', error);
        }
    }

    async logJobError(executionId, duration, error) {
        if (!executionId) return;

        try {
            await db.all(`
                UPDATE JobExecutionLog 
                SET status = 'failed', 
                    finished_at = NOW(), 
                    duration_seconds = ?, 
                    errors_count = 1,
                    error_details = ?
                WHERE id = ?
            `, [
                Math.round(duration / 1000),
                error.message,
                executionId
            ]);
        } catch (error) {
            console.error('Error logging job error:', error);
        }
    }

    async updateJobStats(jobId, success, duration) {
        try {
            const fields = success ? 
                'total_runs = total_runs + 1, successful_runs = successful_runs + 1' :
                'total_runs = total_runs + 1, failed_runs = failed_runs + 1';

            await db.all(`
                UPDATE ScheduledJobs 
                SET ${fields}, 
                    last_run_at = NOW(), 
                    last_duration_seconds = ?, 
                    last_status = ?
                WHERE id = ?
            `, [
                Math.round(duration / 1000),
                success ? 'success' : 'failed',
                jobId
            ]);
        } catch (error) {
            console.error('Error updating job stats:', error);
        }
    }

    async updateNextRunTime(jobId, cronPattern) {
        try {
            // Calcular próxima ejecución (simplificado)
            const nextRun = new Date();
            nextRun.setMinutes(nextRun.getMinutes() + 15); // Aproximación por defecto

            await db.all(
                'UPDATE ScheduledJobs SET next_run_at = ? WHERE id = ?',
                [nextRun, jobId]
            );
        } catch (error) {
            console.error('Error updating next run time:', error);
        }
    }

    /**
     * Detener el scheduler
     */
    stop() {
        console.log('🛑 Deteniendo Task Scheduler...');
        
        this.jobs.forEach((job, id) => {
            job.task.stop();
        });
        
        this.jobs.clear();
        this.isInitialized = false;
        
        console.log('✅ Task Scheduler detenido');
    }

    /**
     * Obtener estadísticas del scheduler
     */
    getStats() {
        return {
            ...this.executionStats,
            activeJobs: this.jobs.size,
            isInitialized: this.isInitialized
        };
    }

    /**
     * Listar jobs activos
     */
    getActiveJobs() {
        const jobList = [];
        
        this.jobs.forEach((job, id) => {
            jobList.push({
                id,
                name: job.data.name,
                type: job.data.job_type,
                schedule: job.data.schedule_pattern,
                lastExecution: job.lastExecution
            });
        });
        
        return jobList;
    }
}

module.exports = new TaskScheduler();
