const express = require('express');
const router = express.Router();
const db = require('../db-adapter');

/**
 * GYMTEC ERP - APIs SISTEMA DE UBICACIONES
 * 
 * Endpoints implementados:
 * ✅ GET /api/locations - Listar ubicaciones
 * ✅ GET /api/locations/:id - Obtener ubicación específica
 * ✅ POST /api/locations - Crear nueva ubicación
 * ✅ PUT /api/locations/:id - Actualizar ubicación
 * ✅ DELETE /api/locations/:id - Eliminar ubicación
 * ✅ GET /api/locations/:id/equipment - Equipos en una ubicación
 * ✅ GET /api/locations/:id/stats - Estadísticas de una ubicación
 */

// ===================================================================
// GESTIÓN DE UBICACIONES
// ===================================================================

/**
 * @route GET /api/locations
 * @desc Obtener lista de ubicaciones
 */
router.get('/', async (req, res) => {
    try {
        const { client_id, active_only, search, page = 1, limit = 50 } = req.query;
        
        let sql = `
        SELECT 
            l.*,
            c.name as client_name,
            COUNT(DISTINCT e.id) as equipment_count,
            COUNT(DISTINCT t.id) as active_tickets
        FROM Locations l
        LEFT JOIN Clients c ON l.client_id = c.id
        LEFT JOIN Equipment e ON l.id = e.location_id
        LEFT JOIN Tickets t ON e.id = t.equipment_id AND t.status IN ('open', 'in_progress')
        WHERE 1=1`;
        
        const params = [];
        
        if (client_id) {
            sql += ' AND l.client_id = ?';
            params.push(client_id);
        }
        
        if (active_only === 'true') {
            sql += ' AND l.activo = 1';
        }
        
        if (search) {
            sql += ' AND (l.name LIKE ? OR l.address LIKE ? OR l.city LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        sql += ` 
        GROUP BY l.id
        ORDER BY l.name ASC`;
        
        // Paginación
        const offset = (parseInt(page) - 1) * parseInt(limit);
        sql += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);
        
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('❌ Error al obtener ubicaciones:', err);
                return res.status(500).json({ 
                    error: 'Error interno del servidor',
                    code: 'DB_ERROR'
                });
            }
            
            res.json({
                message: 'success',
                data: rows,
                metadata: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: rows.length
                }
            });
        });
    } catch (error) {
        console.error('❌ Error en GET /locations:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * @route GET /api/locations/:id
 * @desc Obtener ubicación específica con detalles
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const sql = `
        SELECT 
            l.*,
            c.name as client_name,
            c.email as client_email,
            c.phone as client_phone,
            COUNT(DISTINCT e.id) as equipment_count,
            COUNT(DISTINCT t.id) as active_tickets,
            COUNT(DISTINCT CASE WHEN t.status = 'open' THEN t.id END) as pending_tickets,
            COUNT(DISTINCT CASE WHEN t.priority = 'critical' THEN t.id END) as critical_tickets
        FROM Locations l
        LEFT JOIN Clients c ON l.client_id = c.id
        LEFT JOIN Equipment e ON l.id = e.location_id
        LEFT JOIN Tickets t ON e.id = t.equipment_id AND t.status IN ('open', 'in_progress')
        WHERE l.id = ?
        GROUP BY l.id`;
        
        db.get(sql, [id], (err, row) => {
            if (err) {
                console.error('❌ Error al obtener ubicación:', err);
                return res.status(500).json({ 
                    error: 'Error interno del servidor',
                    code: 'DB_ERROR'
                });
            }
            
            if (!row) {
                return res.status(404).json({ 
                    error: 'Ubicación no encontrada',
                    code: 'LOCATION_NOT_FOUND'
                });
            }
            
            res.json({
                message: 'success',
                data: row
            });
        });
    } catch (error) {
        console.error('❌ Error en GET /locations/:id:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * @route POST /api/locations
 * @desc Crear nueva ubicación
 */
router.post('/', async (req, res) => {
    try {
        const {
            name,
            address,
            city,
            state,
            postal_code,
            country,
            client_id,
            contact_person,
            contact_phone,
            contact_email,
            description,
            operating_hours
        } = req.body;
        
        // Validaciones básicas
        if (!name || !address || !client_id) {
            return res.status(400).json({
                error: 'Campos requeridos: name, address, client_id',
                code: 'VALIDATION_ERROR'
            });
        }
        
        const sql = `
        INSERT INTO Locations (
            name, address, city, state, postal_code, country,
            client_id, contact_person, contact_phone, contact_email,
            description, operating_hours, activo, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`;
        
        const params = [
            name, address, city, state, postal_code, country || 'Peru',
            client_id, contact_person, contact_phone, contact_email,
            description, operating_hours
        ];
        
        db.run(sql, params, function(err) {
            if (err) {
                console.error('❌ Error al crear ubicación:', err);
                return res.status(500).json({ 
                    error: 'Error interno del servidor',
                    code: 'DB_ERROR'
                });
            }
            
            res.status(201).json({
                message: 'Ubicación creada exitosamente',
                data: { 
                    id: this.lastID,
                    name,
                    address,
                    client_id
                }
            });
        });
    } catch (error) {
        console.error('❌ Error en POST /locations:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * @route PUT /api/locations/:id
 * @desc Actualizar ubicación
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            address,
            city,
            state,
            postal_code,
            country,
            contact_person,
            contact_phone,
            contact_email,
            description,
            operating_hours,
            activo
        } = req.body;
        
        const sql = `
        UPDATE Locations SET
            name = ?,
            address = ?,
            city = ?,
            state = ?,
            postal_code = ?,
            country = ?,
            contact_person = ?,
            contact_phone = ?,
            contact_email = ?,
            description = ?,
            operating_hours = ?,
            activo = ?,
            updated_at = datetime('now')
        WHERE id = ?`;
        
        const params = [
            name, address, city, state, postal_code, country,
            contact_person, contact_phone, contact_email,
            description, operating_hours, activo !== undefined ? activo : 1,
            id
        ];
        
        db.run(sql, params, function(err) {
            if (err) {
                console.error('❌ Error al actualizar ubicación:', err);
                return res.status(500).json({ 
                    error: 'Error interno del servidor',
                    code: 'DB_ERROR'
                });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ 
                    error: 'Ubicación no encontrada',
                    code: 'LOCATION_NOT_FOUND'
                });
            }
            
            res.json({
                message: 'Ubicación actualizada exitosamente',
                data: { id, name, address }
            });
        });
    } catch (error) {
        console.error('❌ Error en PUT /locations/:id:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * @route DELETE /api/locations/:id
 * @desc Eliminar ubicación (soft delete)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar si hay equipos asociados
        const checkEquipmentSql = 'SELECT COUNT(*) as count FROM Equipment WHERE location_id = ?';
        
        db.get(checkEquipmentSql, [id], (err, row) => {
            if (err) {
                console.error('❌ Error al verificar equipos:', err);
                return res.status(500).json({ 
                    error: 'Error interno del servidor',
                    code: 'DB_ERROR'
                });
            }
            
            if (row.count > 0) {
                return res.status(400).json({
                    error: 'No se puede eliminar. La ubicación tiene equipos asociados.',
                    code: 'LOCATION_HAS_EQUIPMENT'
                });
            }
            
            // Soft delete
            const deleteSql = 'UPDATE Locations SET activo = 0, updated_at = datetime(\'now\') WHERE id = ?';
            
            db.run(deleteSql, [id], function(err) {
                if (err) {
                    console.error('❌ Error al eliminar ubicación:', err);
                    return res.status(500).json({ 
                        error: 'Error interno del servidor',
                        code: 'DB_ERROR'
                    });
                }
                
                if (this.changes === 0) {
                    return res.status(404).json({ 
                        error: 'Ubicación no encontrada',
                        code: 'LOCATION_NOT_FOUND'
                    });
                }
                
                res.json({
                    message: 'Ubicación eliminada exitosamente'
                });
            });
        });
    } catch (error) {
        console.error('❌ Error en DELETE /locations/:id:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * @route GET /api/locations/:id/equipment
 * @desc Obtener equipos de una ubicación
 */
router.get('/:id/equipment', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, category } = req.query;
        
        let sql = `
        SELECT 
            e.*,
            em.name as model_name,
            em.brand as model_brand,
            em.category as model_category,
            COUNT(DISTINCT t.id) as open_tickets
        FROM Equipment e
        LEFT JOIN EquipmentModels em ON e.model_id = em.id
        LEFT JOIN Tickets t ON e.id = t.equipment_id AND t.status = 'open'
        WHERE e.location_id = ?`;
        
        const params = [id];
        
        if (status) {
            sql += ' AND e.status = ?';
            params.push(status);
        }
        
        if (category) {
            sql += ' AND em.category = ?';
            params.push(category);
        }
        
        sql += ' GROUP BY e.id ORDER BY e.name ASC';
        
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('❌ Error al obtener equipos de ubicación:', err);
                return res.status(500).json({ 
                    error: 'Error interno del servidor',
                    code: 'DB_ERROR'
                });
            }
            
            res.json({
                message: 'success',
                data: rows
            });
        });
    } catch (error) {
        console.error('❌ Error en GET /locations/:id/equipment:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * @route GET /api/locations/:id/stats
 * @desc Obtener estadísticas de una ubicación
 */
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        
        const sql = `
        SELECT 
            COUNT(DISTINCT e.id) as total_equipment,
            COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.id END) as active_equipment,
            COUNT(DISTINCT CASE WHEN e.status = 'maintenance' THEN e.id END) as maintenance_equipment,
            COUNT(DISTINCT CASE WHEN e.status = 'out_of_service' THEN e.id END) as out_of_service_equipment,
            COUNT(DISTINCT t.id) as total_tickets,
            COUNT(DISTINCT CASE WHEN t.status = 'open' THEN t.id END) as open_tickets,
            COUNT(DISTINCT CASE WHEN t.priority = 'critical' THEN t.id END) as critical_tickets,
            AVG(CASE WHEN t.status = 'completed' AND t.completed_at IS NOT NULL 
                THEN (julianday(t.completed_at) - julianday(t.created_at)) * 24 END) as avg_resolution_time_hours
        FROM Locations l
        LEFT JOIN Equipment e ON l.id = e.location_id
        LEFT JOIN Tickets t ON e.id = t.equipment_id
        WHERE l.id = ?
        GROUP BY l.id`;
        
        db.get(sql, [id], (err, row) => {
            if (err) {
                console.error('❌ Error al obtener estadísticas de ubicación:', err);
                return res.status(500).json({ 
                    error: 'Error interno del servidor',
                    code: 'DB_ERROR'
                });
            }
            
            res.json({
                message: 'success',
                data: row || {
                    total_equipment: 0,
                    active_equipment: 0,
                    maintenance_equipment: 0,
                    out_of_service_equipment: 0,
                    total_tickets: 0,
                    open_tickets: 0,
                    critical_tickets: 0,
                    avg_resolution_time_hours: 0
                }
            });
        });
    } catch (error) {
        console.error('❌ Error en GET /locations/:id/stats:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

module.exports = router;