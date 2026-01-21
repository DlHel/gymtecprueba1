const express = require('express');
const router = express.Router();
const db = require('../db-adapter');

// ✅ Usar middleware centralizado del core
const { authenticateToken } = require('../core/middleware/auth.middleware');

/**
 * GYMTEC ERP - MÓDULO PLANIFICADOR
 * 
 * 🔧 CORREGIDO: Ahora combina MaintenanceTasks Y Tickets con due_date
 * para mostrar todo en el calendario del planificador.
 * 
 * Endpoints:
 * - GET /api/maintenance-tasks - Listar tareas + tickets para calendario
 * - GET /api/maintenance-tasks/technicians - Técnicos disponibles
 * - POST /api/maintenance-tasks - Crear nueva tarea
 * - PUT /api/maintenance-tasks/:id - Actualizar tarea
 * - DELETE /api/maintenance-tasks/:id - Eliminar tarea
 */

// ===================================================================
// GET - LISTAR TAREAS Y TICKETS (PARA CALENDARIO)
// ===================================================================

/**
 * @route GET /api/maintenance-tasks
 * @desc Obtener todas las tareas de mantenimiento Y tickets con fecha
 * @access Protegido - Requiere autenticación
 * 
 * ✅ CORREGIDO: Usa UNION para combinar MaintenanceTasks y Tickets
 */
router.get('/', authenticateToken, (req, res) => {
    // Query combinada: MaintenanceTasks + Tickets con due_date
    const sql = `
        SELECT
            mt.id,
            mt.title,
            mt.description,
            mt.type,
            mt.status,
            mt.priority,
            DATE_FORMAT(mt.scheduled_date, '%Y-%m-%d') as scheduled_date,
            mt.scheduled_time,
            mt.estimated_duration,
            mt.actual_duration,
            mt.notes,
            mt.is_preventive,
            mt.started_at,
            mt.completed_at,
            mt.created_at,
            mt.updated_at,
            e.name as equipment_name,
            e.serial_number as equipment_serial,
            em.name as equipment_model,
            u.username as technician_name,
            c.name as client_name,
            l.name as location_name,
            'task' as source_type
        FROM MaintenanceTasks mt
        LEFT JOIN Equipment e ON mt.equipment_id = e.id
        LEFT JOIN EquipmentModels em ON e.model_id = em.id
        LEFT JOIN Users u ON mt.technician_id = u.id
        LEFT JOIN Clients c ON mt.client_id = c.id
        LEFT JOIN Locations l ON mt.location_id = l.id
        
        UNION ALL
        
        SELECT
            t.id,
            t.title,
            t.description,
            'ticket' as type,
            t.status,
            t.priority,
            DATE_FORMAT(t.due_date, '%Y-%m-%d') as scheduled_date,
            NULL as scheduled_time,
            NULL as estimated_duration,
            NULL as actual_duration,
            NULL as notes,
            0 as is_preventive,
            NULL as started_at,
            NULL as completed_at,
            t.created_at,
            t.updated_at,
            e.name as equipment_name,
            e.serial_number as equipment_serial,
            em.name as equipment_model,
            u.username as technician_name,
            c.name as client_name,
            l.name as location_name,
            'ticket' as source_type
        FROM Tickets t
        LEFT JOIN Equipment e ON t.equipment_id = e.id
        LEFT JOIN EquipmentModels em ON e.model_id = em.id
        LEFT JOIN Users u ON t.assigned_to = u.id
        LEFT JOIN Clients c ON t.client_id = c.id
        LEFT JOIN Locations l ON t.location_id = l.id
        WHERE t.due_date IS NOT NULL
        
        ORDER BY scheduled_date DESC, scheduled_time ASC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Error getting maintenance tasks:', err.message);
            return res.status(500).json({
                error: 'Error retrieving maintenance tasks',
                code: 'DB_ERROR'
            });
        }

        console.log(`✅ Planificador: ${rows ? rows.length : 0} items (tasks + tickets)`);
        res.json({
            message: 'success',
            data: rows || [],
            metadata: {
                total: rows ? rows.length : 0,
                includes_tickets: true
            }
        });
    });
});

// ===================================================================
// GET - TÉCNICOS DISPONIBLES
// ===================================================================

router.get('/technicians', authenticateToken, (req, res) => {
    const sql = `
        SELECT id, username as name, email, role 
        FROM Users 
        WHERE role = 'Technician' OR role = 'technician' OR role = 'Técnico'
        ORDER BY username
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Error getting technicians:', err.message);
            return res.status(500).json({
                error: 'Error retrieving technicians',
                code: 'DB_ERROR'
            });
        }

        res.json({
            message: 'success',
            data: rows || []
        });
    });
});

