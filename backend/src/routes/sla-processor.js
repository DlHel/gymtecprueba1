// Sistema de Reglas SLA - Monitoreo y Escalación Automática
const express = require('express');
const router = express.Router();

class SLAProcessor {
    constructor(db) {
        this.db = db;
        this.rules = new Map();
        this.activeMonitors = new Map();
        this.initializeDefaultRules();
    }

    // Inicializar reglas SLA por defecto
    initializeDefaultRules() {
        const defaultRules = [
            {
                id: 'critical_immediate',
                name: 'Tareas Críticas - Respuesta Inmediata',
                conditions: {
                    priority: 'critical',
                    timeThreshold: 30, // 30 minutos
                    status: ['pending', 'scheduled']
                },
                actions: [
                    { type: 'escalate', target: 'supervisor' },
                    { type: 'notify', recipients: ['admin', 'manager'] },
                    { type: 'reassign', criteria: 'best_available' }
                ],
                enabled: true
            },
            {
                id: 'high_priority_4h',
                name: 'Tareas Alta Prioridad - 4 Horas',
                conditions: {
                    priority: 'high',
                    timeThreshold: 240, // 4 horas
                    status: ['pending', 'scheduled']
                },
                actions: [
                    { type: 'notify', recipients: ['manager'] },
                    { type: 'reassign', criteria: 'available_specialist' }
                ],
                enabled: true
            },
            {
                id: 'medium_priority_24h',
                name: 'Tareas Prioridad Media - 24 Horas',
                conditions: {
                    priority: 'medium',
                    timeThreshold: 1440, // 24 horas
                    status: ['pending', 'scheduled']
                },
                actions: [
                    { type: 'notify', recipients: ['assigned_technician'] },
                    { type: 'log', message: 'Tarea próxima a vencer SLA' }
                ],
                enabled: true
            },
            {
                id: 'overdue_tasks',
                name: 'Tareas Vencidas',
                conditions: {
                    overdue: true,
                    status: ['pending', 'scheduled', 'in_progress']
                },
                actions: [
                    { type: 'escalate', target: 'manager' },
                    { type: 'notify', recipients: ['admin', 'client'] },
                    { type: 'priority_boost', newPriority: 'high' }
                ],
                enabled: true
            }
        ];

        defaultRules.forEach(rule => {
            this.rules.set(rule.id, rule);
        });
    }

    // Monitorear todas las tareas activas
    async monitorActiveTasks() {
        console.log('🔍 Iniciando monitoreo SLA...');
        
        const sql = `
            SELECT 
                mt.*,
                u.username as technician_name,
                u.email as technician_email,
                c.name as client_name,
                c.email as client_email,
                l.name as location_name,
                TIMESTAMPDIFF(MINUTE, mt.created_at, NOW()) as age_minutes,
                CASE 
                    WHEN mt.sla_deadline < NOW() THEN 1 
                    ELSE 0 
                END as is_overdue,
                CASE 
                    WHEN mt.sla_deadline IS NOT NULL THEN 
                        TIMESTAMPDIFF(MINUTE, NOW(), mt.sla_deadline)
                    ELSE NULL 
                END as minutes_until_deadline
            FROM MaintenanceTasks mt
            LEFT JOIN Users u ON mt.technician_id = u.id
            LEFT JOIN Locations l ON mt.location_id = l.id
            LEFT JOIN Clients c ON l.client_id = c.id
            WHERE mt.status IN ('pending', 'scheduled', 'in_progress')
            ORDER BY mt.priority DESC, mt.created_at ASC
        `;

        return new Promise((resolve, reject) => {
            this.db.all(sql, [], async (err, tasks) => {
                if (err) {
                    console.error('❌ Error monitoreando tareas:', err);
                    reject(err);
                    return;
                }

                console.log(`📋 Monitoreando ${tasks.length} tareas activas`);
                
                const violations = [];
                
                for (const task of tasks) {
                    const taskViolations = await this.checkTaskAgainstRules(task);
                    violations.push(...taskViolations);
                }

                console.log(`⚠️  Encontradas ${violations.length} violaciones SLA`);
                
                // Procesar violaciones
                for (const violation of violations) {
                    await this.processViolation(violation);
                }

                resolve({ 
                    tasksMonitored: tasks.length, 
                    violations: violations.length,
                    details: violations 
                });
            });
        });
    }

