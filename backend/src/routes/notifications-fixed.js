const express = require('express');
const router = express.Router();
const db = require('../db-adapter');

/**
 * Endpoints simplificados de notificaciones que funcionan con el adaptador actual
 */

// GET estadísticas simplificadas (sin funciones de fecha MySQL)
router.get('/stats-simple', async (req, res) => {
    try {
        console.log('📊 Obteniendo estadísticas simplificadas...');
        
        // Stats básicas sin filtros de fecha complejos
        const totalSent = await db.allAsync('SELECT COUNT(*) as count FROM NotificationLog');
        const totalPending = await db.allAsync('SELECT COUNT(*) as count FROM NotificationQueue WHERE status = ?', ['pending']);
        const totalDelivered = await db.allAsync('SELECT COUNT(*) as count FROM NotificationLog WHERE status = ?', ['delivered']);
        const totalFailed = await db.allAsync('SELECT COUNT(*) as count FROM NotificationLog WHERE status = ?', ['failed']);
        
        // Calcular tasa de éxito
        const totalLogs = totalSent[0].count;
        const delivered = totalDelivered[0].count;
        const successRate = totalLogs > 0 ? Math.round((delivered / totalLogs) * 100) : 0;
        
        res.json({
            message: 'success',
            data: {
                period: '24h',
                notifications_sent: totalSent[0].count,
                notifications_pending: totalPending[0].count,
                notifications_delivered: delivered,
                notifications_failed: totalFailed[0].count,
                success_rate: successRate
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas simplificadas:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'STATS_FETCH_ERROR',
            details: error.message
        });
    }
});

// GET cola simplificada
router.get('/queue-simple', async (req, res) => {
    try {
        console.log('📮 Obteniendo cola simplificada...');
        
        const sql = `
        SELECT nq.*, 
               nt.name as template_name,
               nt.type as notification_type
        FROM NotificationQueue nq
        LEFT JOIN NotificationTemplates nt ON nq.template_id = nt.id
        ORDER BY nq.created_at DESC
        LIMIT 50`;
        
        const queue = await db.allAsync(sql);
        
        res.json({
            message: 'success',
            data: queue,
            metadata: {
                total: queue.length
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo cola simplificada:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'QUEUE_FETCH_ERROR',
            details: error.message
        });
    }
});

// GET templates simplificados
router.get('/templates-simple', async (req, res) => {
    try {
        console.log('📝 Obteniendo templates simplificados...');
        
        const sql = `
        SELECT nt.*, 
               COUNT(nq.id) as queue_count
        FROM NotificationTemplates nt
        LEFT JOIN NotificationQueue nq ON nt.id = nq.template_id AND nq.status = 'pending'
        GROUP BY nt.id 
        ORDER BY nt.created_at DESC`;
        
        const templates = await db.allAsync(sql);
        
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
        
        res.json({
            message: 'success',
            data: templates,
            metadata: { total: templates.length }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo templates simplificados:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'TEMPLATE_FETCH_ERROR',
            details: error.message
        });
    }
});

module.exports = router;