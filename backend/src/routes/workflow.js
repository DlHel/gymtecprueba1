/**
 * GYMTEC ERP - APIs para Workflow Mejorado de Tickets
 * Implementación de Ideas del Documento LAMP - Fase 1
 * 
 * Funcionalidades:
 * - Workflow con guardias de estado
 * - Transiciones controladas de estados
 * - Validaciones para cierre de tickets
 * - Gestión automática de SLA
 */

const express = require('express');
const router = express.Router();
const db = require('../db-adapter');

// =====================================================
// WORKFLOW STATES Y TRANSICIONES VÁLIDAS
// =====================================================

const WORKFLOW_STATES = {
    CREADO: 'creado',
    ASIGNADO: 'asignado', 
    EN_PROGRESO: 'en_progreso',
    ESPERANDO_REPUESTOS: 'esperando_repuestos',
    ESPERANDO_CLIENTE: 'esperando_cliente',
    EN_REVISION: 'en_revision',
    COMPLETADO: 'completado',
    CERRADO: 'cerrado'
};

const VALID_TRANSITIONS = {
    [WORKFLOW_STATES.CREADO]: [WORKFLOW_STATES.ASIGNADO],
    [WORKFLOW_STATES.ASIGNADO]: [WORKFLOW_STATES.EN_PROGRESO, WORKFLOW_STATES.ESPERANDO_REPUESTOS],
    [WORKFLOW_STATES.EN_PROGRESO]: [
        WORKFLOW_STATES.ESPERANDO_REPUESTOS, 
        WORKFLOW_STATES.ESPERANDO_CLIENTE,
        WORKFLOW_STATES.EN_REVISION,
        WORKFLOW_STATES.COMPLETADO
    ],
    [WORKFLOW_STATES.ESPERANDO_REPUESTOS]: [WORKFLOW_STATES.EN_PROGRESO],
    [WORKFLOW_STATES.ESPERANDO_CLIENTE]: [WORKFLOW_STATES.EN_PROGRESO],
    [WORKFLOW_STATES.EN_REVISION]: [WORKFLOW_STATES.EN_PROGRESO, WORKFLOW_STATES.COMPLETADO],
    [WORKFLOW_STATES.COMPLETADO]: [WORKFLOW_STATES.CERRADO],
    [WORKFLOW_STATES.CERRADO]: [] // Estado final
};

// =====================================================
// 1. GESTIÓN DE WORKFLOW DE TICKETS
// =====================================================

/**
 * POST /api/tickets/:ticketId/workflow/transition - Cambiar estado del ticket
 */
router.post('/tickets/:ticketId/workflow/transition', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { new_stage, notes, force = false } = req.body;
        
        // Obtener ticket actual
        const ticket = await db.get('SELECT * FROM Tickets WHERE id = ?', [ticketId]);
        
        if (!ticket) {
            return res.status(404).json({
                error: 'Ticket no encontrado',
                code: 'TICKET_NOT_FOUND'
            });
        }
        
        const currentStage = ticket.workflow_stage || WORKFLOW_STATES.CREADO;
        
        // Validar transición (a menos que sea forzada por admin)
        if (!force && !VALID_TRANSITIONS[currentStage]?.includes(new_stage)) {
            return res.status(400).json({
                error: `Transición no válida de '${currentStage}' a '${new_stage}'`,
                code: 'INVALID_WORKFLOW_TRANSITION',
                data: {
                    current_stage: currentStage,
                    attempted_stage: new_stage,
                    valid_transitions: VALID_TRANSITIONS[currentStage] || []
                }
            });
        }
        
        // Validaciones específicas por estado
        const validationResult = await validateWorkflowTransition(ticket, new_stage);
        if (!validationResult.valid && !force) {
            return res.status(400).json({
                error: validationResult.message,
                code: validationResult.code,
                data: validationResult.data
            });
        }
        
        // Ejecutar transición
        const transitionResult = await executeWorkflowTransition(ticket, new_stage, notes, req.user);
        
        res.json({
            message: 'Transición de workflow ejecutada exitosamente',
            data: transitionResult
        });
        
    } catch (error) {
        console.error('Error in workflow transition:', error);
        res.status(500).json({ 
            error: 'Error al ejecutar transición de workflow',
            code: 'WORKFLOW_TRANSITION_ERROR' 
        });
    }
});

