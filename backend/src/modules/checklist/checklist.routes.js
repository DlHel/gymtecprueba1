/**
 * GYMTEC ERP - APIs para Sistema de Checklist
 * Implementación de Ideas del Documento LAMP - Fase 1
 * 
 * Funcionalidades:
 * - Gestión de templates de checklist
 * - Asignación automática de checklist a tickets
 * - Seguimiento de completado de checklist
 * - Validación para cierre de tickets
 */

const express = require('express');
const router = express.Router();
const db = require('../../db-adapter');
const { authenticateToken } = require('../../core/middleware/auth.middleware');

// =====================================================
// 1. GESTIÓN DE TEMPLATES DE CHECKLIST
// =====================================================

/**
 * GET /api/checklist/templates - Listar templates de checklist
 */
router.get('/checklist/templates', async (req, res) => {
    try {
        const { ticket_type, equipment_category, active_only } = req.query;
        
        let sql = `
            SELECT ct.*, em.name as equipment_model_name, em.brand as equipment_brand
            FROM ChecklistTemplates ct
            LEFT JOIN EquipmentModels em ON ct.equipment_model_id = em.id
            WHERE 1=1
        `;
        const params = [];
        
        if (ticket_type) {
            sql += ' AND ct.ticket_type = ?';
            params.push(ticket_type);
        }
        
        if (equipment_category) {
            sql += ' AND ct.equipment_category = ?';
            params.push(equipment_category);
        }
        
        if (active_only === 'true') {
            sql += ' AND ct.is_active = TRUE';
        }
        
        sql += ' ORDER BY ct.name';
        
        const templates = await db.all(sql, params);
        
        // Obtener count de items para cada template
        for (let template of templates) {
            const itemCount = await db.get(
                'SELECT COUNT(*) as count FROM ChecklistTemplateItems WHERE template_id = ?',
                [template.id]
            );
            template.items_count = itemCount.count;
        }
        
        res.json({
            message: 'success',
            data: templates,
            metadata: { 
                total: templates.length,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Error fetching checklist templates:', error);
        res.status(500).json({ 
            error: 'Error al obtener templates de checklist',
            code: 'CHECKLIST_TEMPLATES_FETCH_ERROR' 
        });
    }
});

/**
 * GET /api/checklist/templates/:id - Obtener template específico con items
 */
router.get('/checklist/templates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Obtener template
        const template = await db.get(`
            SELECT ct.*, em.name as equipment_model_name, em.brand as equipment_brand,
                   u.username as created_by_name
            FROM ChecklistTemplates ct
            LEFT JOIN EquipmentModels em ON ct.equipment_model_id = em.id
            LEFT JOIN Users u ON ct.created_by = u.id
            WHERE ct.id = ?
        `, [id]);
        
        if (!template) {
            return res.status(404).json({
                error: 'Template de checklist no encontrado',
                code: 'CHECKLIST_TEMPLATE_NOT_FOUND'
            });
        }
        
        // Obtener items del template
        const items = await db.all(`
            SELECT * FROM ChecklistTemplateItems 
            WHERE template_id = ? 
            ORDER BY item_order, id
        `, [id]);
        
        template.items = items;
        
        res.json({
            message: 'success',
            data: template
        });
        
    } catch (error) {
        console.error('Error fetching checklist template:', error);
        res.status(500).json({ 
            error: 'Error al obtener template de checklist',
            code: 'CHECKLIST_TEMPLATE_FETCH_ERROR' 
        });
    }
});

/**
 * POST /api/checklist/templates - Crear nuevo template de checklist
 */
router.post('/checklist/templates', async (req, res) => {
    try {
        const {
            name,
            description,
            ticket_type,
            equipment_category,
            equipment_model_id,
            is_mandatory = true,
            items = []
        } = req.body;
        
        // Validaciones básicas
        if (!name || !ticket_type) {
            return res.status(400).json({
                error: 'Faltan campos obligatorios',
                code: 'MISSING_REQUIRED_FIELDS',
                required: ['name', 'ticket_type']
            });
        }
        
        if (items.length === 0) {
            return res.status(400).json({
                error: 'Debe incluir al menos un item en el checklist',
                code: 'NO_CHECKLIST_ITEMS'
            });
        }
        
        // Crear template
        const templateSql = `
            INSERT INTO ChecklistTemplates (
                name, description, ticket_type, equipment_category, 
                equipment_model_id, is_mandatory, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const templateResult = await db.run(templateSql, [
            name, description, ticket_type, equipment_category,
            equipment_model_id || null, is_mandatory, req.user?.id || null
        ]);
        
        const templateId = templateResult.lastID;
        
        // Crear items del checklist
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemSql = `
                INSERT INTO ChecklistTemplateItems (
                    template_id, item_text, item_order, is_required, expected_result, notes
                ) VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            await db.run(itemSql, [
                templateId,
                item.text || item.item_text,
                item.order || i + 1,
                item.is_required !== false, // Por defecto true
                item.expected_result || null,
                item.notes || null
            ]);
        }
        
        // Obtener el template creado completo
        const newTemplate = await db.get(`
            SELECT ct.*, em.name as equipment_model_name
            FROM ChecklistTemplates ct
            LEFT JOIN EquipmentModels em ON ct.equipment_model_id = em.id
            WHERE ct.id = ?
        `, [templateId]);
        
        const newItems = await db.all(`
            SELECT * FROM ChecklistTemplateItems 
            WHERE template_id = ? 
            ORDER BY item_order
        `, [templateId]);
        
        newTemplate.items = newItems;
        
        res.status(201).json({
            message: 'Template de checklist creado exitosamente',
            data: newTemplate
        });
        
    } catch (error) {
        console.error('Error creating checklist template:', error);
        res.status(500).json({ 
            error: 'Error al crear template de checklist',
            code: 'CHECKLIST_TEMPLATE_CREATE_ERROR' 
        });
    }
});

