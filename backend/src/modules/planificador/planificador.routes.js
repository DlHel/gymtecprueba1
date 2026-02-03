/**
 * GYMTEC ERP - Módulo Planificador
 * Combina MaintenanceTasks + Tickets con due_date para el calendario
 */

const express = require('express');
const router = express.Router();
const db = require('../../db-adapter');
const { authenticateToken } = require('../../core/middleware/auth.middleware');

// GET /api/planificador/events - Obtiene todos los eventos del calendario
router.get('/planificador/events', authenticateToken, (req, res) => {
    console.log('📅 GET /api/planificador/events');
    
    // Query para MaintenanceTasks
    const tasksSql = `
        SELECT 
            mt.id,
            'maintenance' as event_type,
            mt.title,
            mt.description,
            mt.type,
            mt.status,
            mt.priority,
            mt.scheduled_date as event_date,
            mt.scheduled_time as event_time,
            e.name as equipment_name,
            u.username as technician_name,
            c.name as client_name,
            l.name as location_name
        FROM MaintenanceTasks mt
        LEFT JOIN Equipment e ON mt.equipment_id = e.id
        LEFT JOIN Users u ON mt.technician_id = u.id
        LEFT JOIN Clients c ON mt.client_id = c.id
        LEFT JOIN Locations l ON mt.location_id = l.id
        WHERE mt.scheduled_date IS NOT NULL
    `;
    
    // Query para Tickets con due_date
    const ticketsSql = `
        SELECT 
            t.id,
            'ticket' as event_type,
            t.title,
            t.description,
            t.ticket_type as type,
            t.status,
            t.priority,
            t.due_date as event_date,
            NULL as event_time,
            e.name as equipment_name,
            u.username as technician_name,
            c.name as client_name,
            l.name as location_name
        FROM Tickets t
        LEFT JOIN Equipment e ON t.equipment_id = e.id
        LEFT JOIN Users u ON t.assigned_technician_id = u.id
        LEFT JOIN Clients c ON t.client_id = c.id
        LEFT JOIN Locations l ON t.location_id = l.id
        WHERE t.due_date IS NOT NULL
    `;
    
    // Ejecutar ambas queries
    db.all(tasksSql, [], (err1, tasks) => {
        if (err1) {
            console.error('❌ Error obteniendo maintenance tasks:', err1.message);
            tasks = [];
        }
        
        db.all(ticketsSql, [], (err2, tickets) => {
            if (err2) {
                console.error('❌ Error obteniendo tickets:', err2.message);
                tickets = [];
            }
            
            // Combinar y ordenar por fecha
            const allEvents = [...(tasks || []), ...(tickets || [])].sort((a, b) => {
                const dateA = new Date(a.event_date);
                const dateB = new Date(b.event_date);
                return dateA - dateB;
            });
            
            console.log(`✅ Planificador events: ${tasks?.length || 0} tasks + ${tickets?.length || 0} tickets = ${allEvents.length} total`);
            
            res.json({
                message: 'success',
                data: allEvents,
                metadata: {
                    maintenance_tasks: tasks?.length || 0,
                    tickets: tickets?.length || 0,
                    total: allEvents.length
                }
            });
        });
    });
});

module.exports = router;
