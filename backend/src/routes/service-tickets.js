/**
 * GYMTEC ERP - APIs para Sistema de Tickets de Servicio
 * 
 * Sistema de tickets de servicio para mantenimiento completo de gimnasio
 * Diferencia con tickets normales: múltiples equipos por ticket
 * 
 * Endpoints implementados:
 * ✅ GET /api/service-tickets - Listar todos los service tickets
 * ✅ POST /api/service-tickets - Crear nuevo service ticket
 * ✅ GET /api/service-tickets/:id - Obtener service ticket específico
 * ✅ PUT /api/service-tickets/:id - Actualizar service ticket
 * ✅ DELETE /api/service-tickets/:id - Eliminar service ticket
 * ✅ GET /api/service-tickets/:id/equipment - Obtener equipos del service ticket
 * ✅ POST /api/service-tickets/:id/equipment - Agregar equipos al service ticket
 * ✅ PUT /api/service-tickets/:id/equipment/:equipmentId - Actualizar estado de equipo
 * ✅ DELETE /api/service-tickets/:id/equipment/:equipmentId - Remover equipo del service ticket
 * ✅ GET /api/locations/:id/equipment/grouped - Equipos agrupados por modelo para modal
 */

const express = require('express');
const router = express.Router();
const db = require('../db-adapter');

// ===================================================================
// GESTIÓN DE SERVICE TICKETS
// ===================================================================

/**
 * GET /api/service-tickets - Listar todos los service tickets
 */
router.get('/', async (req, res) => {
    try {
        const { client_id, location_id, status, assigned_technician_id, limit = 50, offset = 0 } = req.query;
        
        let sql = `
            SELECT 
                st.*,
                c.name as client_name,
                l.name as location_name,
                l.address as location_address,
                u_assigned.username as assigned_technician_name,
                u_created.username as created_by_name,
                CASE 
                    WHEN st.total_equipment_count = 0 THEN 0
                    ELSE ROUND((st.completed_equipment_count * 100.0) / st.total_equipment_count, 1)
                END as progress_percentage
            FROM ServiceTickets st
            LEFT JOIN Clients c ON st.client_id = c.id
            LEFT JOIN Locations l ON st.location_id = l.id
            LEFT JOIN Users u_assigned ON st.assigned_technician_id = u_assigned.id
            LEFT JOIN Users u_created ON st.created_by = u_created.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (client_id) {
            sql += ` AND st.client_id = ?`;
            params.push(client_id);
        }
        
        if (location_id) {
            sql += ` AND st.location_id = ?`;
            params.push(location_id);
        }
        
        if (status) {
            sql += ` AND st.status = ?`;
            params.push(status);
        }
        
        if (assigned_technician_id) {
            sql += ` AND st.assigned_technician_id = ?`;
            params.push(assigned_technician_id);
        }
        
        sql += ` ORDER BY st.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));
        
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('❌ Error obteniendo service tickets:', err);
                return res.status(500).json({
                    error: 'Error interno del servidor',
                    code: 'DB_ERROR'
                });
            }
            
            console.log(`✅ ${rows.length} service tickets encontrados`);
            res.json({
                message: 'success',
                data: rows || [],
                metadata: {
                    total: rows.length,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            });
        });
        
    } catch (error) {
        console.error('❌ Error en GET /service-tickets:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'UNEXPECTED_ERROR'
        });
    }
});

/**
 * POST /api/service-tickets - Crear nuevo service ticket
 */
