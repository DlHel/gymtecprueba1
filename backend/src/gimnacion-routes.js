// =====================================================
// GIMNACIÓN TICKETS API ENDPOINTS - Gymtec ERP v3.0
// Fecha: 28 de septiembre de 2025
// Descripción: Endpoints específicos para tickets de gimnación
// =====================================================

const express = require('express');
const router = express.Router();

// ====================================================
// GIMNACIÓN - ENDPOINTS PRINCIPALES
// ====================================================

// 1. GET /api/locations/:id/equipment - Obtener equipos de una sede con info de contrato
router.get('/locations/:locationId/equipment', authenticateToken, async (req, res) => {
    try {
        const { locationId } = req.params;
        const { contractId } = req.query;
        
        let sql = `
            SELECT 
                e.id,
                e.name,
                e.type,
                e.brand,
                e.model,
                e.serial_number,
                e.activo,
                em.category,
                em.subcategory,
                CASE 
                    WHEN ce.equipment_id IS NOT NULL THEN true 
                    ELSE false 
                END as is_in_contract
            FROM Equipment e
            LEFT JOIN EquipmentModels em ON e.model_id = em.id
            LEFT JOIN Contract_Equipment ce ON e.id = ce.equipment_id AND ce.contract_id = ?
            WHERE e.location_id = ? AND e.activo = true
            ORDER BY e.name
        `;
        
        const params = contractId ? [contractId, locationId] : [null, locationId];
        
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Error fetching location equipment:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            res.json({
                message: 'success',
                data: rows,
                metadata: {
                    locationId: parseInt(locationId),
                    contractId: contractId ? parseInt(contractId) : null,
                    totalEquipment: rows.length,
                    contractEquipment: rows.filter(r => r.is_in_contract).length
                }
            });
        });
        
    } catch (error) {
        console.error('Location equipment endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 2. POST /api/tickets/gimnacion - Crear ticket de gimnación
router.post('/tickets/gimnacion', authenticateToken, async (req, res) => {
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
        
        // Iniciar transacción
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            // 1. Crear ticket principal
            const createTicketSql = `
                INSERT INTO Tickets (
                    title, description, status, priority, ticket_type,
                    client_id, location_id, contract_id, assigned_technician_id,
                    created_at, updated_at
                ) VALUES (?, ?, 'Abierto', ?, 'gimnacion', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `;
            
            const mainTechnician = technicians && technicians.length > 0 ? technicians[0].technician_id : null;
            
            db.run(createTicketSql, [
                title, description, priority, client_id, location_id, contract_id, mainTechnician
            ], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    console.error('Error creating gimnacion ticket:', err);
                    return res.status(500).json({ error: 'Error creating ticket' });
                }
                
                const ticketId = this.lastID;
                
                // 2. Insertar scope de equipos
                const equipmentScopePromises = equipment_scope.map(scope => {
                    return new Promise((resolve, reject) => {
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
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                });
                
                Promise.all(equipmentScopePromises)
                    .then(() => {
                        // 3. Insertar técnicos asignados
                        if (technicians && technicians.length > 0) {
                            const technicianPromises = technicians.map(tech => {
                                return new Promise((resolve, reject) => {
                                    const techSql = `
                                        INSERT INTO TicketTechnicians (
                                            ticket_id, technician_id, role, assigned_by
                                        ) VALUES (?, ?, ?, ?)
                                    `;
                                    
                                    db.run(techSql, [
                                        ticketId, tech.technician_id, tech.role || 'Asistente', req.user.id
                                    ], (err) => {
                                        if (err) reject(err);
                                        else resolve();
                                    });
                                });
                            });
                            
                            return Promise.all(technicianPromises);
                        }
                        return Promise.resolve();
                    })
                    .then(() => {
                        // 4. Crear checklist
                        if (checklist_template_id || (custom_checklist && custom_checklist.length > 0)) {
                            let checklistPromises = [];
                            
                            if (checklist_template_id) {
                                // Usar template existente
                                checklistPromises.push(new Promise((resolve, reject) => {
                                    const templateSql = `
                                        SELECT item_text, item_order, category
                                        FROM GimnacionChecklistItems 
                                        WHERE template_id = ?
                                        ORDER BY item_order
                                    `;
                                    
                                    db.all(templateSql, [checklist_template_id], (err, items) => {
                                        if (err) {
                                            reject(err);
                                            return;
                                        }
                                        
                                        const insertPromises = items.map(item => {
                                            return new Promise((resolve2, reject2) => {
                                                const checklistSql = `
                                                    INSERT INTO TicketGimnacionChecklist (
                                                        ticket_id, template_id, item_text, item_order
                                                    ) VALUES (?, ?, ?, ?)
                                                `;
                                                
                                                db.run(checklistSql, [
                                                    ticketId, checklist_template_id, item.item_text, item.item_order
                                                ], (err2) => {
                                                    if (err2) reject2(err2);
                                                    else resolve2();
                                                });
                                            });
                                        });
                                        
                                        Promise.all(insertPromises).then(resolve).catch(reject);
                                    });
                                }));
                            }
                            
                            if (custom_checklist && custom_checklist.length > 0) {
                                // Usar checklist personalizado
                                const customPromises = custom_checklist.map(item => {
                                    return new Promise((resolve, reject) => {
                                        const customSql = `
                                            INSERT INTO TicketGimnacionChecklist (
                                                ticket_id, item_text, item_order
                                            ) VALUES (?, ?, ?)
                                        `;
                                        
                                        db.run(customSql, [
                                            ticketId, item.item_text, item.item_order || 0
                                        ], (err) => {
                                            if (err) reject(err);
                                            else resolve();
                                        });
                                    });
                                });
                                
                                checklistPromises = checklistPromises.concat(customPromises);
                            }
                            
                            return Promise.all(checklistPromises);
                        }
                        return Promise.resolve();
                    })
                    .then(() => {
                        db.run('COMMIT');
                        
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
                    })
                    .catch(error => {
                        db.run('ROLLBACK');
                        console.error('Error in gimnacion ticket transaction:', error);
                        res.status(500).json({ error: 'Error creating gimnacion ticket' });
                    });
            });
        });
        
    } catch (error) {
        console.error('Gimnacion ticket creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 3. GET /api/tickets/:id/gimnacion-details - Obtener detalles completos de ticket de gimnación
router.get('/tickets/:ticketId/gimnacion-details', authenticateToken, async (req, res) => {
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
router.get('/gimnacion/checklist-templates', authenticateToken, async (req, res) => {
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
router.get('/gimnacion/checklist-templates/:templateId/items', authenticateToken, async (req, res) => {
    try {
        const { templateId } = req.params;
        
        const sql = `
            SELECT * FROM GimnacionChecklistItems
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

// 6. POST /api/gimnacion/checklist-templates - Crear nuevo template
router.post('/gimnacion/checklist-templates', authenticateToken, async (req, res) => {
    try {
        const { name, description, items } = req.body;
        
        if (!name || !items || !Array.isArray(items)) {
            return res.status(400).json({
                error: 'Faltan campos requeridos',
                required: ['name', 'items (array)']
            });
        }
        
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            // Crear template
            const templateSql = `
                INSERT INTO GimnacionChecklistTemplates (name, description, created_by)
                VALUES (?, ?, ?)
            `;
            
            db.run(templateSql, [name, description, req.user.id], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    console.error('Error creating checklist template:', err);
                    return res.status(500).json({ error: 'Error creating template' });
                }
                
                const templateId = this.lastID;
                
                // Crear items
                const itemPromises = items.map((item, index) => {
                    return new Promise((resolve, reject) => {
                        const itemSql = `
                            INSERT INTO GimnacionChecklistItems (
                                template_id, item_text, item_order, is_required, category
                            ) VALUES (?, ?, ?, ?, ?)
                        `;
                        
                        db.run(itemSql, [
                            templateId,
                            item.item_text,
                            item.item_order || index + 1,
                            item.is_required || false,
                            item.category || 'General'
                        ], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                });
                
                Promise.all(itemPromises)
                    .then(() => {
                        db.run('COMMIT');
                        
                        res.status(201).json({
                            message: 'Template de checklist creado exitosamente',
                            data: {
                                template_id: templateId,
                                name: name,
                                items_count: items.length
                            }
                        });
                    })
                    .catch(error => {
                        db.run('ROLLBACK');
                        console.error('Error creating template items:', error);
                        res.status(500).json({ error: 'Error creating template items' });
                    });
            });
        });
        
    } catch (error) {
        console.error('Create template endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 7. GET /api/gimnacion/reports - Reportes específicos de gimnación
router.get('/gimnacion/reports', authenticateToken, async (req, res) => {
    try {
        const { start_date, end_date, client_id, status } = req.query;
        
        let sql = `
            SELECT * FROM GimnacionTicketsReport
            WHERE 1=1
        `;
        
        const params = [];
        
        if (start_date) {
            sql += ' AND DATE(created_at) >= ?';
            params.push(start_date);
        }
        
        if (end_date) {
            sql += ' AND DATE(created_at) <= ?';
            params.push(end_date);
        }
        
        if (client_id) {
            sql += ' AND client_name IN (SELECT name FROM Clients WHERE id = ?)';
            params.push(client_id);
        }
        
        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }
        
        sql += ' ORDER BY created_at DESC';
        
        db.all(sql, params, (err, reports) => {
            if (err) {
                console.error('Error fetching gimnacion reports:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            // Calcular estadísticas
            const stats = {
                total_tickets: reports.length,
                total_equipment_serviced: reports.reduce((sum, r) => sum + (r.included_equipment || 0), 0),
                average_completion_rate: reports.length > 0 
                    ? Math.round(reports.reduce((sum, r) => {
                        return sum + (r.total_equipment > 0 ? (r.completed_equipment / r.total_equipment) * 100 : 0);
                    }, 0) / reports.length)
                    : 0,
                by_status: {}
            };
            
            reports.forEach(r => {
                stats.by_status[r.status] = (stats.by_status[r.status] || 0) + 1;
            });
            
            res.json({
                message: 'success',
                data: reports,
                statistics: stats,
                filters: {
                    start_date,
                    end_date,
                    client_id,
                    status
                }
            });
        });
        
    } catch (error) {
        console.error('Gimnacion reports endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;

// =====================================================
// FIN DE ENDPOINTS DE GIMNACIÓN
// =====================================================