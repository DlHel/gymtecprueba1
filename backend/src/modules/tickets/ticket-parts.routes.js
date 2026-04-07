const express = require('express');
const router = express.Router();
const db = require('../../db-adapter');
const { authenticateToken } = require('../../core/middleware/auth.middleware');

/**
 * GYMTEC ERP - Submódulo de repuestos por ticket
 * Extraído de server-clean.js para arquitectura modular
 */

// GESTIÓN DE REPUESTOS PARA TICKETS
// ===================================================================

// POST spare part usage to ticket
router.post('/tickets/:ticketId/spare-parts', authenticateToken, (req, res) => {
    const { ticketId } = req.params;
    const { spare_part_id, quantity_used, unit_cost, notes, bill_to_client } = req.body;
    
    console.log(`🔧 Registrando uso de repuesto en ticket ${ticketId}:`, { spare_part_id, quantity_used, unit_cost, bill_to_client });
    
    // Validaciones básicas
    if (!spare_part_id || !quantity_used || quantity_used <= 0) {
        return res.status(400).json({
            error: 'spare_part_id y quantity_used son requeridos y quantity_used debe ser > 0',
            code: 'VALIDATION_ERROR'
        });
    }
    
    // Nota: unit_cost ya no es requerido - se obtiene del catálogo si no se proporciona
    
    // Verificar que el ticket existe
    db.get('SELECT id, title FROM Tickets WHERE id = ?', [ticketId], (err, ticket) => {
        if (err) {
            console.error('❌ Error verificando ticket:', err.message);
            return res.status(500).json({ 
                error: 'Error verificando ticket',
                code: 'TICKET_CHECK_ERROR'
            });
        }
        
        if (!ticket) {
            return res.status(404).json({
                error: 'Ticket no encontrado',
                code: 'TICKET_NOT_FOUND'
            });
        }
        
        // Verificar que el repuesto existe y tiene stock - incluir precio
        db.get('SELECT id, name, sku, current_stock, unit_price FROM SpareParts WHERE id = ?', [spare_part_id], (err, sparePart) => {
            if (err) {
                console.error('❌ Error verificando repuesto:', err.message);
                return res.status(500).json({ 
                    error: 'Error verificando repuesto',
                    code: 'SPARE_PART_CHECK_ERROR'
                });
            }
            
            if (!sparePart) {
                return res.status(404).json({
                    error: 'Repuesto no encontrado',
                    code: 'SPARE_PART_NOT_FOUND'
                });
            }
            
            // 🆕 NUEVA LÓGICA: Si no hay stock suficiente, usar lo disponible y solicitar lo faltante
            const availableStock = parseFloat(sparePart.current_stock);
            const requestedQty = parseFloat(quantity_used);
            const shortageQty = requestedQty - availableStock;
            const actualUsedQty = Math.min(availableStock, requestedQty);
            
            console.log(`📊 Stock analysis:`, {
                available: availableStock,
                requested: requestedQty,
                shortage: shortageQty > 0 ? shortageQty : 0,
                willUse: actualUsedQty
            });
            
            // Si no hay NADA de stock, solo crear solicitud
            if (availableStock <= 0) {
                console.log('⚠️ Sin stock disponible, creando solo solicitud de compra...');
                
                // Crear solicitud de compra por la cantidad total
                const requestSql = `
                    INSERT INTO spare_part_requests (
                        ticket_id,
                        spare_part_name,
                        quantity_needed,
                        priority,
                        justification,
                        requested_by,
                        status
                    ) VALUES (?, ?, ?, 'alta', ?, ?, 'pendiente')
                `;
                
                const justification = notes ? 
                    `Repuesto solicitado para ticket #${ticketId}. ${notes}` : 
                    `Repuesto solicitado para ticket #${ticketId}`;
                
                db.run(requestSql, [
                    ticketId,
                    sparePart.name,
                    requestedQty,
                    justification,
                    req.user.username || req.user.id
                ], function(err) {
                    if (err) {
                        console.error('❌ Error creando solicitud:', err.message);
                        return res.status(500).json({ 
                            error: 'Error al crear solicitud de compra',
                            code: 'REQUEST_CREATE_ERROR'
                        });
                    }
                    
                    console.log(`✅ Solicitud de compra creada - ID: ${this.lastID}, Cantidad: ${requestedQty}`);
                    
                    res.status(201).json({
                        message: 'Sin stock disponible. Se ha creado una solicitud de compra',
                        data: {
                            action: 'request_created',
                            request_id: this.lastID,
                            requested_quantity: requestedQty
                        }
                    });
                });
                
                return; // Terminar aquí
            }
            
            // Insertar en ticketspareparts (solo la cantidad que SÍ hay en stock)
            const insertSql = `
                INSERT INTO ticketspareparts 
                (ticket_id, spare_part_id, quantity_used, unit_cost, notes, used_at) 
                VALUES (?, ?, ?, ?, ?, NOW())
            `;
            
            const usageNotes = shortageQty > 0 ? 
                `${notes || 'Uso de repuesto'} - Stock disponible: ${actualUsedQty}. Faltante: ${shortageQty} (solicitado)` :
                notes || 'Uso de repuesto';
            
            // Usar unit_cost del frontend o precio del catálogo si está disponible
            const catalogPrice = parseFloat(sparePart.unit_price) || 0;
            const finalUnitCost = unit_cost && unit_cost > 0 ? unit_cost : catalogPrice;
            console.log(`💰 Precio unitario: ${finalUnitCost} (fuente: ${unit_cost && unit_cost > 0 ? 'frontend' : catalogPrice > 0 ? 'catálogo' : 'sin precio'})`);
            
            db.run(insertSql, [ticketId, spare_part_id, actualUsedQty, finalUnitCost, usageNotes], function(err) {
                if (err) {
                    console.error('❌ Error insertando repuesto en ticket:', err.message);
                    return res.status(500).json({ 
                        error: 'Error al agregar repuesto al ticket',
                        code: 'INSERT_ERROR'
                    });
                }
                
                const sparePartUsageId = this.lastID;
                
                // Actualizar stock del repuesto (restar solo lo que SE USARÁ)
                const updateStockSql = 'UPDATE spareparts SET current_stock = current_stock - ? WHERE id = ?';
                db.run(updateStockSql, [actualUsedQty, spare_part_id], (err) => {
                    if (err) {
                        console.error('❌ Error actualizando stock:', err.message);
                        // Revertir la inserción
                        db.run('DELETE FROM ticketspareparts WHERE id = ?', [sparePartUsageId]);
                        return res.status(500).json({ 
                            error: 'Error actualizando stock del repuesto',
                            code: 'STOCK_UPDATE_ERROR'
                        });
                    }
                    
                    console.log(`✅ Stock actualizado: ${sparePart.name} - usado: ${actualUsedQty}, nuevo stock: ${availableStock - actualUsedQty}`);
                    
                    // 🆕 REGISTRAR MOVIMIENTO EN INVENTARIO (InventoryTransactions)
                    const newStock = availableStock - actualUsedQty;
                    const transactionSql = `
                        INSERT INTO InventoryTransactions (
                            spare_part_id,
                            transaction_type,
                            quantity,
                            quantity_before,
                            quantity_after,
                            reference_type,
                            reference_id,
                            performed_by,
                            notes,
                            transaction_date
                        ) VALUES (?, 'Salida', ?, ?, ?, 'Ticket', ?, ?, ?, NOW())
                    `;
                    
                    const transactionNotes = notes ? 
                        `Uso en ticket #${ticketId}: ${notes}` : 
                        `Uso en ticket #${ticketId}`;
                    
                    db.run(transactionSql, [
                        spare_part_id,
                        actualUsedQty,
                        availableStock,
                        newStock,
                        ticketId,
                        req.user.id,
                        transactionNotes
                    ], function(transErr) {
                        if (transErr) {
                            console.error('⚠️ Error registrando movimiento de inventario:', transErr.message);
                            // No revertimos, solo loggeamos - el stock ya fue actualizado
                        } else {
                            console.log(`📊 Movimiento de inventario registrado - ID: ${this.lastID}, Tipo: Salida, Cantidad: ${actualUsedQty}`);
                        }
                    });
                    
                    // 🆕 Si hay faltante, crear solicitud de compra automáticamente
                    if (shortageQty > 0) {
                        console.log(`📋 Creando solicitud de compra por ${shortageQty} unidades faltantes...`);
                        
                        const requestSql = `
                            INSERT INTO spare_part_requests (
                                ticket_id,
                                spare_part_name,
                                quantity_needed,
                                priority,
                                justification,
                                requested_by,
                                status
                            ) VALUES (?, ?, ?, 'alta', ?, ?, 'pendiente')
                        `;
                        
                        const justification = notes ? 
                            `Stock insuficiente para ticket #${ticketId}. Usado: ${actualUsedQty}, Faltante: ${shortageQty}. ${notes}` : 
                            `Stock insuficiente para ticket #${ticketId}. Usado: ${actualUsedQty}, Faltante: ${shortageQty}`;
                        
                        db.run(requestSql, [
                            ticketId,
                            sparePart.name,
                            shortageQty,
                            justification,
                            req.user.username || req.user.id
                        ], function(requestErr) {
                            if (requestErr) {
                                console.error('⚠️ Error creando solicitud automática:', requestErr.message);
                                // No revertimos el uso, solo loggeamos
                            } else {
                                console.log(`✅ Solicitud de compra automática creada - ID: ${this.lastID}, Cantidad: ${shortageQty}`);
                            }
                            
                            // Continuar con expense y respuesta
                            handleExpenseAndResponse();
                        });
                    } else {
                        // No hay faltante, continuar directo
                        handleExpenseAndResponse();
                    }
                    
                    function handleExpenseAndResponse() {
                        // 🆕 CREAR SOLICITUD APROBADA AUTOMÁTICAMENTE (registro de uso)
                        console.log(`📋 Creando registro de solicitud aprobada para ${actualUsedQty} unidades usadas...`);
                        
                        const approvedRequestSql = `
                            INSERT INTO spare_part_requests (
                                ticket_id,
                                spare_part_name,
                                quantity_needed,
                                priority,
                                description,
                                justification,
                                requested_by,
                                status,
                                approved_at,
                                approved_by,
                                created_at
                            ) VALUES (?, ?, ?, 'media', ?, ?, ?, 'aprobada', NOW(), ?, NOW())
                        `;
                        
                        const justificationText = notes ? 
                            `Repuesto usado en ticket #${ticketId}. ${notes}` : 
                            `Repuesto usado en ticket #${ticketId}`;
                        
                        const descriptionText = `Stock disponible: ${actualUsedQty} unidades`;
                        
                        db.run(approvedRequestSql, [
                            ticketId,
                            sparePart.name,
                            actualUsedQty,
                            descriptionText,
                            justificationText,
                            req.user.username || req.user.id,
                            req.user.id
                        ], function(requestErr) {
                            if (requestErr) {
                                console.error('⚠️ Error creando solicitud aprobada:', requestErr.message);
                                // No revertimos el uso, solo loggeamos
                            } else {
                                console.log(`✅ Solicitud aprobada registrada - ID: ${this.lastID}, Cantidad: ${actualUsedQty}`);
                            }
                            
                            // Continuar con expense
                            createExpenseIfNeeded();
                        });
                        
                        function createExpenseIfNeeded() {
                            // CREAR EXPENSE AUTOMÁTICAMENTE si bill_to_client = true y hay costo
                            if (bill_to_client && finalUnitCost > 0) {
                                const totalCost = actualUsedQty * finalUnitCost;
                                const expenseDescription = `Repuesto: ${sparePart.name} (${actualUsedQty} ${actualUsedQty > 1 ? 'unidades' : 'unidad'}) - ${ticket.title}`;
                                
                                // Obtener o crear categoría "Repuestos"
                                db.get('SELECT id FROM ExpenseCategories WHERE name = ? LIMIT 10', ['Repuestos'], (err, category) => {
                                    const categoryId = category ? category.id : null;
                                    
                                    const expenseSql = `
                                        INSERT INTO Expenses (
                                            category_id, 
                                            category, 
                                            description, 
                                            amount, 
                                            date, 
                                            reference_type, 
                                            reference_id,
                                            notes,
                                            created_by, 
                                            status
                                        ) VALUES (?, 'Repuestos', ?, ?, NOW(), 'ticket', ?, ?, ?, 'Aprobado')
                                    `;
                                    
                                    const expenseNotes = notes ? `Uso registrado en ticket #${ticketId}. ${notes}` : `Uso registrado en ticket #${ticketId}`;
                                    
                                    db.run(expenseSql, [
                                        categoryId,
                                        expenseDescription,
                                        totalCost,
                                        ticketId,
                                        expenseNotes,
                                        req.user.id
                                    ], function(expenseErr) {
                                        if (expenseErr) {
                                            console.error('⚠️ Error creando gasto automático:', expenseErr.message);
                                            // No revertimos el uso del repuesto, solo loggeamos el error
                                        } else {
                                            console.log(`💰 Gasto automático creado - ID: ${this.lastID}, Monto: $${totalCost}`);
                                        }
                                        
                                        // Continuar con la respuesta (con o sin expense)
                                        returnSuccessResponse();
                                    });
                                });
                            } else {
                                // No crear expense, retornar directamente
                                returnSuccessResponse();
                            }
                        }
                    }
                    
                    function returnSuccessResponse() {
                        // Obtener el registro completo insertado con datos del repuesto
                        const selectSql = `
                            SELECT 
                                tsp.*,
                                sp.name as spare_part_name,
                                sp.sku as spare_part_sku
                            FROM ticketspareparts tsp
                            JOIN SpareParts sp ON tsp.spare_part_id = sp.id
                            WHERE tsp.id = ?
                        `;
                        
                        db.get(selectSql, [sparePartUsageId], (err, newRecord) => {
                            if (err) {
                                console.error('❌ Error obteniendo registro creado:', err.message);
                                return res.status(500).json({ 
                                    error: 'Error obteniendo registro creado',
                                    code: 'RECORD_FETCH_ERROR'
                                });
                            }
                            
                            console.log(`✅ Uso de repuesto registrado en ticket ${ticketId}, ID: ${sparePartUsageId}`);
                            
                            // Respuesta mejorada con información de stock parcial
                            const responseData = {
                                message: shortageQty > 0 ? 
                                    `Stock parcial usado. Se creó solicitud de compra por ${shortageQty} unidades faltantes.` :
                                    "Uso de repuesto registrado exitosamente",
                                data: newRecord,
                                expense_created: bill_to_client,
                                stock_info: {
                                    requested: requestedQty,
                                    used: actualUsedQty,
                                    shortage: shortageQty,
                                    request_created: shortageQty > 0
                                }
                            };
                            
                            res.status(201).json(responseData);
                        });
                    }
                });
            });
        });
    });
});