// =====================================================
// 2. ASIGNACIÓN Y GESTIÓN DE CHECKLIST EN TICKETS
// =====================================================

/**
 * POST /api/tickets/:ticketId/checklist/assign - Asignar checklist automático a ticket
 */
router.post('/tickets/:ticketId/checklist/assign', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { template_id } = req.body; // Opcional: especificar template específico
        
        // Obtener información del ticket
        const ticket = await db.get(`
            SELECT t.*, e.model_id as equipment_model_id
            FROM Tickets t
            LEFT JOIN Equipment e ON t.equipment_id = e.model_id
            WHERE t.id = ?
        `, [ticketId]);
        
        if (!ticket) {
            return res.status(404).json({
                error: 'Ticket no encontrado',
                code: 'TICKET_NOT_FOUND'
            });
        }
        
        let selectedTemplate;
        
        if (template_id) {
            // Usar template específico
            selectedTemplate = await db.get('SELECT * FROM ChecklistTemplates WHERE id = ? AND is_active = TRUE', [template_id]);
        } else {
            // Buscar template automático basado en tipo de ticket y equipo
            let templateSql = `
                SELECT * FROM ChecklistTemplates 
                WHERE ticket_type = ? 
                AND is_active = TRUE 
                AND is_mandatory = TRUE
            `;
            const templateParams = [ticket.ticket_type];
            
            // Priorizar template específico para el modelo del equipo
            if (ticket.equipment_model_id) {
                templateSql += ' AND (equipment_model_id = ? OR equipment_model_id IS NULL)';
                templateParams.push(ticket.equipment_model_id);
                templateSql += ' ORDER BY equipment_model_id DESC'; // Específico primero
            }
            
            templateSql += ' LIMIT 1';
            
            selectedTemplate = await db.get(templateSql, templateParams);
        }
        
        if (!selectedTemplate) {
            return res.status(404).json({
                error: 'No se encontró template de checklist para este ticket',
                code: 'NO_CHECKLIST_TEMPLATE_FOUND'
            });
        }
        
        // Verificar si ya existe checklist para este ticket
        const existingChecklist = await db.get(
            'SELECT id FROM TicketChecklist WHERE ticket_id = ? AND template_id = ?',
            [ticketId, selectedTemplate.id]
        );
        
        if (existingChecklist) {
            return res.status(400).json({
                error: 'Ya existe un checklist asignado para este ticket',
                code: 'CHECKLIST_ALREADY_EXISTS'
            });
        }
        
        // Crear TicketChecklist
        const checklistResult = await db.run(`
            INSERT INTO TicketChecklist (
                ticket_id, template_id, assigned_technician_id, status
            ) VALUES (?, ?, ?, 'pendiente')
        `, [ticketId, selectedTemplate.id, ticket.assigned_technician_id]);
        
        const checklistId = checklistResult.lastID;
        
        // Obtener items del template y crear TicketChecklistItems
        const templateItems = await db.all(
            'SELECT * FROM ChecklistTemplateItems WHERE template_id = ? ORDER BY item_order',
            [selectedTemplate.id]
        );
        
        for (const item of templateItems) {
            await db.run(`
                INSERT INTO TicketChecklistItems (
                    ticket_checklist_id, template_item_id, is_completed, requires_attention
                ) VALUES (?, ?, FALSE, ?)
            `, [checklistId, item.id, item.is_required]);
        }
        
        // Actualizar ticket para indicar que tiene checklist pendiente
        await db.run(`
            UPDATE Tickets SET 
                checklist_completed = FALSE,
                can_close = FALSE
            WHERE id = ?
        `, [ticketId]);
        
        res.status(201).json({
            message: 'Checklist asignado exitosamente al ticket',
            data: {
                ticket_id: ticketId,
                checklist_id: checklistId,
                template_name: selectedTemplate.name,
                items_count: templateItems.length
            }
        });
        
    } catch (error) {
        console.error('Error assigning checklist to ticket:', error);
        res.status(500).json({ 
            error: 'Error al asignar checklist al ticket',
            code: 'CHECKLIST_ASSIGN_ERROR' 
        });
    }
});