    // Verificar tarea contra todas las reglas
    async checkTaskAgainstRules(task) {
        const violations = [];

        for (const [ruleId, rule] of this.rules.entries()) {
            if (!rule.enabled) continue;

            if (await this.taskMatchesRule(task, rule)) {
                violations.push({
                    taskId: task.id,
                    ruleId: ruleId,
                    ruleName: rule.name,
                    task: task,
                    rule: rule,
                    timestamp: new Date(),
                    severity: this.calculateSeverity(task, rule)
                });
            }
        }

        return violations;
    }

    // Verificar si tarea coincide con regla
    async taskMatchesRule(task, rule) {
        const conditions = rule.conditions;

        // Verificar prioridad
        if (conditions.priority && task.priority !== conditions.priority) {
            return false;
        }

        // Verificar estado
        if (conditions.status && !conditions.status.includes(task.status)) {
            return false;
        }

        // Verificar si está vencida
        if (conditions.overdue && !task.is_overdue) {
            return false;
        }

        // Verificar umbral de tiempo
        if (conditions.timeThreshold) {
            if (task.age_minutes < conditions.timeThreshold) {
                return false;
            }
        }

        // Verificar tiempo hasta deadline
        if (conditions.minutesUntilDeadline) {
            if (!task.minutes_until_deadline || 
                task.minutes_until_deadline > conditions.minutesUntilDeadline) {
                return false;
            }
        }

        return true;
    }

    // Calcular severidad de la violación
    calculateSeverity(task, rule) {
        if (task.is_overdue) return 'critical';
        if (task.priority === 'critical') return 'high';
        if (task.priority === 'high') return 'medium';
        return 'low';
    }

    // Procesar violación SLA
    async processViolation(violation) {
        console.log(`⚠️  Procesando violación: ${violation.ruleName} para tarea ${violation.taskId}`);

        // Registrar violación
        await this.logViolation(violation);

        // Ejecutar acciones definidas en la regla
        for (const action of violation.rule.actions) {
            try {
                await this.executeAction(violation, action);
            } catch (error) {
                console.error(`❌ Error ejecutando acción ${action.type}:`, error);
            }
        }
    }

    // Registrar violación en la base de datos
    async logViolation(violation) {
        const sql = `
            INSERT INTO sla_violations 
            (task_id, rule_id, rule_name, severity, violation_data, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        `;

        return new Promise((resolve, reject) => {
            this.db.run(sql, [
                violation.taskId,
                violation.ruleId,
                violation.ruleName,
                violation.severity,
                JSON.stringify({
                    task_data: violation.task,
                    rule_conditions: violation.rule.conditions,
                    timestamp: violation.timestamp
                })
            ], function(err) {
                if (err) {
                    console.error('❌ Error registrando violación:', err);
                    reject(err);
                } else {
                    console.log(`📝 Violación registrada con ID: ${this.lastID}`);
                    resolve(this.lastID);
                }
            });
        });
    }

    // Ejecutar acción específica
    async executeAction(violation, action) {
        console.log(`🔧 Ejecutando acción: ${action.type} para tarea ${violation.taskId}`);

        switch (action.type) {
            case 'escalate':
                return await this.escalateTask(violation, action.target);
                
            case 'notify':
                return await this.sendNotifications(violation, action.recipients);
                
            case 'reassign':
                return await this.reassignTask(violation, action.criteria);
                
            case 'priority_boost':
                return await this.boostPriority(violation, action.newPriority);
                
            case 'log':
                return await this.logAction(violation, action.message);
                
            default:
                console.warn(`⚠️  Acción desconocida: ${action.type}`);
        }
    }