/**
 * @route GET /api/tickets/:ticketId/spare-parts/requests
 * @desc Obtener todas las solicitudes de repuestos de un ticket (usados + pendientes)
 * @access Protegido - Requiere autenticación
 */
router.get('/tickets/:ticketId/spare-parts/requests', authenticateToken, (req, res) => {
    const { ticketId } = req.params;
    
    console.log(`📋 Obteniendo repuestos y solicitudes del ticket ${ticketId}...`);
    
    // 1. Obtener repuestos ya USADOS (ticketspareparts)
    const usedPartsSql = `
        SELECT 
            tsp.*,
            sp.name as spare_part_name,
            sp.sku as spare_part_sku,
            'used' as status_type
        FROM ticketspareparts tsp
        LEFT JOIN SpareParts sp ON tsp.spare_part_id = sp.id
        WHERE tsp.ticket_id = ?
        ORDER BY tsp.used_at DESC
    `;
    
    db.all(usedPartsSql, [ticketId], (err, usedParts) => {
        if (err) {
            console.error('❌ Error obteniendo repuestos usados:', err.message);
            return res.status(500).json({
                error: 'Error al obtener repuestos usados',
                code: 'USED_PARTS_ERROR'
            });
        }
        
        // 2. Obtener SOLICITUDES pendientes/aprobadas/rechazadas (spare_part_requests)
        const requestsSql = `
            SELECT 
                spr.*,
                'request' as status_type,
                u.username as requested_by_name,
                approver.username as approved_by_name
            FROM spare_part_requests spr
            LEFT JOIN Users u ON spr.requested_by = u.username
            LEFT JOIN Users approver ON spr.approved_by = approver.id
            WHERE spr.ticket_id = ?
            ORDER BY spr.created_at DESC
        `;
        
        db.all(requestsSql, [ticketId], (err, requests) => {
            if (err) {
                console.error('❌ Error obteniendo solicitudes:', err.message);
                return res.status(500).json({
                    error: 'Error al obtener solicitudes de repuestos',
                    code: 'REQUESTS_ERROR'
                });
            }
            
            console.log(`✅ Repuestos encontrados: ${usedParts.length} usados, ${requests.length} solicitudes`);
            
            res.json({
                message: 'success',
                data: {
                    used_parts: usedParts || [],
                    requests: requests || []
                },
                summary: {
                    used_count: usedParts.length,
                    pending_count: requests.filter(r => r.status === 'pendiente').length,
                    approved_count: requests.filter(r => r.status === 'aprobada').length,
                    rejected_count: requests.filter(r => r.status === 'rechazada').length
                }
            });
        });
    });
});

module.exports = router;