/**
 * GET /api/tickets/:ticketId/workflow/status - Obtener estado actual del workflow
 */
router.get('/tickets/:ticketId/workflow/status', async (req, res) => {
    try {
        const { ticketId } = req.params;
        
        const ticket = await db.get(`
            SELECT t.*, c.name as client_name, tc.completion_percentage,
                   tc.status as checklist_status
            FROM Tickets t
            LEFT JOIN Clients c ON t.client_id = c.id
            LEFT JOIN TicketChecklist tc ON t.id = tc.ticket_id
            WHERE t.id = ?
        `, [ticketId]);
        
        if (!ticket) {
            return res.status(404).json({
                error: 'Ticket no encontrado',
                code: 'TICKET_NOT_FOUND'
            });
        }
        
        const currentStage = ticket.workflow_stage || WORKFLOW_STATES.CREADO;
        
        // Obtener validaciones para el estado actual
        const validations = await getWorkflowValidations(ticket);
        
        res.json({
            message: 'success',
            data: {
                ticket_id: ticketId,
                current_stage: currentStage,
                valid_transitions: VALID_TRANSITIONS[currentStage] || [],
                checklist_completed: ticket.checklist_completed === 1,
                checklist_percentage: ticket.completion_percentage || 0,
                can_close: ticket.can_close === 1,
                sla_status: ticket.sla_status,
                sla_deadline: ticket.sla_deadline,
                validations
            }
        });
        
    } catch (error) {
        console.error('Error fetching workflow status:', error);
        res.status(500).json({ 
            error: 'Error al obtener estado del workflow',
            code: 'WORKFLOW_STATUS_ERROR' 
        });
    }
});

/**
 * PUT /api/tickets/:ticketId/assign - Asignar ticket a técnico
 */
