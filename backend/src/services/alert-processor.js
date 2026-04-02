const db = require('../db-adapter');

/**
 * GYMTEC ERP - MOTOR DE PROCESAMIENTO DE ALERTAS AUTOMÁTICAS
 * 
 * Funcionalidades:
 * ✅ Procesamiento de alertas SLA
 * ✅ Detección de tickets sin asignar
 * ✅ Verificación de checklist pendientes
 * ✅ Sistema de throttling para evitar spam
 * ✅ Logging detallado de ejecución
 */

class AlertProcessor {
    constructor() {
        this.isProcessing = false;
        this.lastProcessTime = null;
        this.processingStats = {
            totalChecked: 0,
            alertsTriggered: 0,
            notificationsSent: 0,
            errors: 0
        };
    }

    /**
     * Procesar todas las alertas automáticas activas
     */
    async processAllAlerts() {
        if (this.isProcessing) {
            console.log('⚠️ Procesamiento de alertas ya en ejecución, saltando...');
            return false;
        }

        console.log('🚀 Iniciando procesamiento de alertas automáticas...');
        this.isProcessing = true;
        this.processingStats = { totalChecked: 0, alertsTriggered: 0, notificationsSent: 0, errors: 0 };

        try {
            // Obtener alertas activas que necesitan verificación
            const alertsToCheck = await this.getAlertsToCheck();
            console.log(`📋 Encontradas ${alertsToCheck.length} alertas para verificar`);

            for (const alert of alertsToCheck) {
                try {
                    this.processingStats.totalChecked++;
                    await this.processAlert(alert);
                    
                    // Actualizar última verificación
                    await this.updateAlertLastCheck(alert.id);
                    
                } catch (error) {
                    console.error(`❌ Error procesando alerta "${alert.name}":`, error);
                    this.processingStats.errors++;
                }
            }

            // Resetear contador diario si es necesario
            await this.resetDailyCounters();

            console.log('✅ Procesamiento de alertas completado:', this.processingStats);
            return true;

        } catch (error) {
            console.error('💥 Error en procesamiento de alertas:', error);
            return false;
        } finally {
            this.isProcessing = false;
            this.lastProcessTime = new Date();
        }
    }

    /**
     * Obtener alertas que necesitan verificación
     */
    async getAlertsToCheck() {
        const sql = `
        SELECT * FROM AutomatedAlerts 
        WHERE is_active = true 
        AND (
            last_check_at IS NULL 
            OR last_check_at < DATE_SUB(NOW(), INTERVAL check_frequency_minutes MINUTE)
        )
        AND alerts_sent_today < max_alerts_per_day
        ORDER BY alert_type, last_check_at ASC`;

        return await db.all(sql);
    }

    /**
     * Procesar una alerta específica
     */
    async processAlert(alert) {
        console.log(`🔍 Procesando alerta: ${alert.name} (${alert.alert_type})`);

        let conditions;
        try {
            conditions = JSON.parse(alert.trigger_conditions);
        } catch (error) {
            console.error('❌ Error parseando condiciones de alerta:', error);
            return;
        }

        let triggered = false;

        switch (alert.alert_type) {
            case 'sla_warning':
                triggered = await this.checkSLAWarning(conditions, alert);
                break;
            
            case 'sla_expired':
                triggered = await this.checkSLAExpired(conditions, alert);
                break;
            
            case 'unassigned_ticket':
                triggered = await this.checkUnassignedTickets(conditions, alert);
                break;
            
            case 'checklist_pending':
                triggered = await this.checkChecklistPending(conditions, alert);
                break;
            
            case 'stock_low':
                triggered = await this.checkStockLow(conditions, alert);
                break;
            
            default:
                console.log(`⚠️ Tipo de alerta no implementado: ${alert.alert_type}`);
        }

        if (triggered) {
            this.processingStats.alertsTriggered++;
            await this.updateAlertTriggered(alert.id);
        }
    }

    /**
     * Verificar alertas de SLA próximo a vencer
     */
    async checkSLAWarning(conditions, alert) {
        const warningHours = conditions.warning_hours || 1;
        const priorities = conditions.priorities || [];
        const statuses = conditions.statuses || [];

        let sql = `
        SELECT t.*, c.name as client_name, cs.response_time_hours, cs.resolution_time_hours
        FROM Tickets t
        JOIN Clients c ON t.client_id = c.id
        LEFT JOIN ContractSLA cs ON c.contract_id = cs.contract_id
        WHERE t.sla_deadline IS NOT NULL
        AND t.sla_deadline > NOW()
        AND t.sla_deadline <= DATE_ADD(NOW(), INTERVAL ? HOUR)
        AND t.status IN ('Abierto', 'En Progreso')`;

        const params = [warningHours];

        if (priorities.length > 0) {
            sql += ` AND t.priority IN (${priorities.map(() => '?').join(',')})`;
            params.push(...priorities);
        }

        const tickets = await db.all(sql, params);

        if (tickets.length > 0) {
            console.log(`⚠️ ${tickets.length} tickets próximos a vencer SLA`);
            
            for (const ticket of tickets) {
                await this.sendSLAWarningNotification(ticket, alert);
            }
            
            return true;
        }

        return false;
    }

