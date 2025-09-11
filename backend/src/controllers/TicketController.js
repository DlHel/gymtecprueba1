/**
 * Controlador para la gestión de Tickets
 * @class TicketController
 */
class TicketController {

    /**
     * Obtener todos los tickets
     * @param {object} req - Request object
     * @param {object} res - Response object
     */
    static getAll(req, res) {
        const db = require('../db-adapter');
        const { location_id } = req.query;
    
        let sql = `
            SELECT 
                t.*,
                c.name as client_name,
                l.name as location_name,
                e.name as equipment_name,
                e.custom_id as equipment_custom_id
            FROM Tickets t
            LEFT JOIN Clients c ON t.client_id = c.id
            LEFT JOIN Equipment e ON t.equipment_id = e.id
            LEFT JOIN Locations l ON t.location_id = l.id
        `;
        
        let params = [];
        
        if (location_id) {
            sql += ` WHERE t.location_id = ?`;
            params.push(location_id);
        }
        
        sql += ` ORDER BY t.created_at DESC`;
        
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('❌ Error en consulta de tickets:', err.message);
                res.status(500).json({ 
                    error: "Error interno del servidor al obtener tickets",
                    code: "DATABASE_ERROR"
                });
                return;
            }
            console.log(`✅ Tickets encontrados: ${rows.length}`);
            res.json({
                message: "success",
                data: rows
            });
        });
    }

    /**
     * Obtener un ticket por su ID
     * @param {object} req - Request object
     * @param {object} res - Response object
     */
    static getById(req, res) {
        const db = require('../db-adapter');
        const sql = `
            SELECT 
                t.*,
                c.name as client_name,
                l.name as location_name,
                e.name as equipment_name,
                e.custom_id as equipment_custom_id
            FROM Tickets t
            LEFT JOIN Clients c ON t.client_id = c.id
            LEFT JOIN Equipment e ON t.equipment_id = e.id
            LEFT JOIN Locations l ON t.location_id = l.id
            WHERE t.id = ?
        `;
        
        db.get(sql, [req.params.id], (err, row) => {
            if (err) {
                console.error('❌ Error obteniendo ticket:', err.message);
                res.status(500).json({ 
                    "error": "Error interno del servidor",
                    "code": "DATABASE_ERROR"
                });
                return;
            }
            if (!row) {
                return res.status(404).json({ 
                    error: "Ticket no encontrado",
                    code: "TICKET_NOT_FOUND"
                });
            }
            console.log(`✅ Ticket encontrado: ${row.id}`);
            res.json({
                message: "success",
                data: row
            });
        });
    }

    /**
     * Crear un nuevo ticket
     * @param {object} req - Request object
     * @param {object} res - Response object
     */
    static create(req, res) {
        const db = require('../db-adapter');
        const { client_id, location_id, equipment_id, title, description, priority, due_date } = req.body;

        // Basic validation
        if (!title || !client_id || !priority) {
            return res.status(400).json({ 
                error: "Título, Cliente y Prioridad son campos obligatorios.",
                code: "VALIDATION_ERROR"
            });
        }

        const sql = `INSERT INTO Tickets (client_id, location_id, equipment_id, title, description, priority, due_date, status, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
        const params = [client_id, location_id || null, equipment_id || null, title, description, priority, due_date || null, 'Abierto'];
        
        db.run(sql, params, function(err) {
            if (err) {
                console.error('❌ Error creando ticket:', err.message);
                res.status(500).json({ 
                    "error": "Error interno del servidor al crear el ticket",
                    "code": "DATABASE_ERROR"
                });
                return;
            }
            console.log(`✅ Ticket creado con ID: ${this.lastID}`);
            res.status(201).json({
                message: "Ticket creado exitosamente",
                data: { id: this.lastID, ...req.body, status: 'Abierto' }
            });
        });
    }

    /**
     * Actualizar un ticket existente
     * @param {object} req - Request object
     * @param {object} res - Response object
     */
    static update(req, res) {
        const db = require('../db-adapter');
        const { client_id, location_id, equipment_id, title, description, status, priority, due_date } = req.body;
    
        if (!title || !client_id || !priority || !status) {
            return res.status(400).json({ 
                error: "Título, Cliente, Prioridad y Estado son campos obligatorios.",
                code: "VALIDATION_ERROR"
            });
        }

        const sql = `UPDATE Tickets SET
                        client_id = ?,
                        location_id = ?,
                        equipment_id = ?,
                        title = ?,
                        description = ?,
                        status = ?,
                        priority = ?,
                        due_date = ?,
                        updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?`;
                     
        const params = [client_id, location_id, equipment_id, title, description, status, priority, due_date, req.params.id];

        db.run(sql, params, function(err) {
            if (err) {
                console.error('❌ Error actualizando ticket:', err.message);
                res.status(500).json({ 
                    "error": "Error interno del servidor al actualizar el ticket",
                    "code": "DATABASE_ERROR"
                });
                return;
            }
            if (this.changes === 0) {
                return res.status(404).json({ 
                    error: "Ticket no encontrado.",
                    code: "TICKET_NOT_FOUND"
                });
            }
            console.log(`✅ Ticket ${req.params.id} actualizado`);
            res.json({
                message: "Ticket actualizado exitosamente",
                changes: this.changes
            });
        });
    }

    /**
     * Eliminar un ticket
     * @param {object} req - Request object
     * @param {object} res - Response object
     */
    static delete(req, res) {
        const db = require('../db-adapter');
        const sql = 'DELETE FROM Tickets WHERE id = ?';
        db.run(sql, [req.params.id], function(err) {
            if (err) {
                console.error('❌ Error eliminando ticket:', err.message);
                res.status(500).json({ 
                    "error": "Error interno del servidor al eliminar el ticket",
                    "code": "DATABASE_ERROR"
                });
                return;
            }
            if (this.changes === 0) {
                return res.status(404).json({ 
                    error: "Ticket no encontrado.",
                    code: "TICKET_NOT_FOUND"
                });
            }
            console.log(`✅ Ticket ${req.params.id} eliminado`);
            res.json({ 
                message: "Ticket eliminado exitosamente", 
                changes: this.changes 
            });
        });
    }

    /**
     * Obtener el detalle completo de un ticket
     * @param {object} req - Request object
     * @param {object} res - Response object
     */
    static getDetailById(req, res) {
        const db = require('../db-adapter');
        const ticketId = req.params.id;
        console.log(`🔍 Obteniendo detalle completo del ticket ID: ${ticketId}`);
        
        const ticketSql = `
            SELECT 
                t.*,
                c.name as client_name,
                c.legal_name as client_legal_name,
                c.rut as client_rut,
                c.address as client_address,
                c.phone as client_phone,
                c.email as client_email,
                l.name as location_name,
                l.address as location_address,
                e.name as equipment_name,
                e.custom_id as equipment_custom_id,
                e.serial_number as equipment_serial,
                e.acquisition_date as equipment_installation,
                em.name as equipment_model_name,
                em.category as equipment_category,
                em.brand as equipment_brand,
                u.username as assigned_to_name
            FROM tickets t
            LEFT JOIN clients c ON t.client_id = c.id
            LEFT JOIN locations l ON t.location_id = l.id
            LEFT JOIN equipment e ON t.equipment_id = e.id
            LEFT JOIN equipmentmodels em ON e.model_id = em.id
            LEFT JOIN users u ON t.assigned_technician_id = u.id
            WHERE t.id = ?
        `;
        
        db.get(ticketSql, [ticketId], (err, ticket) => {
            if (err) {
                console.error('❌ Error obteniendo ticket:', err.message);
                return res.status(500).json({ 
                    error: 'Error interno del servidor al obtener ticket',
                    code: 'TICKET_FETCH_ERROR'
                });
            }
            
            if (!ticket) {
                console.log(`❌ Ticket ${ticketId} no encontrado`);
                return res.status(404).json({ 
                    error: "Ticket no encontrado",
                    code: 'TICKET_NOT_FOUND'
                });
            }
            
            console.log(`✅ Ticket ${ticketId} encontrado: ${ticket.title}`);
            
            const photosSql = `SELECT * FROM ticketphotos WHERE ticket_id = ? ORDER BY created_at DESC`;
            
            db.all(photosSql, [ticketId], (photoErr, photos) => {
                if (photoErr) {
                    console.log('⚠️ Error obteniendo fotos (continuando sin fotos):', photoErr.message);
                    photos = [];
                }
                
                console.log(`📸 Encontradas ${photos ? photos.length : 0} fotos para ticket ${ticketId}`);
                
                const notesSql = `SELECT * FROM ticketnotes WHERE ticket_id = ? ORDER BY created_at DESC`;
                
                db.all(notesSql, [ticketId], (notesErr, notes) => {
                    if (notesErr) {
                        console.log('⚠️ Error obteniendo notas (continuando sin notas):', notesErr.message);
                        notes = [];
                    }
                    
                    console.log(`📝 Encontradas ${notes ? notes.length : 0} notas para ticket ${ticketId}`);
                    
                    const checklistSql = `SELECT * FROM ticketchecklists WHERE ticket_id = ? ORDER BY created_at DESC`;
                    
                    db.all(checklistSql, [ticketId], (checklistErr, checklist) => {
                        if (checklistErr) {
                            console.log('⚠️ Error obteniendo checklist (continuando sin checklist):', checklistErr.message);
                            checklist = [];
                        }
                        
                        console.log(`📋 Encontradas ${checklist ? checklist.length : 0} tareas de checklist para ticket ${ticketId}`);
                        
                        const detailedTicket = {
                            ...ticket,
                            photos: photos || [],
                            notes: notes || [],
                            checklist: checklist || [],
                            activities: [],
                            metadata: {
                                photos_count: photos ? photos.length : 0,
                                notes_count: notes ? notes.length : 0,
                                checklist_count: checklist ? checklist.length : 0,
                                activities_count: 0,
                                last_updated: ticket.updated_at,
                                created_date: ticket.created_at
                            }
                        };
                        
                        console.log(`✅ Detalle completo del ticket ${ticketId} preparado`);
                        
                        return res.json({
                            success: true,
                            message: "success", 
                            data: detailedTicket
                        });
                    });
                });
            });
        });
    }
}

module.exports = TicketController;