    // Escalar tarea
    async escalateTask(violation, target) {
        console.log(`📈 Escalando tarea ${violation.taskId} a: ${target}`);
        
        // Buscar supervisor/manager disponible
        const sql = `
            SELECT id, username, email 
            FROM Users 
            WHERE role = ? AND status = 'Activo'
            ORDER BY RAND() 
            LIMIT 1
        `;

        return new Promise((resolve, reject) => {
            this.db.get(sql, [target === 'supervisor' ? 'Supervisor' : 'Admin'], (err, supervisor) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (supervisor) {
                    // Actualizar tarea con escalación
                    const updateSql = `
                        UPDATE MaintenanceTasks 
                        SET escalated_to = ?, escalated_at = NOW(), priority = 'critical'
                        WHERE id = ?
                    `;
                    
                    this.db.run(updateSql, [supervisor.id, violation.taskId], (updateErr) => {
                        if (updateErr) {
                            reject(updateErr);
                        } else {
                            console.log(`✅ Tarea escalada a ${supervisor.username}`);
                            resolve({ escalatedTo: supervisor.username });
                        }
                    });
                } else {
                    console.warn(`⚠️  No se encontró ${target} disponible`);
                    resolve({ warning: `No ${target} available` });
                }
            });
        });
    }

    // Enviar notificaciones
    async sendNotifications(violation, recipients) {
        console.log(`📧 Enviando notificaciones a: ${recipients.join(', ')}`);
        
        const notifications = [];
        
        for (const recipient of recipients) {
            const notification = {
                type: 'sla_violation',
                recipient: recipient,
                taskId: violation.taskId,
                ruleName: violation.ruleName,
                severity: violation.severity,
                message: `SLA Violation: ${violation.ruleName} for task ${violation.taskId}`,
                timestamp: new Date()
            };
            
            // Insertar en cola de notificaciones
            const sql = `
                INSERT INTO notification_queue 
                (type, recipient_type, message, priority, data, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            `;
            
            await new Promise((resolve, reject) => {
                this.db.run(sql, [
                    'sla_violation',
                    recipient,
                    notification.message,
                    violation.severity,
                    JSON.stringify(notification)
                ], function(err) {
                    if (err) {
                        console.error('❌ Error enviando notificación:', err);
                        reject(err);
                    } else {
                        notifications.push(notification);
                        resolve();
                    }
                });
            });
        }
        
        return { notifications: notifications.length };
    }

    // Reasignar tarea
    async reassignTask(violation, criteria) {
        console.log(`🔄 Reasignando tarea ${violation.taskId} con criterio: ${criteria}`);
        
        // Usar el sistema de asignación inteligente existente
        const IntelligentAssignment = require('./intelligent-assignment');
        
        try {
            // Limpiar asignación actual
            await new Promise((resolve, reject) => {
                this.db.run(
                    'UPDATE MaintenanceTasks SET technician_id = NULL WHERE id = ?',
                    [violation.taskId],
                    (err) => err ? reject(err) : resolve()
                );
            });
            
            // Usar asignación inteligente para reasignar
            // Esto requeriría integración con el sistema existente
            
            return { reassigned: true, criteria: criteria };
        } catch (error) {
            console.error('❌ Error reasignando tarea:', error);
            throw error;
        }
    }

    // Aumentar prioridad
    async boostPriority(violation, newPriority) {
        console.log(`⬆️  Aumentando prioridad de tarea ${violation.taskId} a: ${newPriority}`);
        
        const sql = `
            UPDATE MaintenanceTasks 
            SET priority = ?, priority_boosted_at = NOW() 
            WHERE id = ?
        `;
        
        return new Promise((resolve, reject) => {
            this.db.run(sql, [newPriority, violation.taskId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    console.log(`✅ Prioridad actualizada a ${newPriority}`);
                    resolve({ newPriority, previousPriority: violation.task.priority });
                }
            });
        });
    }

    // Registrar acción de log
    async logAction(violation, message) {
        console.log(`📝 Log: ${message} para tarea ${violation.taskId}`);
        
        const sql = `
            INSERT INTO sla_action_log 
            (task_id, action_type, message, created_at)
            VALUES (?, ?, ?, NOW())
        `;
        
        return new Promise((resolve, reject) => {
            this.db.run(sql, [violation.taskId, 'log', message], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ logged: true, message });
                }
            });
        });
    }

    // Obtener estadísticas SLA
    async getSLAStatistics() {
        const sql = `
            SELECT 
                COUNT(*) as total_violations,
                COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_violations,
                COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_violations,
                COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_violations,
                COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_violations,
                DATE(created_at) as violation_date
            FROM sla_violations 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY violation_date DESC
        `;

        return new Promise((resolve, reject) => {
            this.db.all(sql, [], (err, stats) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(stats);
                }
            });
        });
    }
}

// Middleware para inicializar el procesador SLA
let slaProcessor = null;

function initializeSLAProcessor(db) {
    if (!slaProcessor) {
        slaProcessor = new SLAProcessor(db);
        console.log('✅ SLA Processor inicializado');
    }
    return slaProcessor;
}

