const express = require('express');
const router = express.Router();
const db = require('../../db-adapter');
const { authenticateToken } = require('../../core/middleware/auth.middleware');

/**
 * GYMTEC ERP - Módulo de Gimnación
 * Extraído de server-clean.js para arquitectura modular
 */

router.post('/tickets/gimnacion', authenticateToken, (req, res) => {
    try {
        const {
            title,
            description,
            priority = 'Media',
            client_id,
            location_id,
            contract_id,
            equipment_scope, // Array de { equipment_id, is_included, exclusion_reason }
            technicians,     // Array de { technician_id, role }
            checklist_template_id,
            custom_checklist // Array de { item_text, item_order, is_required, category }
        } = req.body;
        
        // Validaciones básicas
        if (!title || !client_id || !location_id || !equipment_scope || !Array.isArray(equipment_scope)) {
            return res.status(400).json({ 
                error: 'Faltan campos requeridos',
                required: ['title', 'client_id', 'location_id', 'equipment_scope']
            });
        }
        
        // Usar callback pattern para transacciones
        const createTicketSql = `
            INSERT INTO Tickets (
                title, description, status, priority, ticket_type,
                client_id, location_id, contract_id, assigned_technician_id,
                created_at, updated_at
            ) VALUES (?, ?, 'Abierto', ?, 'gimnacion', ?, ?, ?, ?, NOW(), NOW())
        `;
        
        const mainTechnician = technicians && technicians.length > 0 ? technicians[0].technician_id : null;
        
        db.run(createTicketSql, [
            title, description, priority, client_id, location_id, contract_id, mainTechnician
        ], function(err) {
            if (err) {
                console.error('Error creating gimnacion ticket:', err);
                return res.status(500).json({ error: 'Error creating ticket' });
            }
            
            const ticketId = this.lastID;
            let completedOperations = 0;
            let totalOperations = equipment_scope.length + (technicians ? technicians.length : 0);
            let hasErrors = false;
            
            // Función para completar la operación
            const completeOperation = () => {
                completedOperations++;
                if (completedOperations === totalOperations && !hasErrors) {
                    res.status(201).json({
                        message: 'Ticket de gimnación creado exitosamente',
                        data: {
                            ticket_id: ticketId,
                            title: title,
                            equipment_count: equipment_scope.length,
                            included_equipment: equipment_scope.filter(e => e.is_included).length,
                            technicians_count: technicians ? technicians.length : 0
                        }
                    });
                }
            };
            
            // Insertar scope de equipos
            equipment_scope.forEach(scope => {
                const scopeSql = `
                    INSERT INTO TicketEquipmentScope (
                        ticket_id, equipment_id, is_included, exclusion_reason, 
                        assigned_technician_id, status
                    ) VALUES (?, ?, ?, ?, ?, 'Pendiente')
                `;
                
                db.run(scopeSql, [
                    ticketId,
                    scope.equipment_id,
                    scope.is_included,
                    scope.exclusion_reason,
                    scope.assigned_technician_id || mainTechnician
                ], (err) => {
                    if (err && !hasErrors) {
                        hasErrors = true;
                        console.error('Error inserting equipment scope:', err);
                        return res.status(500).json({ error: 'Error creating equipment scope' });
                    }
                    if (!hasErrors) completeOperation();
                });
            });
            
            // Insertar técnicos asignados
            if (technicians && technicians.length > 0) {
                technicians.forEach(tech => {
                    const techSql = `
                        INSERT INTO TicketTechnicians (
                            ticket_id, technician_id, role, assigned_by
                        ) VALUES (?, ?, ?, ?)
                    `;
                    
                    db.run(techSql, [
                        ticketId, tech.technician_id, tech.role || 'Asistente', req.user.id
                    ], (err) => {
                        if (err && !hasErrors) {
                            hasErrors = true;
                            console.error('Error inserting technician:', err);
                            return res.status(500).json({ error: 'Error assigning technicians' });
                        }
                        if (!hasErrors) completeOperation();
                    });
                });
            } else {
                // Si no hay técnicos, ajustar el total de operaciones
                totalOperations = equipment_scope.length;
            }
            
            // Si no hay operaciones pendientes, responder inmediatamente
            if (totalOperations === 0) {
                res.status(201).json({
                    message: 'Ticket de gimnación creado exitosamente',
                    data: {
                        ticket_id: ticketId,
                        title: title,
                        equipment_count: 0,
                        included_equipment: 0,
                        technicians_count: 0
                    }
                });
            }
        });
        
    } catch (error) {
        console.error('Gimnacion ticket creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 3. GET /api/tickets/:id/gimnacion-details - Obtener detalles completos de ticket de gimnación
router.get('/tickets/:ticketId/gimnacion-details', authenticateToken, (req, res) => {
    try {
        const { ticketId } = req.params;
        
        // Query principal del ticket
        const ticketSql = `
            SELECT t.*, c.name as client_name, l.name as location_name,
                   contract.id as contract_id,
                   u.username as assigned_technician
            FROM Tickets t
            LEFT JOIN Clients c ON t.client_id = c.id
            LEFT JOIN Locations l ON t.location_id = l.id
            LEFT JOIN Contracts contract ON t.contract_id = contract.id
            LEFT JOIN Users u ON t.assigned_technician_id = u.id
            WHERE t.id = ? AND t.ticket_type = 'gimnacion'
        `;
        
        db.get(ticketSql, [ticketId], (err, ticket) => {
            if (err) {
                console.error('Error fetching gimnacion ticket:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!ticket) {
                return res.status(404).json({ error: 'Ticket de gimnación no encontrado' });
            }
            
            // Obtener scope de equipos
            const equipmentSql = `
                SELECT tes.*, e.name as equipment_name, e.type, e.brand, e.model,
                       u.username as assigned_technician_name
                FROM TicketEquipmentScope tes
                JOIN Equipment e ON tes.equipment_id = e.id
                LEFT JOIN Users u ON tes.assigned_technician_id = u.id
                WHERE tes.ticket_id = ?
                ORDER BY e.name
            `;
            
            db.all(equipmentSql, [ticketId], (err, equipment) => {
                if (err) {
                    console.error('Error fetching equipment scope:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                // Obtener técnicos asignados
                const techniciansSql = `
                    SELECT tt.*, u.username, u.email
                    FROM TicketTechnicians tt
                    JOIN Users u ON tt.technician_id = u.id
                    WHERE tt.ticket_id = ?
                `;
                
                db.all(techniciansSql, [ticketId], (err, technicians) => {
                    if (err) {
                        console.error('Error fetching technicians:', err);
                        return res.status(500).json({ error: 'Database error' });
                    }
                    
                    // Obtener checklist
                    const checklistSql = `
                        SELECT * FROM TicketGimnacionChecklist
                        WHERE ticket_id = ?
                        ORDER BY item_order
                    `;
                    
                    db.all(checklistSql, [ticketId], (err, checklist) => {
                        if (err) {
                            console.error('Error fetching checklist:', err);
                            return res.status(500).json({ error: 'Database error' });
                        }
                        
                        res.json({
                            message: 'success',
                            data: {
                                ticket,
                                equipment_scope: equipment,
                                technicians,
                                checklist,
                                summary: {
                                    total_equipment: equipment.length,
                                    included_equipment: equipment.filter(e => e.is_included).length,
                                    excluded_equipment: equipment.filter(e => !e.is_included).length,
                                    completed_equipment: equipment.filter(e => e.status === 'Completado').length,
                                    total_technicians: technicians.length,
                                    checklist_progress: checklist.length > 0 
                                        ? Math.round((checklist.filter(c => c.is_completed).length / checklist.length) * 100)
                                        : 0
                                }
                            }
                        });
                    });
                });
            });
        });
        
    } catch (error) {
        console.error('Gimnacion details endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 4. GET /api/gimnacion/checklist-templates - Obtener templates de checklist
router.get('/gimnacion/checklist-templates', authenticateToken, (req, res) => {
    try {
        const sql = `
            SELECT t.*, 
                   COUNT(i.id) as items_count,
                   u.username as created_by_username
            FROM GimnacionChecklistTemplates t
            LEFT JOIN GimnacionChecklistItems i ON t.id = i.template_id
            LEFT JOIN Users u ON t.created_by = u.id
            GROUP BY t.id
            ORDER BY t.is_default DESC, t.name
        `;
        
        db.all(sql, [], (err, templates) => {
            if (err) {
                console.error('Error fetching checklist templates:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            res.json({
                message: 'success',
                data: templates
            });
        });
        
    } catch (error) {
        console.error('Checklist templates endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 5. GET /api/gimnacion/checklist-templates/:id/items - Obtener items de un template
router.get('/gimnacion/checklist-templates/:templateId/items', authenticateToken, (req, res) => {
    try {
        const { templateId } = req.params;
        
        const sql = `
            SELECT 
                id,
                template_id,
                item_text as item_description,
                item_order as sort_order,
                is_required,
                category,
                created_at
            FROM GimnacionChecklistItems
            WHERE template_id = ?
            ORDER BY item_order, id
        `;
        
        db.all(sql, [templateId], (err, items) => {
            if (err) {
                console.error('Error fetching template items:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            res.json({
                message: 'success',
                data: items
            });
        });
        
    } catch (error) {
        console.error('Template items endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 6. POST /api/gimnacion/checklist-templates - Crear nuevo template de checklist
router.post('/gimnacion/checklist-templates', authenticateToken, (req, res) => {
    try {
        const { template_name, items = [] } = req.body;
        
        if (!template_name || template_name.trim() === '') {
            return res.status(400).json({ error: 'El nombre del template es requerido' });
        }
        
        // Insertar template
        const insertTemplateSql = `
            INSERT INTO GimnacionChecklistTemplates (name, description, created_by, created_at)
            VALUES (?, '', ?, NOW())
        `;
        
        db.run(insertTemplateSql, [template_name.trim(), req.user.id], function(err) {
            if (err) {
                console.error('Error creating checklist template:', err);
                return res.status(500).json({ error: 'Error al crear template' });
            }
            
            const templateId = this.lastID;
            
            // Si hay items, insertarlos
            if (items.length > 0) {
                const insertItemsSql = `
                    INSERT INTO GimnacionChecklistItems (template_id, item_text, item_order, is_required, category)
                    VALUES (?, ?, ?, ?, ?)
                `;
                
                const stmt = db.prepare(insertItemsSql);
                let itemsInserted = 0;
                const errors = [];
                
                items.forEach((item, index) => {
                    stmt.run([
                        templateId,
                        item.item_description || item.item_text || '',
                        item.sort_order || item.item_order || index + 1,
                        item.is_required ? 1 : 0,
                        item.category || 'general'
                    ], function(err) {
                        if (err) {
                            errors.push(`Error inserting item ${index}: ${err.message}`);
                        }
                        itemsInserted++;
                        
                        // Cuando todos los items se han procesado
                        if (itemsInserted === items.length) {
                            stmt.finalize();
                            
                            if (errors.length > 0) {
                                console.error('Errors inserting items:', errors);
                                return res.status(500).json({ 
                                    error: 'Template creado pero hubo errores con algunos items',
                                    template_id: templateId,
                                    errors: errors
                                });
                            }
                            
                            res.json({
                                message: 'Template creado exitosamente',
                                data: {
                                    id: templateId,
                                    name: template_name.trim(),
                                    items_count: items.length
                                }
                            });
                        }
                    });
                });
            } else {
                // No hay items, responder directamente
                res.json({
                    message: 'Template creado exitosamente',
                    data: {
                        id: templateId,
                        name: template_name.trim(),
                        items_count: 0
                    }
                });
            }
        });
        
    } catch (error) {
        console.error('Create checklist template endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 7. PUT /api/gimnacion/checklist-templates/:id - Actualizar template de checklist
router.put('/gimnacion/checklist-templates/:id', authenticateToken, (req, res) => {
    try {
        const templateId = req.params.id;
        const { template_name, items = [] } = req.body;
        
        if (!template_name || template_name.trim() === '') {
            return res.status(400).json({ error: 'El nombre del template es requerido' });
        }
        
        // Actualizar template
        const updateTemplateSql = `
            UPDATE GimnacionChecklistTemplates 
            SET name = ?, updated_at = NOW()
            WHERE id = ?
        `;
        
        db.run(updateTemplateSql, [template_name.trim(), templateId], function(err) {
            if (err) {
                console.error('Error updating checklist template:', err);
                return res.status(500).json({ error: 'Error al actualizar template' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Template no encontrado' });
            }
            
            // Eliminar items existentes
            const deleteItemsSql = `DELETE FROM GimnacionChecklistItems WHERE template_id = ?`;
            
            db.run(deleteItemsSql, [templateId], (err) => {
                if (err) {
                    console.error('Error deleting existing items:', err);
                    return res.status(500).json({ error: 'Error al actualizar items' });
                }
                
                // Insertar nuevos items
                if (items.length > 0) {
                    const insertItemsSql = `
                        INSERT INTO GimnacionChecklistItems (template_id, item_text, item_order, is_required, category)
                        VALUES (?, ?, ?, ?, ?)
                    `;
                    
                    const stmt = db.prepare(insertItemsSql);
                    let itemsInserted = 0;
                    const errors = [];
                    
                    items.forEach((item, index) => {
                        stmt.run([
                            templateId,
                            item.item_description || item.item_text || '',
                            item.sort_order || item.item_order || index + 1,
                            item.is_required ? 1 : 0,
                            item.category || 'general'
                        ], function(err) {
                            if (err) {
                                errors.push(`Error inserting item ${index}: ${err.message}`);
                            }
                            itemsInserted++;
                            
                            // Cuando todos los items se han procesado
                            if (itemsInserted === items.length) {
                                stmt.finalize();
                                
                                if (errors.length > 0) {
                                    console.error('Errors inserting items:', errors);
                                    return res.status(500).json({ 
                                        error: 'Template actualizado pero hubo errores con algunos items',
                                        errors: errors
                                    });
                                }
                                
                                res.json({
                                    message: 'Template actualizado exitosamente',
                                    data: {
                                        id: templateId,
                                        name: template_name.trim(),
                                        items_count: items.length
                                    }
                                });
                            }
                        });
                    });
                } else {
                    // No hay items nuevos
                    res.json({
                        message: 'Template actualizado exitosamente',
                        data: {
                            id: templateId,
                            name: template_name.trim(),
                            items_count: 0
                        }
                    });
                }
            });
        });
        
    } catch (error) {
        console.error('Update checklist template endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 8. DELETE /api/gimnacion/checklist-templates/:id - Eliminar template de checklist
router.delete('/gimnacion/checklist-templates/:id', authenticateToken, (req, res) => {
    try {
        const templateId = req.params.id;
        
        // Verificar que el template existe
        const checkSql = `SELECT id, is_default FROM GimnacionChecklistTemplates WHERE id = ?`;
        
        db.get(checkSql, [templateId], (err, template) => {
            if (err) {
                console.error('Error checking template:', err);
                return res.status(500).json({ error: 'Error al verificar template' });
            }
            
            if (!template) {
                return res.status(404).json({ error: 'Template no encontrado' });
            }
            
            if (template.is_default) {
                return res.status(400).json({ error: 'No se puede eliminar un template por defecto' });
            }
            
            // Eliminar template (los items se eliminan automáticamente por CASCADE)
            const deleteSql = `DELETE FROM GimnacionChecklistTemplates WHERE id = ?`;
            
            db.run(deleteSql, [templateId], function(err) {
                if (err) {
                    console.error('Error deleting template:', err);
                    return res.status(500).json({ error: 'Error al eliminar template' });
                }
                
                res.json({
                    message: 'Template eliminado exitosamente',
                    data: { id: templateId }
                });
            });
        });
        
    } catch (error) {
        console.error('Delete checklist template endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===================================================================
// ===================================================================
// DASHBOARD Y FINANZAS EXTRAÍDOS A MÓDULOS
// ===================================================================
// dashboard -> ./modules/dashboard/dashboard.routes
// finance -> ./modules/finance/finance.routes

module.exports = router;