router.put('/tickets/:ticketId/assign', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { technician_id, auto_start = false } = req.body;
        
        // Validar que el técnico existe
        const technician = await db.get('SELECT id, username FROM Users WHERE id = ?', [technician_id]);
        if (!technician) {
            return res.status(400).json({
                error: 'Técnico no encontrado',
                code: 'TECHNICIAN_NOT_FOUND'
            });
        }
        
        // Actualizar ticket
        const newStage = auto_start ? WORKFLOW_STATES.EN_PROGRESO : WORKFLOW_STATES.ASIGNADO;
        
        await db.run(`
            UPDATE Tickets SET
                assigned_technician_id = ?,
                workflow_stage = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [technician_id, newStage, ticketId]);
        
        // Agregar nota de asignación
        await db.run(`
            INSERT INTO TicketNotes (ticket_id, note, note_type, author, is_internal)
            VALUES (?, ?, 'General', ?, TRUE)
        `, [
            ticketId,
            `Ticket asignado a técnico: ${technician.username}`,
            req.user?.username || 'Sistema'
        ]);
        
        // Calcular SLA si no existe
        if (auto_start) {
            await calculateTicketSLA(ticketId);
        }
        
        res.json({
            message: 'Ticket asignado exitosamente',
            data: {
                ticket_id: ticketId,
                assigned_technician: technician.username,
                new_stage: newStage
            }
        });
        
    } catch (error) {
        console.error('Error assigning ticket:', error);
        res.status(500).json({ 
            error: 'Error al asignar ticket',
            code: 'TICKET_ASSIGN_ERROR' 
        });
    }
});

// =====================================================
// 2. FUNCIONES DE VALIDACIÓN Y TRANSICIÓN
// =====================================================

async function validateWorkflowTransition(ticket, newStage) {
    try {
        switch (newStage) {
            case WORKFLOW_STATES.EN_PROGRESO:
                if (!ticket.assigned_technician_id) {
                    return {
                        valid: false,
                        message: 'Ticket debe estar asignado a un técnico antes de iniciar',
                        code: 'TECHNICIAN_NOT_ASSIGNED'
                    };
                }
                break;
                
            case WORKFLOW_STATES.COMPLETADO:
                // Verificar que el checklist esté completo (si existe)
                const checklist = await db.get(
                    'SELECT completion_percentage FROM TicketChecklist WHERE ticket_id = ?',
                    [ticket.id]
                );
                
                if (checklist && checklist.completion_percentage < 100) {
                    return {
                        valid: false,
                        message: 'Checklist debe estar 100% completo antes de marcar como completado',
                        code: 'CHECKLIST_NOT_COMPLETE',
                        data: { completion_percentage: checklist.completion_percentage }
                    };
                }
                break;
                
            case WORKFLOW_STATES.CERRADO:
                if (ticket.workflow_stage !== WORKFLOW_STATES.COMPLETADO) {
                    return {
                        valid: false,
                        message: 'Ticket debe estar completado antes de cerrar',
                        code: 'TICKET_NOT_COMPLETED'
                    };
                }
                
                if (!ticket.can_close) {
                    return {
                        valid: false,
                        message: 'Ticket no cumple con los requisitos para cierre',
                        code: 'CANNOT_CLOSE_TICKET'
                    };
                }
                break;
        }
        
        return { valid: true };
        
    } catch (error) {
        console.error('Error validating workflow transition:', error);
        return {
            valid: false,
            message: 'Error en validación de transición',
            code: 'VALIDATION_ERROR'
        };
    }
}

async function executeWorkflowTransition(ticket, newStage, notes, user) {
    try {
        const timestamp = new Date().toISOString();
        
        // Actualizar estado del ticket
        await db.run(`
            UPDATE Tickets SET
                workflow_stage = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [newStage, ticket.id]);
        
        // Agregar nota de transición
        const transitionNote = `Estado cambiado a: ${newStage}${notes ? `. Notas: ${notes}` : ''}`;
        await db.run(`
            INSERT INTO TicketNotes (ticket_id, note, note_type, author, is_internal)
            VALUES (?, ?, 'Seguimiento', ?, TRUE)
        `, [ticket.id, transitionNote, user?.username || 'Sistema']);
        
        // Acciones específicas por estado
        switch (newStage) {
            case WORKFLOW_STATES.EN_PROGRESO:
                // Iniciar tracking de tiempo si no existe
                const existingTime = await db.get(
                    'SELECT id FROM TicketTimeEntries WHERE ticket_id = ? AND end_time IS NULL',
                    [ticket.id]
                );
                
                if (!existingTime) {
                    await db.run(`
                        INSERT INTO TicketTimeEntries (ticket_id, technician_id, start_time, description)
                        VALUES (?, ?, ?, 'Inicio de trabajo en ticket')
                    `, [ticket.id, ticket.assigned_technician_id, timestamp]);
                }
                
                // Calcular SLA
                await calculateTicketSLA(ticket.id);
                break;
                
            case WORKFLOW_STATES.COMPLETADO:
                // Finalizar tracking de tiempo
                await db.run(`
                    UPDATE TicketTimeEntries SET
                        end_time = ?,
                        duration_seconds = ROUND((JULIANDAY(?) - JULIANDAY(start_time)) * 86400)
                    WHERE ticket_id = ? AND end_time IS NULL
                `, [timestamp, timestamp, ticket.id]);
                
                // Calcular tiempo total de resolución
                const createdAt = new Date(ticket.created_at);
                const completedAt = new Date(timestamp);
                const resolutionMinutes = Math.round((completedAt - createdAt) / (1000 * 60));
                
                await db.run(`
                    UPDATE Tickets SET
                        resolution_time_minutes = ?,
                        can_close = TRUE
                    WHERE id = ?
                `, [resolutionMinutes, ticket.id]);
                break;
                
            case WORKFLOW_STATES.CERRADO:
                // Marcar como cerrado definitivamente
                await db.run(`
                    UPDATE Tickets SET
                        status = 'Cerrado'
                    WHERE id = ?
                `, [ticket.id]);
                break;
        }
        
        return {
            ticket_id: ticket.id,
            previous_stage: ticket.workflow_stage,
            new_stage: newStage,
            transition_time: timestamp,
            notes: notes || null
        };
        
    } catch (error) {
        console.error('Error executing workflow transition:', error);
        throw error;
    }
}