router.post('/', async (req, res) => {
    try {
        const {
            title,
            description,
            client_id,
            location_id,
            priority = 'medium',
            assigned_technician_id,
            scheduled_date,
            estimated_duration_hours,
            equipment_ids = [] // Array de IDs de equipos a incluir
        } = req.body;
        
        // Validaciones
        if (!title || !client_id || !location_id) {
            return res.status(400).json({
                error: 'Campos requeridos: title, client_id, location_id',
                code: 'MISSING_REQUIRED_FIELDS'
            });
        }
        
        if (!Array.isArray(equipment_ids) || equipment_ids.length === 0) {
            return res.status(400).json({
                error: 'Debe seleccionar al menos un equipo',
                code: 'NO_EQUIPMENT_SELECTED'
            });
        }
        
        // Verificar que el cliente y ubicación existen
        const locationCheck = `
            SELECT l.id, l.client_id, c.name as client_name, l.name as location_name
            FROM Locations l
            JOIN Clients c ON l.client_id = c.id
            WHERE l.id = ? AND l.client_id = ?
        `;
        
        db.get(locationCheck, [location_id, client_id], (err, location) => {
            if (err) {
                console.error('❌ Error verificando ubicación:', err);
                return res.status(500).json({
                    error: 'Error verificando ubicación',
                    code: 'DB_ERROR'
                });
            }
            
            if (!location) {
                return res.status(400).json({
                    error: 'Cliente o ubicación no válidos',
                    code: 'INVALID_CLIENT_LOCATION'
                });
            }
            
            // Insertar service ticket
            const insertServiceTicket = `
                INSERT INTO ServiceTickets (
                    title, 
                    description, 
                    client_id, 
                    location_id, 
                    priority,
                    assigned_technician_id,
                    created_by,
                    scheduled_date,
                    estimated_duration_hours
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const serviceTicketParams = [
                title,
                description,
                client_id,
                location_id,
                priority,
                assigned_technician_id || null,
                req.user.id,
                scheduled_date || null,
                estimated_duration_hours || null
            ];
            
            db.run(insertServiceTicket, serviceTicketParams, function(err) {
                if (err) {
                    console.error('❌ Error creando service ticket:', err);
                    return res.status(500).json({
                        error: 'Error creando service ticket',
                        code: 'DB_ERROR'
                    });
                }
                
                const serviceTicketId = this.lastID;
                
                // Insertar equipos relacionados
                insertServiceTicketEquipment(serviceTicketId, equipment_ids, res, location);
            });
        });
        
    } catch (error) {
        console.error('❌ Error en POST /service-tickets:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'UNEXPECTED_ERROR'
        });
    }
});

/**
 * Función auxiliar para insertar equipos en service ticket
 */
function insertServiceTicketEquipment(serviceTicketId, equipmentIds, res, location) {
    if (equipmentIds.length === 0) {
        return res.status(201).json({
            message: 'Service ticket creado exitosamente',
            service_ticket_id: serviceTicketId,
            equipment_count: 0
        });
    }
    
    // Preparar inserción múltiple
    const values = equipmentIds.map(equipmentId => `(${serviceTicketId}, ${equipmentId})`).join(',');
    const insertEquipment = `
        INSERT INTO ServiceTicketEquipment (service_ticket_id, equipment_id)
        VALUES ${values}
    `;
    
    db.run(insertEquipment, [], function(err) {
        if (err) {
            console.error('❌ Error agregando equipos al service ticket:', err);
            return res.status(500).json({
                error: 'Error agregando equipos al service ticket',
                code: 'DB_ERROR'
            });
        }
        
        console.log(`✅ Service ticket ${serviceTicketId} creado con ${equipmentIds.length} equipos`);
        res.status(201).json({
            message: 'Service ticket creado exitosamente',
            service_ticket_id: serviceTicketId,
            equipment_count: equipmentIds.length,
            location: `${location.client_name} - ${location.location_name}`
        });
    });
}

/**
 * GET /api/service-tickets/:id - Obtener service ticket específico
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const sql = `
            SELECT 
                st.*,
                c.name as client_name,
                c.rut as client_rut,
                l.name as location_name,
                l.address as location_address,
                l.phone as location_phone,
                u_assigned.username as assigned_technician_name,
                u_assigned.email as assigned_technician_email,
                u_created.username as created_by_name,
                CASE 
                    WHEN st.total_equipment_count = 0 THEN 0
                    ELSE ROUND((st.completed_equipment_count * 100.0) / st.total_equipment_count, 1)
                END as progress_percentage
            FROM ServiceTickets st
            LEFT JOIN Clients c ON st.client_id = c.id
            LEFT JOIN Locations l ON st.location_id = l.id
            LEFT JOIN Users u_assigned ON st.assigned_technician_id = u_assigned.id
            LEFT JOIN Users u_created ON st.created_by = u_created.id
            WHERE st.id = ?
        `;
        
        db.get(sql, [id], (err, row) => {
            if (err) {
                console.error('❌ Error obteniendo service ticket:', err);
                return res.status(500).json({
                    error: 'Error interno del servidor',
                    code: 'DB_ERROR'
                });
            }
            
            if (!row) {
                return res.status(404).json({
                    error: 'Service ticket no encontrado',
                    code: 'SERVICE_TICKET_NOT_FOUND'
                });
            }
            
            console.log(`✅ Service ticket ${id} encontrado: ${row.title}`);
            res.json({
                message: 'success',
                data: row
            });
        });
        
    } catch (error) {
        console.error('❌ Error en GET /service-tickets/:id:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'UNEXPECTED_ERROR'
        });
    }
});

/**
 * GET /api/service-tickets/:id/equipment - Obtener equipos del service ticket
 */
router.get('/:id/equipment', async (req, res) => {
    try {
        const { id } = req.params;
        
        const sql = `
            SELECT 
                ste.*,
                e.custom_id as equipment_custom_id,
                COALESCE(NULLIF(e.name, ''), em.name, 'Sin nombre') as equipment_name,
                CASE 
                    WHEN e.custom_id LIKE 'CARD-%' THEN 'Cardio'
                    WHEN e.custom_id LIKE 'FUER-%' THEN 'Fuerza'
                    WHEN e.custom_id LIKE 'FUNC-%' THEN 'Funcional'
                    WHEN e.custom_id LIKE 'ACCE-%' THEN 'Accesorio'
                    ELSE COALESCE(NULLIF(e.type, ''), em.category, 'Sin categoría')
                END as equipment_type,
                COALESCE(NULLIF(e.brand, ''), em.brand, 'Sin marca') as equipment_brand,
                COALESCE(NULLIF(e.model, ''), em.name, 'Sin modelo') as equipment_model,
                em.category as model_category,
                em.brand as model_brand,
                em.name as model_name
            FROM ServiceTicketEquipment ste
            JOIN Equipment e ON ste.equipment_id = e.id
            LEFT JOIN EquipmentModels em ON e.model_id = em.id
            WHERE ste.service_ticket_id = ?
            ORDER BY em.category, em.brand, em.name, e.custom_id
        `;
        
        db.all(sql, [id], (err, rows) => {
            if (err) {
                console.error('❌ Error obteniendo equipos del service ticket:', err);
                return res.status(500).json({
                    error: 'Error interno del servidor',
                    code: 'DB_ERROR'
                });
            }
            
            // Agrupar por categoría de modelo para mejor visualización
            const groupedEquipment = {};
            rows.forEach(item => {
                const category = item.model_category || item.equipment_type || 'Sin categoría';
                if (!groupedEquipment[category]) {
                    groupedEquipment[category] = [];
                }
                groupedEquipment[category].push(item);
            });
            
            console.log(`✅ ${rows.length} equipos encontrados para service ticket ${id}`);
            res.json({
                message: 'success',
                data: rows,
                grouped_data: groupedEquipment,
                metadata: {
                    total_equipment: rows.length,
                    completed: rows.filter(item => item.status === 'completado').length,
                    pending: rows.filter(item => item.status === 'pendiente').length,
                    in_progress: rows.filter(item => item.status === 'en_progreso').length
                }
            });
        });
        
    } catch (error) {
        console.error('❌ Error en GET /service-tickets/:id/equipment:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'UNEXPECTED_ERROR'
        });
    }
});

/**
 * PUT /api/service-tickets/:id/equipment/:equipmentId - Actualizar estado de equipo
 */
router.put('/:id/equipment/:equipmentId', async (req, res) => {
    try {
        const { id, equipmentId } = req.params;
        const { status, notes, technician_notes, actual_duration_minutes } = req.body;
        
        if (!status) {
            return res.status(400).json({
                error: 'Campo status es requerido',
                code: 'MISSING_STATUS'
            });
        }
        
        let updateFields = ['status = ?', 'technician_notes = ?', 'updated_at = CURRENT_TIMESTAMP'];
        let updateParams = [status, technician_notes || null];
        
        // Agregar campos opcionales
        if (notes) {
            updateFields.push('notes = ?');
            updateParams.push(notes);
        }
        
        if (actual_duration_minutes) {
            updateFields.push('actual_duration_minutes = ?');
            updateParams.push(actual_duration_minutes);
        }
        
        // Manejar timestamps de inicio y completado
        if (status === 'en_progreso') {
            updateFields.push('started_at = CURRENT_TIMESTAMP');
        } else if (status === 'completado') {
            updateFields.push('completed_at = CURRENT_TIMESTAMP');
        }
        
        updateParams.push(id, equipmentId);
        
        const updateSql = `
            UPDATE ServiceTicketEquipment 
            SET ${updateFields.join(', ')}
            WHERE service_ticket_id = ? AND equipment_id = ?
        `;
        
        db.run(updateSql, updateParams, function(err) {
            if (err) {
                console.error('❌ Error actualizando equipo en service ticket:', err);
                return res.status(500).json({
                    error: 'Error actualizando equipo',
                    code: 'DB_ERROR'
                });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({
                    error: 'Equipo no encontrado en este service ticket',
                    code: 'EQUIPMENT_NOT_FOUND'
                });
            }
            
            console.log(`✅ Estado de equipo ${equipmentId} actualizado a: ${status}`);
            res.json({
                message: 'Estado de equipo actualizado exitosamente',
                service_ticket_id: id,
                equipment_id: equipmentId,
                new_status: status
            });
        });
        
    } catch (error) {
        console.error('❌ Error en PUT /service-tickets/:id/equipment/:equipmentId:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'UNEXPECTED_ERROR'
        });
    }
});

/**
 * GET /api/locations/:id/equipment/grouped - Equipos agrupados por modelo para modal
 */
router.get('/locations/:id/equipment/grouped', async (req, res) => {
    try {
        const { id } = req.params;
        
        const sql = `
            SELECT 
                e.id,
                e.custom_id,
                COALESCE(NULLIF(e.name, ''), em.name, 'Sin nombre') as name,
                CASE 
                    WHEN e.custom_id LIKE 'CARD-%' THEN 'Cardio'
                    WHEN e.custom_id LIKE 'FUER-%' THEN 'Fuerza'
                    WHEN e.custom_id LIKE 'FUNC-%' THEN 'Funcional'
                    WHEN e.custom_id LIKE 'ACCE-%' THEN 'Accesorio'
                    ELSE COALESCE(NULLIF(e.type, ''), em.category, 'Sin categoría')
                END as type,
                COALESCE(NULLIF(e.brand, ''), em.brand, 'Sin marca') as brand,
                COALESCE(NULLIF(e.model, ''), em.name, 'Sin modelo') as model,
                em.category as model_category,
                em.brand as model_brand,
                em.name as model_name,
                em.id as model_id
            FROM Equipment e
            LEFT JOIN EquipmentModels em ON e.model_id = em.id
            WHERE e.location_id = ?
            ORDER BY em.category, em.brand, em.name, e.custom_id
        `;
        
        db.all(sql, [id], (err, rows) => {
            if (err) {
                console.error('❌ Error obteniendo equipos agrupados:', err);
                return res.status(500).json({
                    error: 'Error interno del servidor',
                    code: 'DB_ERROR'
                });
            }
            
            // Agrupar por categoría y modelo
            const grouped = {};
            rows.forEach(equipment => {
                const category = equipment.model_category || equipment.type || 'Sin categoría';
                const modelKey = `${equipment.model_brand || 'Sin marca'} - ${equipment.model_name || 'Sin modelo'}`;
                
                if (!grouped[category]) {
                    grouped[category] = {};
                }
                
                if (!grouped[category][modelKey]) {
                    grouped[category][modelKey] = [];
                }
                
                grouped[category][modelKey].push(equipment);
            });
            
            console.log(`✅ ${rows.length} equipos agrupados para ubicación ${id}`);
            res.json({
                message: 'success',
                data: rows,
                grouped_data: grouped,
                metadata: {
                    total_equipment: rows.length,
                    categories: Object.keys(grouped).length
                }
            });
        });
        
    } catch (error) {
        console.error('❌ Error en GET /locations/:id/equipment/grouped:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'UNEXPECTED_ERROR'
        });
    }
});


/**
 * PUT /api/service-tickets/:id - Actualizar un service ticket
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            description,
            client_id,
            location_id,
            priority,
            status,
            assigned_technician_id,
            scheduled_date,
            estimated_duration_hours,
            equipment_ids = []
        } = req.body;

        // Validaciones
        if (!title || !client_id || !location_id || !status) {
            return res.status(400).json({
                error: 'Campos requeridos: title, client_id, location_id, status',
                code: 'MISSING_REQUIRED_FIELDS'
            });
        }

        // 1. Actualizar el ticket principal
        const updateTicketSql = `
            UPDATE ServiceTickets SET
                title = ?,
                description = ?,
                client_id = ?,
                location_id = ?,
                priority = ?,
                status = ?,
                assigned_technician_id = ?,
                scheduled_date = ?,
                estimated_duration_hours = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        const ticketParams = [
            title, description, client_id, location_id, priority, status,
            assigned_technician_id, scheduled_date, estimated_duration_hours, id
        ];

        db.run(updateTicketSql, ticketParams, function(err) {
            if (err) {
                console.error('❌ Error actualizando el service ticket:', err);
                return res.status(500).json({ error: 'Error interno del servidor', code: 'DB_ERROR' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Service ticket no encontrado', code: 'SERVICE_TICKET_NOT_FOUND' });
            }

            // 2. Eliminar equipos antiguos
            const deleteEquipmentSql = 'DELETE FROM ServiceTicketEquipment WHERE service_ticket_id = ?';
            db.run(deleteEquipmentSql, [id], (err) => {
                if (err) {
                    console.error('❌ Error eliminando equipos antiguos:', err);
                    return res.status(500).json({ error: 'Error actualizando equipos', code: 'DB_ERROR' });
                }

                // 3. Insertar equipos nuevos (si los hay)
                if (Array.isArray(equipment_ids) && equipment_ids.length > 0) {
                    const values = equipment_ids.map(equipmentId => `(${id}, ${equipmentId})`).join(',');
                    const insertEquipmentSql = `INSERT INTO ServiceTicketEquipment (service_ticket_id, equipment_id) VALUES ${values}`;

                    db.run(insertEquipmentSql, [], (err) => {
                        if (err) {
                            console.error('❌ Error insertando nuevos equipos:', err);
                            return res.status(500).json({ error: 'Error actualizando equipos', code: 'DB_ERROR' });
                        }
                        console.log(`✅ Ticket ${id} actualizado con ${equipment_ids.length} equipos.`);
                        res.json({ message: 'Service ticket actualizado exitosamente' });
                    });
                } else {
                    console.log(`✅ Ticket ${id} actualizado sin equipos.`);
                    res.json({ message: 'Service ticket actualizado exitosamente' });
                }
            });
        });

    } catch (error) {
        console.error('❌ Error en PUT /service-tickets/:id:', error);
        res.status(500).json({ error: 'Error interno del servidor', code: 'UNEXPECTED_ERROR' });
    }
});

/**
 * DELETE /api/service-tickets/:id - Eliminar un service ticket
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Eliminar equipos asociados al ticket
        const deleteEquipmentSql = 'DELETE FROM ServiceTicketEquipment WHERE service_ticket_id = ?';
        db.run(deleteEquipmentSql, [id], function(err) {
            if (err) {
                console.error('❌ Error eliminando equipos del service ticket:', err);
                return res.status(500).json({
                    error: 'Error interno del servidor al eliminar equipos asociados',
                    code: 'DB_ERROR'
                });
            }

            console.log(`✅ ${this.changes} equipos eliminados para service ticket ${id}`);

            // 2. Eliminar el ticket principal
            const deleteTicketSql = 'DELETE FROM ServiceTickets WHERE id = ?';
            db.run(deleteTicketSql, [id], function(err) {
                if (err) {
                    console.error('❌ Error eliminando el service ticket:', err);
                    return res.status(500).json({
                        error: 'Error interno del servidor al eliminar el ticket',
                        code: 'DB_ERROR'
                    });
                }

                if (this.changes === 0) {
                    return res.status(404).json({
                        error: 'Service ticket no encontrado',
                        code: 'SERVICE_TICKET_NOT_FOUND'
                    });
                }

                console.log(`✅ Service ticket ${id} eliminado exitosamente`);
                res.json({
                    message: 'Service ticket eliminado exitosamente',
                    service_ticket_id: id,
                    changes: this.changes
                });
            });
        });

    } catch (error) {
        console.error('❌ Error en DELETE /service-tickets/:id:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'UNEXPECTED_ERROR'
        });
    }
});

module.exports = router;

