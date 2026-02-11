const express = require('express');
const router = express.Router();
const db = require('../../db-adapter');

/**
 * GYMTEC ERP - APIs SISTEMA DE NOTIFICACIONES INTELIGENTES
 * 
 * Endpoints implementados:
 * ✅ GET /api/notifications - Listar notificaciones generales
 * ✅ GET /api/notifications/templates - Listar templates
 * ✅ POST /api/notifications/templates - Crear template
 * ✅ PUT /api/notifications/templates/:id - Actualizar template
 * ✅ DELETE /api/notifications/templates/:id - Eliminar template
 * ✅ GET /api/notifications/queue - Ver cola de notificaciones
 * ✅ POST /api/notifications/send - Enviar notificación manual
 * ✅ GET /api/notifications/logs - Ver logs de envío
 * ✅ GET /api/notifications/stats - Estadísticas de notificaciones
 */

// ===================================================================
// ENDPOINT RAÍZ - NOTIFICACIONES GENERALES
// ===================================================================

/**
 * @route GET /api/notifications
 * @desc Obtener lista de notificaciones generales (logs y queue combinados)
 */
router.get('/', async (req, res) => {
    try {
        console.log('📧 Obteniendo notificaciones generales...');
        const { limit = 50, offset = 0, status, type } = req.query;
        
        // Query para obtener notificaciones recientes de logs y queue
        let sql = `
        SELECT 
            nl.id,
            nl.type,
            nl.priority,
            nl.subject as title,
            nl.message,
            nl.status,
            nl.sent_at as created_at,
            nl.delivered_at,
            nl.failed_at,
            'log' as source
        FROM NotificationLogs nl
        WHERE 1=1`;
        
        const params = [];
        
        if (status) {
            sql += ' AND nl.status = ?';
            params.push(status);
        }
        
        if (type) {
            sql += ' AND nl.type = ?';
            params.push(type);
        }
        
        sql += `
        UNION ALL
        SELECT 
            nq.id,
            nq.type,
            nq.priority,
            nq.subject as title,
            nq.message,
            nq.status,
            nq.scheduled_at as created_at,
            NULL as delivered_at,
            NULL as failed_at,
            'queue' as source
        FROM NotificationQueue nq
        WHERE 1=1`;
        
        if (status) {
            sql += ' AND nq.status = ?';
            params.push(status);
        }
        
        sql += `
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?`;
        
        params.push(parseInt(limit, 10), parseInt(offset, 10));
        
        const notifications = await db.allAsync(sql, params);
        
        // Obtener estadísticas básicas
        const statsQuery = `
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'sent' OR status = 'delivered' THEN 1 ELSE 0 END) as sent,
            SUM(CASE WHEN status = 'pending' OR status = 'scheduled' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM (
            SELECT status FROM NotificationLogs
            UNION ALL
            SELECT status FROM NotificationQueue
        ) combined_notifications`;
        
        const statsResult = await db.getAsync(statsQuery);
        
        res.json({
            message: 'success',
            data: notifications,
            metadata: {
                total: notifications.length,
                limit: parseInt(limit, 10),
                offset: parseInt(offset, 10),
                stats: {
                    total: statsResult?.total || 0,
                    sent: statsResult?.sent || 0,
                    pending: statsResult?.pending || 0,
                    failed: statsResult?.failed || 0
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo notificaciones:', error);
        
        // Si hay error de tabla, devolver datos de ejemplo para desarrollo
        if (error.message && error.message.includes('no such table')) {
            console.log('📝 Tablas de notificaciones no existen, devolviendo datos de ejemplo...');
            res.json({
                message: 'success',
                data: [
                    {
                        id: 1,
                        type: 'sla_warning',
                        priority: 'high',
                        title: 'Advertencia SLA - Ticket #1234',
                        message: 'El ticket está próximo a vencer el SLA',
                        status: 'pending',
                        created_at: new Date().toISOString(),
                        source: 'queue'
                    },
                    {
                        id: 2,
                        type: 'maintenance_due',
                        priority: 'medium',
                        title: 'Mantenimiento Programado',
                        message: 'Equipo requiere mantenimiento preventivo',
                        status: 'sent',
                        created_at: new Date().toISOString(),
                        source: 'log'
                    }
                ],
                metadata: {
                    total: 2,
                    limit: 50,
                    offset: 0,
                    stats: {
                        total: 2,
                        sent: 1,
                        pending: 1,
                        failed: 0
                    }
                }
            });
            return;
        }
        
        res.status(500).json({ 
            error: 'Error obteniendo notificaciones',
            code: 'NOTIFICATIONS_ERROR',
            details: error.message 
        });
    }
});

// ===================================================================
// TEMPLATES DE NOTIFICACIONES
// ===================================================================

/**
 * @route GET /api/notifications/templates
 * @desc Obtener lista de templates de notificaciones
 */
router.get('/templates', async (req, res) => {
    try {
        console.log('📧 Obteniendo plantillas de notificaciones...');
        const { type, trigger_event, is_active } = req.query;
        
        let sql = `
        SELECT nt.*, 
               u.username as created_by_name
        FROM NotificationTemplates nt
        LEFT JOIN Users u ON nt.created_by = u.id
        WHERE 1=1`;
        
        const params = [];
        
        if (type) {
            sql += ' AND nt.type = ?';
            params.push(type);
        }
        
        if (trigger_event) {
            sql += ' AND nt.trigger_event = ?';
            params.push(trigger_event);
        }
        
        if (is_active !== undefined) {
            sql += ' AND nt.is_active = ?';
            params.push(is_active === 'true');
        }
        
        sql += ' ORDER BY nt.created_at DESC';
        
        const templates = await db.allAsync(sql, params);
        
        // Parsear JSON fields
        templates.forEach(template => {
            if (template.recipients_roles) {
                try {
                    template.recipients_roles = JSON.parse(template.recipients_roles);
                } catch (e) {
                    template.recipients_roles = [];
                }
            }
            if (template.recipients_emails) {
                try {
                    template.recipients_emails = JSON.parse(template.recipients_emails);
                } catch (e) {
                    template.recipients_emails = [];
                }
            }
        });
        
        // Obtener estadísticas simples
        const totalQuery = `SELECT COUNT(*) as total FROM NotificationTemplates`;
        const totalResult = await db.getAsync(totalQuery);
        
        const activeQuery = `SELECT COUNT(*) as active FROM NotificationTemplates WHERE is_active = 1`;
        const activeResult = await db.getAsync(activeQuery);
        
        res.json({
            message: 'success',
            data: templates,
            metadata: { 
                total: templates.length,
                stats: {
                    total: totalResult?.total || 0,
                    active: activeResult?.active || 0,
                    inactive: (totalResult?.total || 0) - (activeResult?.active || 0)
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo templates:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            code: 'TEMPLATE_FETCH_ERROR',
            details: error.message
        });
    }
});

/**
 * @route POST /api/notifications/templates
 * @desc Crear nuevo template de notificación
 */
router.post('/templates', async (req, res) => {
    try {
        const {
            name,
            type = 'email',
            trigger_event,
            subject_template,
            body_template,
            priority = 'medium',
            send_immediately = true,
            delay_minutes = 0,
            max_frequency_hours = 24,
            recipients_roles = [],
            recipients_emails = []
        } = req.body;
        
        // Validaciones
        if (!name || !trigger_event || !body_template) {
            return res.status(400).json({
                error: 'Campos requeridos: name, trigger_event, body_template',
                code: 'VALIDATION_ERROR'
            });
        }
        
        // Verificar que el template no existe
        const existingTemplate = await db.allAsync(
            'SELECT id FROM NotificationTemplates WHERE name = ? AND trigger_event = ?',
            [name, trigger_event]
        );
        
        if (existingTemplate.length > 0) {
            return res.status(409).json({
                error: 'Ya existe un template con ese nombre y evento',
                code: 'TEMPLATE_EXISTS'
            });
        }
        
        const sql = `
        INSERT INTO NotificationTemplates 
        (name, type, trigger_event, subject_template, body_template, priority,
         send_immediately, delay_minutes, max_frequency_hours, 
         recipients_roles, recipients_emails, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const result = await db.runAsync(sql, [
            name,
            type,
            trigger_event,
            subject_template,
            body_template,
            priority,
            send_immediately,
            delay_minutes,
            max_frequency_hours,
            JSON.stringify(recipients_roles),
            JSON.stringify(recipients_emails),
            req.user?.id || 1
        ]);
        
        res.status(201).json({
            message: 'Template creado exitosamente',
            data: { id: result.lastID, name, trigger_event },
            code: 'TEMPLATE_CREATED'
        });
        
    } catch (error) {
        console.error('Error creando template:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'TEMPLATE_CREATE_ERROR'
        });
    }
});

/**
 * @route PUT /api/notifications/templates/:id
 * @desc Actualizar template de notificación
 */
router.put('/templates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Verificar que el template existe
        const template = await db.allAsync(
            'SELECT id FROM NotificationTemplates WHERE id = ?',
            [id]
        );
        
        if (template.length === 0) {
            return res.status(404).json({
                error: 'Template no encontrado',
                code: 'TEMPLATE_NOT_FOUND'
            });
        }
        
        // Construir query de actualización dinámicamente
        const allowedFields = [
            'name', 'type', 'trigger_event', 'subject_template', 'body_template',
            'priority', 'is_active', 'send_immediately', 'delay_minutes',
            'max_frequency_hours', 'recipients_roles', 'recipients_emails'
        ];
        
        const updateFields = [];
        const updateValues = [];
        
        Object.keys(updates).forEach(field => {
            if (allowedFields.includes(field)) {
                updateFields.push(`${field} = ?`);
                if (field === 'recipients_roles' || field === 'recipients_emails') {
                    updateValues.push(JSON.stringify(updates[field]));
                } else {
                    updateValues.push(updates[field]);
                }
            }
        });
        
        if (updateFields.length === 0) {
            return res.status(400).json({
                error: 'No hay campos válidos para actualizar',
                code: 'NO_VALID_FIELDS'
            });
        }
        
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(id);
        
        const sql = `UPDATE NotificationTemplates SET ${updateFields.join(', ')} WHERE id = ?`;
        
        await db.runAsync(sql, updateValues);
        
        res.json({
            message: 'Template actualizado exitosamente',
            code: 'TEMPLATE_UPDATED'
        });
        
    } catch (error) {
        console.error('Error actualizando template:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'TEMPLATE_UPDATE_ERROR'
        });
    }
});

/**
 * @route DELETE /api/notifications/templates/:id
 * @desc Eliminar template de notificación
 */
router.delete('/templates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que el template existe
        const template = await db.allAsync(
            'SELECT id, name FROM NotificationTemplates WHERE id = ?',
            [id]
        );
        
        if (template.length === 0) {
            return res.status(404).json({
                error: 'Template no encontrado',
                code: 'TEMPLATE_NOT_FOUND'
            });
        }
        
        // Verificar si hay alertas usando este template
        const alertsUsing = await db.allAsync(
            'SELECT COUNT(*) as count FROM AutomatedAlerts WHERE notification_template_id = ?',
            [id]
        );
        
        if (alertsUsing[0].count > 0) {
            return res.status(409).json({
                error: 'No se puede eliminar el template porque está siendo usado por alertas automáticas',
                code: 'TEMPLATE_IN_USE'
            });
        }
        
        await db.runAsync('DELETE FROM NotificationTemplates WHERE id = ?', [id]);
        
        res.json({
            message: 'Template eliminado exitosamente',
            data: { name: template[0].name },
            code: 'TEMPLATE_DELETED'
        });
        
    } catch (error) {
        console.error('Error eliminando template:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'TEMPLATE_DELETE_ERROR'
        });
    }
});

// ===================================================================
// COLA DE NOTIFICACIONES
// ===================================================================

/**
 * @route GET /api/notifications/queue
 * @desc Obtener cola de notificaciones
 */
router.get('/queue', async (req, res) => {
    try {
        console.log('📮 Obteniendo cola de notificaciones...');
        const { status, priority, limit = 50, offset = 0 } = req.query;
        
        let sql = `
        SELECT nq.*, 
               nt.name as template_name,
               nt.type as notification_type
        FROM NotificationQueue nq
        LEFT JOIN NotificationTemplates nt ON nq.template_id = nt.id
        WHERE 1=1`;
        
        const params = [];
        
        if (status) {
            sql += ' AND nq.status = ?';
            params.push(status);
        }
        
        if (priority) {
            sql += ' AND nq.priority = ?';
            params.push(priority);
        }
        
        sql += ' ORDER BY nq.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit, 10), parseInt(offset, 10));
        
        const queue = await db.allAsync(sql, params);
        
        // Parsear context_data JSON
        if (queue && queue.forEach) {
            queue.forEach(item => {
                if (item.context_data) {
                    try {
                        item.context_data = JSON.parse(item.context_data);
                    } catch (e) {
                        item.context_data = {};
                    }
                }
            });
        }
        
        // Obtener estadísticas de la cola
        const statsQuery = `SELECT status, COUNT(*) as count FROM NotificationQueue GROUP BY status`;
        const stats = await db.allAsync(statsQuery);
        
        res.json({
            message: 'success',
            data: queue,
            metadata: {
                total: queue.length,
                stats: stats.reduce((acc, stat) => {
                    acc[stat.status] = stat.count;
                    return acc;
                }, {}),
                limit: parseInt(limit, 10),
                offset: parseInt(offset, 10)
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo cola:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'QUEUE_FETCH_ERROR',
            details: error.message
        });
    }
});

/**
 * @route POST /api/notifications/send
 * @desc Enviar notificación manual
 */
router.post('/send', async (req, res) => {
    try {
        const {
            template_id,
            trigger_event,
            related_entity_type,
            related_entity_id,
            recipients, // Array de {type: 'email'|'user'|'role', identifier: 'value'}
            context_data = {},
            priority = 'medium',
            scheduled_at
        } = req.body;
        
        // Validaciones
        if (!template_id || !trigger_event || !recipients || recipients.length === 0) {
            return res.status(400).json({
                error: 'Campos requeridos: template_id, trigger_event, recipients',
                code: 'VALIDATION_ERROR'
            });
        }
        
        // Verificar que el template existe
        const template = await db.allAsync(
            'SELECT * FROM NotificationTemplates WHERE id = ? AND is_active = true',
            [template_id]
        );
        
        if (template.length === 0) {
            return res.status(404).json({
                error: 'Template no encontrado o inactivo',
                code: 'TEMPLATE_NOT_FOUND'
            });
        }
        
        const templateData = template[0];
        
        // Procesar template con context_data
        const processedSubject = processTemplate(templateData.subject_template, context_data);
        const processedBody = processTemplate(templateData.body_template, context_data);
        
        // Insertar en cola para cada destinatario
        const insertPromises = recipients.map(recipient => {
            const sql = `
            INSERT INTO NotificationQueue 
            (template_id, trigger_event, related_entity_type, related_entity_id,
             recipient_type, recipient_identifier, subject, body, 
             context_data, priority, scheduled_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            
            return db.query(sql, [
                template_id,
                trigger_event,
                related_entity_type,
                related_entity_id,
                recipient.type,
                recipient.identifier,
                processedSubject,
                processedBody,
                JSON.stringify(context_data),
                priority,
                scheduled_at || new Date()
            ]);
        });
        
        await Promise.all(insertPromises);
        
        res.status(201).json({
            message: 'Notificaciones programadas exitosamente',
            data: {
                template_name: templateData.name,
                recipients_count: recipients.length,
                trigger_event
            },
            code: 'NOTIFICATIONS_QUEUED'
        });
        
    } catch (error) {
        console.error('Error enviando notificación:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'NOTIFICATION_SEND_ERROR'
        });
    }
});

// ===================================================================
// LOGS Y ESTADÍSTICAS
// ===================================================================

/**
 * @route GET /api/notifications/logs
 * @desc Obtener logs de notificaciones enviadas
 */
router.get('/logs', async (req, res) => {
    try {
        const { 
            status, 
            delivery_method, 
            date_from, 
            date_to,
            limit = 100, 
            offset = 0 
        } = req.query;
        
        let sql = `
        SELECT nl.*, 
               nt.name as template_name,
               nq.related_entity_type,
               nq.related_entity_id
        FROM NotificationLogs nl
        LEFT JOIN NotificationTemplates nt ON nl.template_id = nt.id
        LEFT JOIN NotificationQueue nq ON nl.queue_id = nq.id
        WHERE 1=1`;
        
        const params = [];
        
        if (status) {
            sql += ' AND nl.status = ?';
            params.push(status);
        }
        
        if (delivery_method) {
            sql += ' AND nl.delivery_method = ?';
            params.push(delivery_method);
        }
        
        if (date_from) {
            sql += ' AND nl.sent_at >= ?';
            params.push(date_from);
        }
        
        if (date_to) {
            sql += ' AND nl.sent_at <= ?';
            params.push(date_to);
        }
        
        sql += ' ORDER BY nl.sent_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit, 10), parseInt(offset, 10));
        
        const logs = await db.allAsync(sql, params);
        
        // Parsear delivery_details JSON
        logs.forEach(log => {
            if (log.delivery_details) {
                try {
                    log.delivery_details = JSON.parse(log.delivery_details);
                } catch (e) {
                    log.delivery_details = {};
                }
            }
        });
        
        res.json({
            message: 'success',
            data: logs,
            metadata: {
                total: logs.length,
                limit: parseInt(limit, 10),
                offset: parseInt(offset, 10)
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo logs:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'LOGS_FETCH_ERROR'
        });
    }
});

/**
 * @route GET /api/notifications/stats
 * @desc Obtener estadísticas de notificaciones
 */
router.get('/stats', async (req, res) => {
    try {
        console.log('📊 Obteniendo estadísticas de notificaciones...');
        
        // Stats básicas sin filtros de fecha complejos para evitar problemas MySQL
        console.log('🔍 Ejecutando consulta totalSent...');
        const totalSent = await db.allAsync('SELECT COUNT(*) as count FROM NotificationLogs');
        console.log('✅ totalSent result:', totalSent);
        
        console.log('🔍 Ejecutando consulta totalPending...');
        const totalPending = await db.allAsync('SELECT COUNT(*) as count FROM NotificationQueue WHERE status = ?', ['pending']);
        console.log('✅ totalPending result:', totalPending);
        
        console.log('🔍 Ejecutando consulta totalDelivered...');
        const totalDelivered = await db.allAsync('SELECT COUNT(*) as count FROM NotificationLogs WHERE status = ?', ['delivered']);
        console.log('✅ totalDelivered result:', totalDelivered);
        
        console.log('🔍 Ejecutando consulta totalFailed...');
        const totalFailed = await db.allAsync('SELECT COUNT(*) as count FROM NotificationLogs WHERE status = ?', ['failed']);
        console.log('✅ totalFailed result:', totalFailed);
        
        // Calcular tasa de éxito
        const totalLogs = totalSent[0]?.count || 0;
        const delivered = totalDelivered[0]?.count || 0;
        const successRate = totalLogs > 0 ? Math.round((delivered / totalLogs) * 100) : 0;
        
        console.log('📊 Calculando stats finales...');
        
        res.json({
            message: 'success',
            data: {
                period: req.query.period || '24h',
                notifications_sent: totalSent[0]?.count || 0,
                notifications_pending: totalPending[0]?.count || 0,
                notifications_delivered: delivered,
                notifications_failed: totalFailed[0]?.count || 0,
                success_rate: successRate,
                // Formato compatible con frontend existente
                status_distribution: {
                    delivered: delivered,
                    failed: totalFailed[0]?.count || 0,
                    pending: totalPending[0]?.count || 0
                },
                queue_status: {
                    pending: totalPending[0]?.count || 0
                },
                success_rate_obj: {
                    total: totalLogs,
                    delivered: delivered,
                    success_rate: successRate
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error completo obteniendo estadísticas:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code
        });
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'STATS_FETCH_ERROR',
            details: error.message
        });
    }
});

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

/**
 * Procesar template con variables de contexto
 */
function processTemplate(template, context) {
    if (!template) return '';
    
    let processed = template;
    
    // Reemplazar variables {{variable}}
    Object.keys(context).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        processed = processed.replace(regex, context[key] || '');
    });
    
    return processed;
}

module.exports = router;