async function getWorkflowValidations(ticket) {
    try {
        const validations = [];
        
        // Validación de asignación
        if (!ticket.assigned_technician_id) {
            validations.push({
                type: 'warning',
                message: 'Ticket no está asignado a ningún técnico',
                code: 'NO_TECHNICIAN_ASSIGNED'
            });
        }
        
        // Validación de checklist
        if (ticket.completion_percentage !== null && ticket.completion_percentage < 100) {
            validations.push({
                type: 'warning',
                message: `Checklist incompleto (${ticket.completion_percentage}%)`,
                code: 'CHECKLIST_INCOMPLETE'
            });
        }
        
        // Validación de SLA
        if (ticket.sla_status === 'vencido') {
            validations.push({
                type: 'error',
                message: 'SLA vencido',
                code: 'SLA_EXPIRED'
            });
        } else if (ticket.sla_status === 'en_riesgo') {
            validations.push({
                type: 'warning',
                message: 'SLA en riesgo de vencimiento',
                code: 'SLA_AT_RISK'
            });
        }
        
        return validations;
        
    } catch (error) {
        console.error('Error getting workflow validations:', error);
        return [];
    }
}

async function calculateTicketSLA(ticketId) {
    try {
        // Obtener configuraciones SLA por defecto
        const slaConfig = await db.all(`
            SELECT setting_key, setting_value 
            FROM SystemSettings 
            WHERE category = 'sla' AND setting_key LIKE 'sla_default_%'
        `);
        
        const slaHours = {};
        slaConfig.forEach(config => {
            const priority = config.setting_key.replace('sla_default_', '').replace('_hours', '');
            slaHours[priority] = parseInt(config.setting_value, 10);
        });
        
        // Obtener ticket
        const ticket = await db.get('SELECT * FROM Tickets WHERE id = ?', [ticketId]);
        if (!ticket) return;
        
        // Determinar horas SLA según prioridad
        let hours;
        switch (ticket.priority) {
            case 'Urgente': hours = slaHours.p1 || 4; break;
            case 'Alta': hours = slaHours.p2 || 8; break;
            case 'Media': hours = slaHours.p3 || 24; break;
            case 'Baja': hours = slaHours.p4 || 72; break;
            default: hours = 24;
        }
        
        // Calcular deadline
        const createdAt = new Date(ticket.created_at);
        const deadline = new Date(createdAt.getTime() + (hours * 60 * 60 * 1000));
        
        // Determinar estado SLA
        const now = new Date();
        const progress = (now - createdAt) / (deadline - createdAt);
        
        let status;
        if (now > deadline) {
            status = 'vencido';
        } else if (progress >= 0.75) {
            status = 'en_riesgo';
        } else {
            status = 'cumplido';
        }
        
        // Actualizar ticket
        await db.run(`
            UPDATE Tickets SET
                sla_deadline = ?,
                sla_status = ?
            WHERE id = ?
        `, [deadline.toISOString(), status, ticketId]);
        
    } catch (error) {
        console.error('Error calculating SLA:', error);
    }
}

module.exports = router;