    /**
     * Verificar alertas de SLA vencido
     */
    async checkSLAExpired(conditions, alert) {
        const sql = `
        SELECT t.*, c.name as client_name, cs.response_time_hours, cs.resolution_time_hours
        FROM Tickets t
        JOIN Clients c ON t.client_id = c.id
        LEFT JOIN ContractSLA cs ON c.contract_id = cs.contract_id
        WHERE t.sla_deadline IS NOT NULL
        AND t.sla_deadline < NOW()
        AND t.status IN ('Abierto', 'En Progreso')`;

        const tickets = await db.all(sql);

        if (tickets.length > 0) {
            console.log(`🚨 ${tickets.length} tickets con SLA vencido`);
            
            for (const ticket of tickets) {
                await this.sendSLAExpiredNotification(ticket, alert);
            }
            
            return true;
        }

        return false;
    }

    /**
     * Verificar tickets sin asignar
     */
    async checkUnassignedTickets(conditions, alert) {
        const maxUnassignedMinutes = conditions.max_unassigned_minutes || 30;
        const priorities = conditions.priorities || [];

        let sql = `
        SELECT t.*, c.name as client_name
        FROM Tickets t
        JOIN Clients c ON t.client_id = c.id
        WHERE t.assigned_technician_id IS NULL
        AND t.status = 'Abierto'
        AND t.created_at <= DATE_SUB(NOW(), INTERVAL ? MINUTE)`;

        const params = [maxUnassignedMinutes];

        if (priorities.length > 0) {
            sql += ` AND t.priority IN (${priorities.map(() => '?').join(',')})`;
            params.push(...priorities);
        }

        const tickets = await db.all(sql, params);

        if (tickets.length > 0) {
            console.log(`📋 ${tickets.length} tickets sin asignar por más de ${maxUnassignedMinutes} minutos`);
            
            for (const ticket of tickets) {
                await this.sendUnassignedTicketNotification(ticket, alert);
            }
            
            return true;
        }

        return false;
    }

    /**
     * Verificar checklist pendientes
     */
    async checkChecklistPending(conditions, alert) {
        const sql = `
        SELECT t.*, c.name as client_name, te.completion_percentage,
               COUNT(tci.id) as total_items,
               SUM(CASE WHEN tci.is_completed = true THEN 1 ELSE 0 END) as completed_items
        FROM Tickets t
        JOIN Clients c ON t.client_id = c.id
        JOIN TicketChecklists tc ON t.id = tc.ticket_id
        JOIN TicketExecutions te ON tc.id = te.checklist_id
        LEFT JOIN TicketChecklistItems tci ON tc.id = tci.checklist_id
        WHERE t.status IN ('En Progreso', 'Pendiente')
        AND te.completion_percentage < 100
        AND tc.created_at <= DATE_SUB(NOW(), INTERVAL 2 HOUR)
        GROUP BY t.id, te.id
        HAVING total_items > 0`;

        const tickets = await db.all(sql);

        if (tickets.length > 0) {
            console.log(`📝 ${tickets.length} tickets con checklist pendiente`);
            
            for (const ticket of tickets) {
                await this.sendChecklistPendingNotification(ticket, alert);
            }
            
            return true;
        }

        return false;
    }

    /**
     * Verificar stock bajo (placeholder - requiere implementación de inventario)
     */
    async checkStockLow(conditions, alert) {
        // Implementar cuando se tenga módulo de inventario
        console.log('📦 Verificación de stock bajo - pendiente de implementación');
        return false;
    }

    /**
     * Enviar notificación de SLA warning
     */
    async sendSLAWarningNotification(ticket, alert) {
        const hoursRemaining = Math.ceil(
            (new Date(ticket.sla_deadline) - new Date()) / (1000 * 60 * 60)
        );

        const contextData = {
            ticket_id: ticket.id,
            ticket_title: ticket.title,
            client_name: ticket.client_name,
            priority: ticket.priority,
            status: ticket.status,
            hours_remaining: hoursRemaining,
            sla_deadline: new Date(ticket.sla_deadline).toLocaleString('es-CL')
        };

        await this.queueNotification(alert.notification_template_id, 'sla_warning', 'ticket', ticket.id, contextData, 'high');
    }

    /**
     * Enviar notificación de SLA expired
     */
    async sendSLAExpiredNotification(ticket, alert) {
        const hoursOverdue = Math.ceil(
            (new Date() - new Date(ticket.sla_deadline)) / (1000 * 60 * 60)
        );

        const contextData = {
            ticket_id: ticket.id,
            ticket_title: ticket.title,
            client_name: ticket.client_name,
            priority: ticket.priority,
            status: ticket.status,
            hours_overdue: hoursOverdue,
            sla_deadline: new Date(ticket.sla_deadline).toLocaleString('es-CL')
        };

        await this.queueNotification(alert.notification_template_id, 'sla_expired', 'ticket', ticket.id, contextData, 'critical');
    }