// ===================================================================
// POST - CREAR NUEVA TAREA
// ===================================================================

router.post('/', authenticateToken, (req, res) => {
    const {
        title,
        description,
        type = 'maintenance',
        status = 'pending',
        priority = 'Media',
        scheduled_date,
        scheduled_time,
        estimated_duration,
        equipment_id,
        technician_id,
        client_id,
        location_id,
        notes,
        is_preventive = false
    } = req.body;

    if (!title || !scheduled_date) {
        return res.status(400).json({
            error: 'Título y fecha programada son requeridos',
            code: 'VALIDATION_ERROR'
        });
    }

    const sql = `
        INSERT INTO MaintenanceTasks (
            title, description, type, status, priority,
            scheduled_date, scheduled_time, estimated_duration,
            equipment_id, technician_id, client_id, location_id,
            notes, is_preventive, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [
        title, description, type, status, priority,
        scheduled_date, scheduled_time, estimated_duration,
        equipment_id, technician_id, client_id, location_id,
        notes, is_preventive ? 1 : 0, req.user.id
    ], function(err) {
        if (err) {
            console.error('❌ Error creating maintenance task:', err.message);
            return res.status(500).json({
                error: 'Error creating maintenance task',
                code: 'DB_ERROR'
            });
        }

        console.log(`✅ Tarea de mantenimiento creada: ID ${this.lastID}`);
        res.status(201).json({
            message: 'Tarea creada exitosamente',
            data: { id: this.lastID, title }
        });
    });
});

// ===================================================================
// PUT - ACTUALIZAR TAREA
// ===================================================================

router.put('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const {
        title,
        description,
        type,
        status,
        priority,
        scheduled_date,
        scheduled_time,
        estimated_duration,
        actual_duration,
        equipment_id,
        technician_id,
        client_id,
        location_id,
        notes,
        is_preventive
    } = req.body;

    const sql = `
        UPDATE MaintenanceTasks SET
            title = COALESCE(?, title),
            description = COALESCE(?, description),
            type = COALESCE(?, type),
            status = COALESCE(?, status),
            priority = COALESCE(?, priority),
            scheduled_date = COALESCE(?, scheduled_date),
            scheduled_time = COALESCE(?, scheduled_time),
            estimated_duration = COALESCE(?, estimated_duration),
            actual_duration = COALESCE(?, actual_duration),
            equipment_id = COALESCE(?, equipment_id),
            technician_id = COALESCE(?, technician_id),
            client_id = COALESCE(?, client_id),
            location_id = COALESCE(?, location_id),
            notes = COALESCE(?, notes),
            is_preventive = COALESCE(?, is_preventive),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    db.run(sql, [
        title, description, type, status, priority,
        scheduled_date, scheduled_time, estimated_duration, actual_duration,
        equipment_id, technician_id, client_id, location_id,
        notes, is_preventive !== undefined ? (is_preventive ? 1 : 0) : null,
        id
    ], function(err) {
        if (err) {
            console.error('❌ Error updating maintenance task:', err.message);
            return res.status(500).json({
                error: 'Error updating maintenance task',
                code: 'DB_ERROR'
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                error: 'Tarea no encontrada',
                code: 'NOT_FOUND'
            });
        }

        console.log(`✅ Tarea actualizada: ID ${id}`);
        res.json({
            message: 'Tarea actualizada exitosamente',
            data: { id: parseInt(id) }
        });
    });
});

// ===================================================================
// DELETE - ELIMINAR TAREA
// ===================================================================

router.delete('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM MaintenanceTasks WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('❌ Error deleting maintenance task:', err.message);
            return res.status(500).json({
                error: 'Error deleting maintenance task',
                code: 'DB_ERROR'
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                error: 'Tarea no encontrada',
                code: 'NOT_FOUND'
            });
        }

        console.log(`✅ Tarea eliminada: ID ${id}`);
        res.json({
            message: 'Tarea eliminada exitosamente',
            data: { id: parseInt(id) }
        });
    });
});

module.exports = router;