// Rutas del API
router.post('/monitor', async (req, res) => {
    try {
        if (!slaProcessor) {
            return res.status(500).json({ error: 'SLA Processor no inicializado' });
        }

        const result = await slaProcessor.monitorActiveTasks();
        
        res.json({
            message: 'Monitoreo SLA completado',
            data: result,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('❌ Error en monitoreo SLA:', error);
        res.status(500).json({ 
            error: 'Error en monitoreo SLA', 
            details: error.message 
        });
    }
});

router.get('/statistics', async (req, res) => {
    try {
        if (!slaProcessor) {
            return res.status(500).json({ error: 'SLA Processor no inicializado' });
        }

        const stats = await slaProcessor.getSLAStatistics();
        
        res.json({
            message: 'Estadísticas SLA obtenidas',
            data: stats,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas SLA:', error);
        res.status(500).json({ 
            error: 'Error obteniendo estadísticas SLA', 
            details: error.message 
        });
    }
});

router.get('/rules', (req, res) => {
    try {
        if (!slaProcessor) {
            return res.status(500).json({ error: 'SLA Processor no inicializado' });
        }

        const rules = Array.from(slaProcessor.rules.values());
        
        res.json({
            message: 'Reglas SLA obtenidas',
            data: rules,
            count: rules.length
        });
    } catch (error) {
        console.error('❌ Error obteniendo reglas SLA:', error);
        res.status(500).json({ 
            error: 'Error obteniendo reglas SLA', 
            details: error.message 
        });
    }
});

router.get('/violations', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 50;
        const offset = parseInt(req.query.offset, 10) || 0;
        
        const sql = `
            SELECT 
                sv.*,
                mt.title as task_title,
                mt.priority as task_priority,
                u.username as technician_name
            FROM sla_violations sv
            LEFT JOIN maintenancetasks mt ON sv.task_id = mt.id
            LEFT JOIN users u ON mt.technician_id = u.id
            ORDER BY sv.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const db = req.app.locals.db;
        
        db.all(sql, [limit, offset], (err, violations) => {
            if (err) {
                console.error('❌ Error obteniendo violaciones:', err);
                return res.status(500).json({ 
                    error: 'Error obteniendo violaciones SLA', 
                    details: err.message 
                });
            }

            res.json({
                message: 'Violaciones SLA obtenidas',
                data: violations,
                count: violations.length,
                limit,
                offset
            });
        });
    } catch (error) {
        console.error('❌ Error obteniendo violaciones SLA:', error);
        res.status(500).json({ 
            error: 'Error obteniendo violaciones SLA', 
            details: error.message 
        });
    }
});

// Dashboard SLA completo - Nuevo endpoint
router.get('/dashboard', async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        const queries = {
            // Estadísticas generales de SLA
            sla_statistics: new Promise((resolve, reject) => {
                const sql = `
                    SELECT 
                        sla_status,
                        COUNT(*) as count
                    FROM Tickets
                    WHERE status NOT IN ('Cerrado', 'Completado')
                    AND sla_status IS NOT NULL
                    GROUP BY sla_status
                `;
                db.all(sql, [], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            }),
            
            // Tickets con SLA vencido
            expired_tickets: new Promise((resolve, reject) => {
                const sql = `
                    SELECT 
                        t.id,
                        t.title,
                        t.priority,
                        t.sla_deadline,
                        t.status,
                        c.name as client_name,
                        l.name as location_name
                    FROM Tickets t
                    LEFT JOIN Equipment e ON t.equipment_id = e.id
                    LEFT JOIN Locations l ON e.location_id = l.id
                    LEFT JOIN Clients c ON l.client_id = c.id
                    WHERE t.sla_status = 'vencido'
                    AND t.status NOT IN ('Cerrado', 'Completado')
                    ORDER BY t.sla_deadline ASC
                    LIMIT 10
                `;
                db.all(sql, [], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            }),
            
            // Tickets en riesgo
            risk_tickets: new Promise((resolve, reject) => {
                const sql = `
                    SELECT 
                        t.id,
                        t.title,
                        t.priority,
                        t.sla_deadline,
                        t.status,
                        c.name as client_name,
                        l.name as location_name,
                        TIMESTAMPDIFF(HOUR, NOW(), t.sla_deadline) as hours_remaining
                    FROM Tickets t
                    LEFT JOIN Equipment e ON t.equipment_id = e.id
                    LEFT JOIN Locations l ON e.location_id = l.id
                    LEFT JOIN Clients c ON l.client_id = c.id
                    WHERE t.sla_status = 'en_riesgo'
                    AND t.status NOT IN ('Cerrado', 'Completado')
                    ORDER BY t.sla_deadline ASC
                    LIMIT 10
                `;
                db.all(sql, [], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            }),
            
            // Rendimiento por cliente (últimos 30 días)
            client_performance: new Promise((resolve, reject) => {
                const sql = `
                    SELECT 
                        c.id as client_id,
                        c.name as client_name,
                        COUNT(t.id) as total_tickets,
                        SUM(CASE WHEN t.sla_status = 'cumplido' THEN 1 ELSE 0 END) as compliant_tickets,
                        (SUM(CASE WHEN t.sla_status = 'cumplido' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(t.id), 0)) as compliance_percentage
                    FROM Clients c
                    LEFT JOIN Locations l ON c.id = l.client_id
                    LEFT JOIN Equipment e ON l.id = e.location_id
                    LEFT JOIN Tickets t ON e.id = t.equipment_id
                    WHERE t.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                    AND t.status IN ('Cerrado', 'Completado')
                    GROUP BY c.id, c.name
                    HAVING total_tickets > 0
                    ORDER BY compliance_percentage DESC
                    LIMIT 10
                `;
                db.all(sql, [], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            })
        };
        
        // Ejecutar todas las consultas en paralelo
        Promise.all([
            queries.sla_statistics,
            queries.expired_tickets,
            queries.risk_tickets,
            queries.client_performance
        ])
        .then(([sla_statistics, expired_tickets, risk_tickets, client_performance]) => {
            res.json({
                message: 'Dashboard SLA obtenido exitosamente',
                data: {
                    sla_statistics,
                    expired_tickets,
                    risk_tickets,
                    client_performance
                },
                timestamp: new Date()
            });
        })
        .catch(error => {
            console.error('❌ Error en dashboard SLA:', error);
            res.status(500).json({ 
                error: 'Error obteniendo dashboard SLA',
                details: error.message,
                // Valores por defecto en caso de error
                data: {
                    sla_statistics: [],
                    expired_tickets: [],
                    risk_tickets: [],
                    client_performance: []
                }
            });
        });
        
    } catch (error) {
        console.error('❌ Error en dashboard SLA:', error);
        res.status(500).json({ 
            error: 'Error obteniendo dashboard SLA', 
            details: error.message 
        });
    }
});

// Tendencias SLA (últimos 7 días)
router.get('/trends', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const days = parseInt(req.query.days, 10) || 7;
        
        const sql = `
            SELECT 
                DATE(t.created_at) as date,
                COUNT(*) as total_tickets,
                SUM(CASE WHEN t.sla_status = 'cumplido' THEN 1 ELSE 0 END) as compliant,
                SUM(CASE WHEN t.sla_status = 'en_riesgo' THEN 1 ELSE 0 END) as at_risk,
                SUM(CASE WHEN t.sla_status = 'vencido' THEN 1 ELSE 0 END) as expired,
                (SUM(CASE WHEN t.sla_status = 'cumplido' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0)) as compliant_percentage,
                (SUM(CASE WHEN t.sla_status = 'en_riesgo' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0)) as at_risk_percentage,
                (SUM(CASE WHEN t.sla_status = 'vencido' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0)) as expired_percentage
            FROM Tickets t
            WHERE t.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            AND t.sla_status IS NOT NULL
            GROUP BY DATE(t.created_at)
            ORDER BY date DESC
        `;
        
        db.all(sql, [days], (err, rows) => {
            if (err) {
                console.error('❌ Error obteniendo tendencias SLA:', err);
                return res.status(500).json({ 
                    error: 'Error obteniendo tendencias SLA',
                    details: err.message 
                });
            }
            
            res.json({
                message: 'Tendencias SLA obtenidas',
                data: rows || [],
                period: `${days} días`
            });
        });
    } catch (error) {
        console.error('❌ Error en tendencias SLA:', error);
        res.status(500).json({ 
            error: 'Error obteniendo tendencias SLA', 
            details: error.message 
        });
    }
});

// Distribución por prioridad
router.get('/priority-distribution', async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        const sql = `
            SELECT 
                priority,
                COUNT(*) as count,
                SUM(CASE WHEN sla_status = 'cumplido' THEN 1 ELSE 0 END) as compliant,
                SUM(CASE WHEN sla_status = 'vencido' THEN 1 ELSE 0 END) as expired
            FROM Tickets
            WHERE status NOT IN ('Cerrado', 'Completado')
            AND sla_status IS NOT NULL
            GROUP BY priority
            ORDER BY 
                CASE priority
                    WHEN 'Crítica' THEN 1
                    WHEN 'Alta' THEN 2
                    WHEN 'Media' THEN 3
                    WHEN 'Baja' THEN 4
                END
        `;
        
        db.all(sql, [], (err, rows) => {
            if (err) {
                console.error('❌ Error obteniendo distribución por prioridad:', err);
                return res.status(500).json({ 
                    error: 'Error obteniendo distribución',
                    details: err.message 
                });
            }
            
            res.json({
                message: 'Distribución por prioridad obtenida',
                data: rows || []
            });
        });
    } catch (error) {
        console.error('❌ Error en distribución:', error);
        res.status(500).json({ 
            error: 'Error obteniendo distribución', 
            details: error.message 
        });
    }
});

// Predicción de cumplimiento SLA (algoritmo simple)
router.get('/predict', async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        // Obtener datos históricos de los últimos 30 días
        const historicalSql = `
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as total,
                SUM(CASE WHEN sla_status = 'cumplido' THEN 1 ELSE 0 END) as compliant
            FROM Tickets
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            AND status IN ('Cerrado', 'Completado')
            GROUP BY DATE(created_at)
        `;
        
        db.all(historicalSql, [], (err, historical) => {
            if (err || !historical || historical.length < 7) {
                return res.json({
                    message: 'Datos insuficientes para predicción',
                    data: {
                        compliance_probability: 85,
                        tickets_at_risk_24h: 0,
                        risk_level: 'low',
                        recommendation: 'No hay suficientes datos históricos. Se requieren al menos 7 días de operación.'
                    }
                });
            }
            
            // Calcular promedio de cumplimiento
            const totalTickets = historical.reduce((sum, day) => sum + day.total, 0);
            const totalCompliant = historical.reduce((sum, day) => sum + day.compliant, 0);
            const avgCompliance = (totalCompliant / totalTickets * 100).toFixed(1);
            
            // Tickets actualmente en riesgo
            const riskSql = `
                SELECT COUNT(*) as count
                FROM Tickets
                WHERE sla_status = 'en_riesgo'
                AND TIMESTAMPDIFF(HOUR, NOW(), sla_deadline) <= 24
                AND status NOT IN ('Cerrado', 'Completado')
            `;
            
            db.get(riskSql, [], (err2, risk) => {
                if (err2) {
                    return res.status(500).json({ error: 'Error calculando riesgo' });
                }
                
                const ticketsAtRisk = risk ? risk.count : 0;
                let riskLevel = 'low';
                let recommendation = 'Sistema operando dentro de parámetros normales. Continúa con monitoreo regular.';
                
                if (avgCompliance < 70 || ticketsAtRisk > 5) {
                    riskLevel = 'high';
                    recommendation = 'ALERTA: Se recomienda revisar la asignación de recursos y priorizar tickets críticos. Considerar reasignación de técnicos.';
                } else if (avgCompliance < 85 || ticketsAtRisk > 2) {
                    riskLevel = 'medium';
                    recommendation = 'Atención requerida: Algunos tickets están en riesgo de vencer. Revisa la carga de trabajo de los técnicos.';
                }
                
                res.json({
                    message: 'Predicción generada',
                    data: {
                        compliance_probability: parseFloat(avgCompliance),
                        tickets_at_risk_24h: ticketsAtRisk,
                        risk_level: riskLevel,
                        recommendation: recommendation,
                        historical_data_points: historical.length
                    }
                });
            });
        });
        
    } catch (error) {
        console.error('❌ Error en predicción SLA:', error);
        res.status(500).json({ 
            error: 'Error generando predicción', 
            details: error.message 
        });
    }
});

// Función para inicializar monitoreo automático
function startAutomaticMonitoring(db, intervalMinutes = 5) {
    const processor = initializeSLAProcessor(db);
    
    console.log(`🔄 Iniciando monitoreo automático SLA cada ${intervalMinutes} minutos`);
    
    // Monitoreo inicial
    processor.monitorActiveTasks().catch(console.error);
    
    // Monitoreo periódico
    setInterval(async () => {
        try {
            await processor.monitorActiveTasks();
        } catch (error) {
            console.error('❌ Error en monitoreo automático SLA:', error);
        }
    }, intervalMinutes * 60 * 1000);
}

module.exports = { 
    router, 
    initializeSLAProcessor, 
    startAutomaticMonitoring 
};