/**
 * GET /api/tickets/:ticketId/checklist - Obtener checklist del ticket
 */
router.get('/tickets/:ticketId/checklist', async (req, res) => {
    try {
        const { ticketId } = req.params;
        
        // Obtener items del checklist del ticket desde la tabla real TicketChecklists
        const items = await db.all(`
            SELECT * FROM TicketChecklists 
            WHERE ticket_id = ?
            ORDER BY order_index ASC, id ASC
        `, [ticketId]);
        
        // Calcular progreso
        const totalItems = items.length;
        const completedItems = items.filter(item => item.is_completed === 1).length;
        
        res.json({
            message: 'success',
            data: {
                ticket_id: parseInt(ticketId),
                items: items,
                progress: {
                    total: totalItems,
                    completed: completedItems,
                    percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
                    pending: totalItems - completedItems
                }
            }
        });
        
    } catch (error) {
        console.error('Error fetching ticket checklist:', error);
        res.status(500).json({ 
            error: 'Error al obtener checklist del ticket',
            code: 'TICKET_CHECKLIST_FETCH_ERROR' 
        });
    }
});

/**
 * PUT /api/tickets/:ticketId/checklist/items/:itemId - Marcar item como completado/pendiente
 */
router.put('/tickets/:ticketId/checklist/items/:itemId', (req, res) => {
    try {
        const { ticketId, itemId } = req.params;
        const { is_completed, completion_notes } = req.body;
        
        // Verificar que el item existe y pertenece al ticket
        db.get(`
            SELECT * FROM ticketchecklists 
            WHERE id = ? AND ticket_id = ?
        `, [itemId, ticketId], (err, item) => {
            if (err) {
                console.error('Error verificando item de checklist:', err);
                return res.status(500).json({
                    error: 'Error interno del servidor',
                    code: 'DB_ERROR'
                });
            }
            
            if (!item) {
                return res.status(404).json({
                    error: 'Item de checklist no encontrado',
                    code: 'CHECKLIST_ITEM_NOT_FOUND'
                });
            }
            
            // Actualizar item
            // Formato fecha compatible con MySQL: 'YYYY-MM-DD HH:MM:SS'
            const now = new Date();
            const completedAt = is_completed 
                ? `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
                : null;
            const completedBy = is_completed ? (req.user?.username || req.user?.id || 'Sistema') : null;
            
            db.run(`
                UPDATE ticketchecklists SET
                    is_completed = ?,
                    completed_at = ?,
                    completed_by = ?
                WHERE id = ?
            `, [is_completed ? 1 : 0, completedAt, completedBy, itemId], function(err) {
                if (err) {
                    console.error('Error actualizando item de checklist:', err);
                    return res.status(500).json({
                        error: 'Error al actualizar item de checklist',
                        code: 'CHECKLIST_UPDATE_ERROR'
                    });
                }
                
                // Calcular progreso del checklist
                db.all(`
                    SELECT 
                        COUNT(*) as total,
                        SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed
                    FROM ticketchecklists 
                    WHERE ticket_id = ?
                `, [ticketId], (err, progressResult) => {
                    if (err) {
                        console.error('Error calculando progreso:', err);
                        // Continuar sin el progreso si hay error
                    }
                    
                    const progress = progressResult && progressResult.length > 0 ? progressResult[0] : { total: 0, completed: 0 };
                    const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
                    const isFullyCompleted = percentage === 100;
                    
                    res.json({
                        message: 'Item de checklist actualizado exitosamente',
                        data: {
                            item_id: itemId,
                            is_completed,
                            progress: {
                                percentage: Math.round(percentage),
                                completed: progress.completed,
                                total: progress.total,
                                fully_completed: isFullyCompleted
                            }
                        }
                    });
                });
            });
        });
        
    } catch (error) {
        console.error('Error updating checklist item:', error);
        res.status(500).json({ 
            error: 'Error al actualizar item de checklist',
            code: 'CHECKLIST_ITEM_UPDATE_ERROR' 
        });
    }
});

/**
 * POST /api/tickets/:ticketId/checklist - Agregar nuevo item al checklist del ticket
 */
router.post('/tickets/:ticketId/checklist', authenticateToken, (req, res) => {
    try {
        const { ticketId } = req.params;
        const { title, description } = req.body;
        
        // Validación de entrada
        if (!title || title.trim().length === 0) {
            return res.status(400).json({
                error: 'El título es requerido',
                code: 'TITLE_REQUIRED'
            });
        }
        
        if (title.length > 200) {
            return res.status(400).json({
                error: 'El título no puede exceder 200 caracteres',
                code: 'TITLE_TOO_LONG'
            });
        }
        
        // Verificar que el ticket existe
        db.get('SELECT id FROM tickets WHERE id = ?', [ticketId], (err, ticket) => {
            if (err) {
                console.error('Error verificando ticket:', err);
                return res.status(500).json({
                    error: 'Error interno del servidor',
                    code: 'DB_ERROR'
                });
            }
            
            if (!ticket) {
                return res.status(404).json({
                    error: 'Ticket no encontrado',
                    code: 'TICKET_NOT_FOUND'
                });
            }
            
            // Obtener el siguiente order_index
            db.get('SELECT MAX(order_index) as max_order FROM ticketchecklists WHERE ticket_id = ?', [ticketId], (err, result) => {
                if (err) {
                    console.error('Error obteniendo order_index:', err);
                    return res.status(500).json({
                        error: 'Error interno del servidor',
                        code: 'DB_ERROR'
                    });
                }
                
                const nextOrderIndex = (result.max_order || -1) + 1;
                
                // Insertar nuevo item del checklist
                const sql = `
                    INSERT INTO ticketchecklists (ticket_id, title, description, is_completed, order_index, created_at)
                    VALUES (?, ?, ?, 0, ?, NOW())
                `;
                
                db.run(sql, [ticketId, title.trim(), description || null, nextOrderIndex], function(err) {
                    if (err) {
                        console.error('Error insertando item de checklist:', err);
                        return res.status(500).json({
                            error: 'Error al agregar item al checklist',
                            code: 'CHECKLIST_INSERT_ERROR'
                        });
                    }
                    
                    // Obtener el item recién creado
                    db.get('SELECT * FROM ticketchecklists WHERE id = ?', [this.lastID], (err, newItem) => {
                        if (err) {
                            console.error('Error obteniendo item creado:', err);
                            return res.status(500).json({
                                error: 'Error interno del servidor',
                                code: 'DB_ERROR'
                            });
                        }
                        
                        res.status(201).json({
                            message: 'Item agregado al checklist exitosamente',
                            data: {
                                id: newItem.id,
                                ticket_id: newItem.ticket_id,
                                title: newItem.title,
                                description: newItem.description,
                                is_completed: newItem.is_completed === 1,
                                order_index: newItem.order_index,
                                created_at: newItem.created_at
                            }
                        });
                    });
                });
            });
        });
        
    } catch (error) {
        console.error('Error adding checklist item:', error);
        res.status(500).json({ 
            error: 'Error al agregar item al checklist',
            code: 'CHECKLIST_ADD_ERROR' 
        });
    }
});

// DELETE - Eliminar item de checklist
router.delete('/tickets/:ticketId/checklist/items/:itemId', authenticateToken, (req, res) => {
    const { itemId, ticketId } = req.params;
    
    try {
        // Verificar que el item existe y pertenece al ticket
        db.get('SELECT * FROM ticketchecklists WHERE id = ? AND ticket_id = ?', [itemId, ticketId], (err, item) => {
            if (err) {
                console.error('Error retrieving checklist item:', err);
                return res.status(500).json({ 
                    error: 'Error al consultar item de checklist',
                    code: 'DB_ERROR' 
                });
            }

            if (!item) {
                return res.status(404).json({ 
                    error: 'Item de checklist no encontrado',
                    code: 'CHECKLIST_ITEM_NOT_FOUND' 
                });
            }

            // Eliminar el item
            db.run('DELETE FROM ticketchecklists WHERE id = ? AND ticket_id = ?', [itemId, ticketId], function(err) {
                if (err) {
                    console.error('Error deleting checklist item:', err);
                    return res.status(500).json({ 
                        error: 'Error al eliminar item de checklist',
                        code: 'DB_DELETE_ERROR' 
                    });
                }

                if (this.changes === 0) {
                    return res.status(404).json({ 
                        error: 'Item de checklist no encontrado o ya eliminado',
                        code: 'NO_CHANGES_MADE' 
                    });
                }

                console.log(`✅ Checklist item ${itemId} eliminado del ticket ${ticketId}`);
                
                res.json({ 
                    message: 'Item de checklist eliminado exitosamente',
                    data: { 
                        itemId: parseInt(itemId, 10),
                        ticketId: parseInt(ticketId, 10),
                        deleted: true 
                    },
                    metadata: { 
                        timestamp: new Date().toISOString() 
                    }
                });
            });
        });
    } catch (error) {
        console.error('Error deleting checklist item:', error);
        res.status(500).json({ 
            error: 'Error al eliminar item de checklist',
            code: 'CHECKLIST_ITEM_DELETE_ERROR' 
        });
    }
});

module.exports = router;