    /**
     * Enviar notificación de ticket sin asignar
     */
    async sendUnassignedTicketNotification(ticket, alert) {
        const minutesUnassigned = Math.ceil(
            (new Date() - new Date(ticket.created_at)) / (1000 * 60)
        );

        const contextData = {
            ticket_id: ticket.id,
            ticket_title: ticket.title,
            client_name: ticket.client_name,
            priority: ticket.priority,
            minutes_unassigned: minutesUnassigned,
            created_at: new Date(ticket.created_at).toLocaleString('es-CL')
        };

        await this.queueNotification(alert.notification_template_id, 'unassigned_ticket', 'ticket', ticket.id, contextData, 'medium');
    }

    /**
     * Enviar notificación de checklist pendiente
     */
    async sendChecklistPendingNotification(ticket, alert) {
        const contextData = {
            ticket_id: ticket.id,
            ticket_title: ticket.title,
            completion_percentage: ticket.completion_percentage || 0,
            pending_items: ticket.total_items - ticket.completed_items,
            technician_name: 'Técnico asignado' // Mejorar con JOIN a Users
        };

        await this.queueNotification(alert.notification_template_id, 'checklist_pending', 'ticket', ticket.id, contextData, 'medium');
    }

    /**
     * Agregar notificación a la cola
     */
    async queueNotification(templateId, triggerEvent, entityType, entityId, contextData, priority) {
        if (!templateId) {
            console.log('⚠️ No hay template configurado para esta alerta');
            return;
        }

        // Obtener template
        const template = await db.all(
            'SELECT * FROM NotificationTemplates WHERE id = ? AND is_active = true',
            [templateId]
        );

        if (template.length === 0) {
            console.log('⚠️ Template no encontrado o inactivo');
            return;
        }

        const templateData = template[0];

        // Procesar template
        const subject = this.processTemplate(templateData.subject_template, contextData);
        const body = this.processTemplate(templateData.body_template, contextData);

        // Obtener destinatarios
        const recipients = [];
        
        if (templateData.recipients_roles) {
            try {
                const roles = JSON.parse(templateData.recipients_roles);
                for (const role of roles) {
                    recipients.push({ type: 'role', identifier: role });
                }
            } catch (e) {
                console.error('Error parseando roles de destinatarios:', e);
            }
        }

        if (templateData.recipients_emails) {
            try {
                const emails = JSON.parse(templateData.recipients_emails);
                for (const email of emails) {
                    recipients.push({ type: 'email', identifier: email });
                }
            } catch (e) {
                console.error('Error parseando emails de destinatarios:', e);
            }
        }

        // Insertar en cola para cada destinatario
        for (const recipient of recipients) {
            const sql = `
            INSERT INTO NotificationQueue 
            (template_id, trigger_event, related_entity_type, related_entity_id,
             recipient_type, recipient_identifier, subject, body, 
             context_data, priority)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            await db.all(sql, [
                templateId,
                triggerEvent,
                entityType,
                entityId,
                recipient.type,
                recipient.identifier,
                subject,
                body,
                JSON.stringify(contextData),
                priority
            ]);

            this.processingStats.notificationsSent++;
        }

        console.log(`📧 Notificación agregada a cola: ${triggerEvent} para ${recipients.length} destinatarios`);
    }

    /**
     * Procesar template con variables
     */
    processTemplate(template, context) {
        if (!template) return '';
        
        let processed = template;
        
        Object.keys(context).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            processed = processed.replace(regex, context[key] || '');
        });
        
        return processed;
    }

    /**
     * Actualizar última verificación de alerta
     */
    async updateAlertLastCheck(alertId) {
        await db.all(
            'UPDATE AutomatedAlerts SET last_check_at = NOW() WHERE id = ?',
            [alertId]
        );
    }

    /**
     * Actualizar cuando se dispara una alerta
     */
    async updateAlertTriggered(alertId) {
        await db.all(
            'UPDATE AutomatedAlerts SET last_triggered_at = NOW(), alerts_sent_today = alerts_sent_today + 1 WHERE id = ?',
            [alertId]
        );
    }

    /**
     * Resetear contadores diarios si es necesario
     */
    async resetDailyCounters() {
        const sql = `
        UPDATE AutomatedAlerts 
        SET alerts_sent_today = 0 
        WHERE DATE(last_triggered_at) < CURDATE()`;
        
        await db.all(sql);
    }

    /**
     * Obtener estadísticas del procesador
     */
    getProcessingStats() {
        return {
            ...this.processingStats,
            isProcessing: this.isProcessing,
            lastProcessTime: this.lastProcessTime
        };
    }
}

module.exports = new AlertProcessor();
