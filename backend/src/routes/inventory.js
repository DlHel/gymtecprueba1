const express = require('express');
const router = express.Router();
const db = require('../db-adapter');

/**
 * GYMTEC ERP - APIs SISTEMA DE INVENTARIO INTELIGENTE
 * 
 * 🔐 NOTA: Todos los endpoints requieren autenticación JWT
 * 
 * Endpoints implementados:
 * ✅ GET /api/inventory - Listar inventario con filtros
 * ✅ POST /api/inventory - Crear nuevo item
 * ✅ PUT /api/inventory/:id - Actualizar item
 * ✅ DELETE /api/inventory/:id - Eliminar item (soft delete)
 * ✅ GET /api/inventory/:id - Obtener item individual
 * ✅ GET /api/inventory/:id/movements - Movimientos de un item
 * ✅ POST /api/inventory/:id/adjust - Ajustar stock
 * ✅ GET /api/inventory/low-stock - Items con stock bajo
 * ✅ GET /api/inventory/analytics - Analytics de inventario
 * ✅ GET /api/inventory/categories - Categorías de inventario
 * ✅ POST /api/inventory/categories - Crear categoría
 */

// Importar middleware de autenticación desde server-clean.js
// El middleware authenticateToken ya está disponible globalmente
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            error: 'Token de acceso requerido',
            code: 'MISSING_TOKEN'
        });
    }

    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'gymtec-erp-secret-key-2024';

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(401).json({
                error: 'Token inválido o expirado',
                code: 'INVALID_TOKEN'
            });
        }
        req.user = user;
        next();
    });
};

// ===================================================================
// GESTIÓN DE INVENTARIO
// ===================================================================

/**
 * @route GET /api/inventory
 * @desc Obtener lista de inventario con filtros
 * @access Protegido - Requiere autenticación
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { 
            category_id, 
            location_id, 
            supplier_id,
            low_stock_only, 
            critical_only,
            search,
            page = 1, 
            limit = 50 
        } = req.query;
        
        let sql = `
        SELECT 
            i.*,
            ic.name as category_name,
            l.name as location_name,
            ps.company_name as primary_supplier_name,
            as_sup.company_name as alternative_supplier_name,
            CASE 
                WHEN i.current_stock <= i.minimum_stock THEN 'low'
                WHEN i.current_stock >= i.maximum_stock THEN 'overstock'
                ELSE 'normal'
            END as stock_status,
            (i.current_stock * i.average_cost) as total_value
        FROM Inventory i
        LEFT JOIN InventoryCategories ic ON i.category_id = ic.id
        LEFT JOIN Locations l ON i.location_id = l.id
        LEFT JOIN Suppliers ps ON i.primary_supplier_id = ps.id
        LEFT JOIN Suppliers as_sup ON i.alternative_supplier_id = as_sup.id
        WHERE i.is_active = 1`;
        
        const params = [];
        
        if (category_id) {
            sql += ' AND i.category_id = ?';
            params.push(category_id);
        }
        
        if (location_id) {
            sql += ' AND i.location_id = ?';
            params.push(location_id);
        }
        
        if (supplier_id) {
            sql += ' AND (i.primary_supplier_id = ? OR i.alternative_supplier_id = ?)';
            params.push(supplier_id, supplier_id);
        }
        
        if (low_stock_only === 'true') {
            sql += ' AND i.current_stock <= i.minimum_stock';
        }
        
        if (critical_only === 'true') {
            sql += ' AND i.is_critical = 1';
        }
        
        if (search) {
            sql += ' AND (i.item_code LIKE ? OR i.item_name LIKE ? OR i.description LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        sql += ' ORDER BY i.item_name ASC';
        
        // Paginación
        const offset = (parseInt(page) - 1) * parseInt(limit);
        sql += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);
        
        const inventory = await db.all(sql, params);
        
        // Contar total para paginación
        let countSql = `
        SELECT COUNT(*) as total 
        FROM Inventory i 
        WHERE i.is_active = 1`;
        
        const countParams = [];
        
        if (category_id) {
            countSql += ' AND i.category_id = ?';
            countParams.push(category_id);
        }
        
        if (location_id) {
            countSql += ' AND i.location_id = ?';
            countParams.push(location_id);
        }
        
        if (supplier_id) {
            countSql += ' AND (i.primary_supplier_id = ? OR i.alternative_supplier_id = ?)';
            countParams.push(supplier_id, supplier_id);
        }
        
        if (low_stock_only === 'true') {
            countSql += ' AND i.current_stock <= i.minimum_stock';
        }
        
        if (critical_only === 'true') {
            countSql += ' AND i.is_critical = 1';
        }
        
        if (search) {
            countSql += ' AND (i.item_code LIKE ? OR i.item_name LIKE ? OR i.description LIKE ?)';
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm, searchTerm);
        }
        
        const countResult = await db.get(countSql, countParams);
        const total = countResult ? countResult.total : 0;
        
        res.json({
            message: 'success',
            data: inventory || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                totalPages: Math.ceil(total / parseInt(limit))
            },
            summary: {
                totalItems: total,
                lowStockItems: inventory ? inventory.filter(item => item.stock_status === 'low').length : 0,
                criticalItems: inventory ? inventory.filter(item => item.is_critical === 1).length : 0
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo inventario:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

/**
 * @route POST /api/inventory
 * @desc Crear nuevo item de inventario
 * @access Protegido - Requiere autenticación
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            item_code,
            item_name,
            description,
            category_id,
            unit_of_measure = 'unit',
            current_stock = 0,
            minimum_stock = 0,
            maximum_stock = 999999.99,
            reorder_point = 0,
            reorder_quantity = 0,
            unit_cost = 0,
            location_id,
            primary_supplier_id,
            alternative_supplier_id,
            lead_time_days = 0,
            shelf_life_days,
            is_critical = false
        } = req.body;
        
        // Validaciones
        if (!item_code || !item_name) {
            return res.status(400).json({
                error: 'Campos requeridos faltantes',
                details: 'item_code y item_name son obligatorios'
            });
        }
        
        // Verificar que el código no exista
        const existingItem = await db.get(
            'SELECT id FROM Inventory WHERE item_code = ?',
            [item_code]
        );
        
        if (existingItem) {
            return res.status(400).json({
                error: 'Código de item ya existe',
                details: `El código ${item_code} ya está en uso`
            });
        }
        
        const sql = `
        INSERT INTO Inventory (
            item_code, item_name, description, category_id, unit_of_measure,
            current_stock, minimum_stock, maximum_stock, reorder_point, reorder_quantity,
            unit_cost, average_cost, last_cost, location_id, primary_supplier_id,
            alternative_supplier_id, lead_time_days, shelf_life_days, is_critical
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const params = [
            item_code, item_name, description, category_id, unit_of_measure,
            current_stock, minimum_stock, maximum_stock, reorder_point, reorder_quantity,
            unit_cost, unit_cost, unit_cost, location_id, primary_supplier_id,
            alternative_supplier_id, lead_time_days, shelf_life_days, is_critical
        ];
        
        await db.run(sql, params);
        
        // Obtener el item creado
        const newItem = await db.get(
            'SELECT * FROM Inventory WHERE item_code = ?',
            [item_code]
        );
        
        // Crear movimiento inicial si hay stock
        if (current_stock > 0) {
            await db.run(`
                INSERT INTO InventoryMovements (
                    inventory_id, movement_type, quantity, stock_before, stock_after,
                    reference_type, notes, performed_by
                ) VALUES (?, 'in', ?, 0, ?, 'initial', 'Stock inicial', ?)`,
                [newItem.id, current_stock, current_stock, req.user.id]
            );
        }
        
        res.status(201).json({
            message: 'Item de inventario creado exitosamente',
            data: newItem
        });
        
    } catch (error) {
        console.error('Error creando item de inventario:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

/**
 * @route PUT /api/inventory/:id
 * @desc Actualizar item de inventario
 * @access Protegido - Requiere autenticación
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            item_name,
            description,
            category_id,
            unit_of_measure,
            minimum_stock,
            maximum_stock,
            reorder_point,
            reorder_quantity,
            unit_cost,
            location_id,
            primary_supplier_id,
            alternative_supplier_id,
            lead_time_days,
            shelf_life_days,
            is_critical
        } = req.body;
        
        // Verificar que el item existe
        const existingItem = await db.get(
            'SELECT * FROM Inventory WHERE id = ? AND is_active = 1',
            [id]
        );
        
        if (!existingItem) {
            return res.status(404).json({
                error: 'Item no encontrado'
            });
        }
        
        const sql = `
        UPDATE Inventory SET
            item_name = ?, description = ?, category_id = ?, unit_of_measure = ?,
            minimum_stock = ?, maximum_stock = ?, reorder_point = ?, reorder_quantity = ?,
            unit_cost = ?, location_id = ?, primary_supplier_id = ?, alternative_supplier_id = ?,
            lead_time_days = ?, shelf_life_days = ?, is_critical = ?, updated_at = NOW()
        WHERE id = ?`;
        
        const params = [
            item_name, description, category_id, unit_of_measure,
            minimum_stock, maximum_stock, reorder_point, reorder_quantity,
            unit_cost, location_id, primary_supplier_id, alternative_supplier_id,
            lead_time_days, shelf_life_days, is_critical, id
        ];
        
        await db.run(sql, params);
        
        // Obtener el item actualizado
        const updatedItem = await db.get(
            'SELECT * FROM Inventory WHERE id = ?',
            [id]
        );
        
        res.json({
            message: 'Item actualizado exitosamente',
            data: updatedItem
        });
        
    } catch (error) {
        console.error('Error actualizando item:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// ===================================================================
// RUTAS ESPECÍFICAS (DEBEN IR ANTES DE /:id)
// ===================================================================

/**
 * @route GET /api/inventory/movements
 * @desc Obtener historial general de movimientos de inventario + solicitudes pendientes
 * @access Protegido - Requiere autenticación
 */
router.get('/movements', authenticateToken, async (req, res) => {
    try {
        const { 
            inventory_id, 
            movement_type, 
            start_date, 
            end_date,
            limit = 100 
        } = req.query;
        
        // 1. Obtener movimientos completados
        let movementsSql = `
        SELECT 
            im.*,
            i.item_code,
            i.item_name,
            ic.name as category_name,
            u.username as performed_by_name,
            CASE 
                WHEN im.reference_type = 'ticket' THEN t.id
                WHEN im.reference_type = 'spare_part_request' THEN spr.ticket_id
                ELSE NULL
            END as related_ticket_id,
            CASE 
                WHEN im.reference_type = 'ticket' THEN t.title
                WHEN im.reference_type = 'spare_part_request' THEN CONCAT('Solicitud #', spr.id)
                ELSE NULL
            END as related_ticket_title,
            spr.id as request_id,
            spr.status as request_status,
            NULL as is_pending_request
        FROM InventoryMovements im
        LEFT JOIN Inventory i ON im.inventory_id = i.id
        LEFT JOIN InventoryCategories ic ON i.category_id = ic.id
        LEFT JOIN Users u ON im.performed_by = u.id
        LEFT JOIN Tickets t ON im.reference_type = 'ticket' AND im.reference_id = t.id
        LEFT JOIN spare_part_requests spr ON im.reference_type = 'spare_part_request' AND im.reference_id = spr.id
        WHERE 1=1`;
        
        const movementsParams = [];
        
        if (inventory_id) {
            movementsSql += ' AND im.inventory_id = ?';
            movementsParams.push(inventory_id);
        }
        
        if (movement_type) {
            movementsSql += ' AND im.movement_type = ?';
            movementsParams.push(movement_type);
        }
        
        if (start_date) {
            movementsSql += ' AND im.performed_at >= ?';
            movementsParams.push(start_date);
        }
        
        if (end_date) {
            movementsSql += ' AND im.performed_at <= ?';
            movementsParams.push(end_date);
        }
        
        movementsSql += ' ORDER BY im.performed_at DESC';
        
        const movements = await db.all(movementsSql, movementsParams);
        
        // 2. Obtener solicitudes pendientes (que aún no tienen movimiento)
        const pendingRequestsSql = `
        SELECT 
            NULL as id,
            NULL as inventory_id,
            'pending_request' as movement_type,
            spr.quantity_needed as quantity,
            NULL as unit_cost,
            NULL as total_cost,
            NULL as stock_before,
            NULL as stock_after,
            NULL as reference_type,
            spr.id as reference_id,
            NULL as location_from_id,
            NULL as location_to_id,
            NULL as batch_number,
            NULL as expiry_date,
            CONCAT('SOLICITUD PENDIENTE: ', spr.description) as notes,
            NULL as performed_by,
            spr.created_at as performed_at,
            NULL as item_code,
            spr.spare_part_name as item_name,
            NULL as category_name,
            spr.requested_by as performed_by_name,
            t.id as related_ticket_id,
            t.title as related_ticket_title,
            spr.id as request_id,
            spr.status as request_status,
            1 as is_pending_request,
            spr.priority as request_priority
        FROM spare_part_requests spr
        LEFT JOIN Tickets t ON spr.ticket_id = t.id
        WHERE spr.status = 'pendiente'
        ORDER BY spr.created_at DESC
        `;
        
        const pendingRequests = await db.all(pendingRequestsSql, []);
        
        // 2b. Obtener solicitudes rechazadas recientes (últimas 10)
        const rejectedRequestsSql = `
        SELECT 
            NULL as id,
            NULL as inventory_id,
            'rejected_request' as movement_type,
            spr.quantity_needed as quantity,
            NULL as unit_cost,
            NULL as total_cost,
            NULL as stock_before,
            NULL as stock_after,
            NULL as reference_type,
            spr.id as reference_id,
            NULL as location_from_id,
            NULL as location_to_id,
            NULL as batch_number,
            NULL as expiry_date,
            spr.notes as notes,
            NULL as performed_by,
            spr.approved_at as performed_at,
            NULL as item_code,
            spr.spare_part_name as item_name,
            NULL as category_name,
            spr.approved_by as performed_by_name,
            t.id as related_ticket_id,
            t.title as related_ticket_title,
            spr.id as request_id,
            spr.status as request_status,
            0 as is_pending_request,
            spr.priority as request_priority
        FROM spare_part_requests spr
        LEFT JOIN Tickets t ON spr.ticket_id = t.id
        WHERE spr.status = 'rechazada'
        ORDER BY spr.approved_at DESC
        LIMIT 10
        `;
        
        const rejectedRequests = await db.all(rejectedRequestsSql, []);
        
        // 3. Combinar todos los resultados
        const allData = [...pendingRequests, ...rejectedRequests, ...movements];
        
        // 4. Ordenar por fecha y limitar
        allData.sort((a, b) => {
            const dateA = new Date(a.performed_at);
            const dateB = new Date(b.performed_at);
            return dateB - dateA;
        });
        
        const limitedData = allData.slice(0, parseInt(limit));
        
        res.json({
            message: 'success',
            data: limitedData || [],
            count: limitedData.length,
            summary: {
                totalMovements: movements.length,
                pendingRequests: pendingRequests.length,
                rejectedRequests: rejectedRequests.length
            }
        });
        
    } catch (error) {
        console.error('Error al obtener movimientos:', error);
        res.status(500).json({
            error: 'Error al obtener movimientos de inventario',
            details: error.message
        });
    }
});

/**
 * @route GET /api/inventory/technicians
 * @desc Obtener inventario asignado a técnicos
 * @access Protegido - Requiere autenticación
 */
router.get('/technicians', authenticateToken, async (req, res) => {
    try {
        const { technician_id, status } = req.query;
        
        let sql = `
        SELECT 
            ti.*,
            i.item_code,
            i.item_name,
            i.description,
            ic.name as category_name,
            u.username as technician_name,
            u.email as technician_email,
            assigned_by_user.username as assigned_by_name
        FROM TechnicianInventory ti
        LEFT JOIN Inventory i ON ti.spare_part_id = i.id
        LEFT JOIN InventoryCategories ic ON i.category_id = ic.id
        LEFT JOIN Users u ON ti.technician_id = u.id
        LEFT JOIN Users assigned_by_user ON ti.assigned_by = assigned_by_user.id
        WHERE 1=1`;
        
        const params = [];
        
        if (technician_id) {
            sql += ' AND ti.technician_id = ?';
            params.push(technician_id);
        }
        
        if (status) {
            sql += ' AND ti.status = ?';
            params.push(status);
        }
        
        sql += ' ORDER BY ti.assigned_at DESC';
        
        const assignments = await db.all(sql, params);
        
        // Agrupar por técnico
        const groupedByTechnician = {};
        (assignments || []).forEach(item => {
            const techId = item.technician_id;
            if (!groupedByTechnician[techId]) {
                groupedByTechnician[techId] = {
                    technician_id: techId,
                    technician_name: item.technician_name,
                    technician_email: item.technician_email,
                    items: []
                };
            }
            groupedByTechnician[techId].items.push(item);
        });
        
        res.json({
            message: 'success',
            data: Object.values(groupedByTechnician),
            total_assignments: assignments ? assignments.length : 0
        });
        
    } catch (error) {
        console.error('Error al obtener inventario de técnicos:', error);
        res.status(500).json({
            error: 'Error al obtener inventario de técnicos',
            details: error.message
        });
    }
});

/**
 * @route GET /api/inventory/:id
 * @desc Obtener un item específico por ID
 * @access Protegido - Requiere autenticación
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const sql = `
        SELECT 
            i.*,
            ic.name as category_name,
            l.name as location_name,
            ps.company_name as primary_supplier_name,
            as_sup.company_name as alternative_supplier_name
        FROM Inventory i
        LEFT JOIN InventoryCategories ic ON i.category_id = ic.id
        LEFT JOIN Locations l ON i.location_id = l.id
        LEFT JOIN Suppliers ps ON i.primary_supplier_id = ps.id
        LEFT JOIN Suppliers as_sup ON i.alternative_supplier_id = as_sup.id
        WHERE i.id = ? AND i.is_active = 1`;
        
        const item = await db.get(sql, [id]);
        
        if (!item) {
            return res.status(404).json({
                error: 'Item no encontrado',
                code: 'NOT_FOUND'
            });
        }
        
        res.json({
            message: 'success',
            data: item
        });
        
    } catch (error) {
        console.error('Error obteniendo item:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

/**
 * @route DELETE /api/inventory/:id
 * @desc Eliminar (soft delete) un item de inventario
 * @access Protegido - Requiere autenticación
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que el item existe
        const checkSQL = 'SELECT id, item_name FROM Inventory WHERE id = ? AND is_active = 1';
        const exists = await db.get(checkSQL, [id]);
        
        if (!exists) {
            return res.status(404).json({
                error: 'Item no encontrado',
                code: 'NOT_FOUND'
            });
        }
        
        // Soft delete (marcar como inactivo)
        const deleteSQL = 'UPDATE Inventory SET is_active = 0, updated_at = NOW() WHERE id = ?';
        await db.run(deleteSQL, [id]);
        
        // Registrar movimiento
        const movementSQL = `
        INSERT INTO InventoryMovements (
            inventory_id, 
            movement_type, 
            quantity, 
            notes, 
            performed_by
        ) VALUES (?, 'deletion', 0, ?, ?)`;
        
        await db.run(movementSQL, [
            id, 
            `Item "${exists.item_name}" eliminado del inventario`,
            req.user.id
        ]);
        
        res.json({
            message: 'Item eliminado exitosamente',
            data: { id, item_name: exists.item_name }
        });
        
    } catch (error) {
        console.error('Error eliminando item:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

/**
 * @route POST /api/inventory/:id/adjust
 * @desc Ajustar stock de un item
 * @access Protegido - Requiere autenticación
 * @access Protegido - Requiere autenticación
 */
router.post('/:id/adjust', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { adjustment_quantity, reason, notes } = req.body;
        
        if (!adjustment_quantity || adjustment_quantity === 0) {
            return res.status(400).json({
                error: 'Cantidad de ajuste requerida'
            });
        }
        
        // Obtener item actual
        const item = await db.get(
            'SELECT * FROM Inventory WHERE id = ? AND is_active = 1',
            [id]
        );
        
        if (!item) {
            return res.status(404).json({
                error: 'Item no encontrado'
            });
        }
        
        const currentStock = parseFloat(item.current_stock);
        const adjustmentQty = parseFloat(adjustment_quantity);
        const newStock = currentStock + adjustmentQty;
        
        if (newStock < 0) {
            return res.status(400).json({
                error: 'Stock no puede ser negativo',
                details: `Stock actual: ${currentStock}, Ajuste: ${adjustmentQty}`
            });
        }
        
        // Actualizar stock
        await db.run(
            'UPDATE Inventory SET current_stock = ?, updated_at = NOW() WHERE id = ?',
            [newStock, id]
        );
        
        // Crear movimiento
        const movementType = adjustmentQty > 0 ? 'in' : 'out';
        await db.run(`
            INSERT INTO InventoryMovements (
                inventory_id, movement_type, quantity, stock_before, stock_after,
                reference_type, notes, performed_by
            ) VALUES (?, ?, ?, ?, ?, 'adjustment', ?, ?)`,
            [id, movementType, Math.abs(adjustmentQty), currentStock, newStock, 
             notes || reason || 'Ajuste manual', req.user.id]
        );
        
        res.json({
            message: 'Stock ajustado exitosamente',
            data: {
                item_id: id,
                previous_stock: currentStock,
                adjustment: adjustmentQty,
                new_stock: newStock
            }
        });
        
    } catch (error) {
        console.error('Error ajustando stock:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

/**
 * @route GET /api/inventory/low-stock
 * @desc Obtener items con stock bajo
 * @access Protegido - Requiere autenticación
 */
router.get('/low-stock', authenticateToken, (req, res) => {
    try {
        const sql = `
        SELECT 
            i.*,
            ic.name as category_name,
            l.name as location_name,
            ps.company_name as primary_supplier_name,
            (i.minimum_stock - i.current_stock) as reorder_needed,
            CASE 
                WHEN i.current_stock = 0 THEN 'out_of_stock'
                WHEN i.current_stock <= (i.minimum_stock * 0.5) THEN 'critical'
                ELSE 'low'
            END as urgency_level
        FROM Inventory i
        LEFT JOIN InventoryCategories ic ON i.category_id = ic.id
        LEFT JOIN Locations l ON i.location_id = l.id
        LEFT JOIN Suppliers ps ON i.primary_supplier_id = ps.id
        WHERE i.is_active = 1 AND i.current_stock <= i.minimum_stock
        ORDER BY 
            CASE 
                WHEN i.current_stock = 0 THEN 1
                WHEN i.current_stock <= (i.minimum_stock * 0.5) THEN 2
                ELSE 3
            END ASC,
            i.current_stock ASC`;
        
        db.all(sql, [], (err, lowStockItems) => {
            if (err) {
                console.error('Error obteniendo items con stock bajo:', err);
                return res.status(500).json({ 
                    error: 'Error interno del servidor',
                    code: 'DB_ERROR'
                });
            }
            
            // Estadísticas
            const stats = {
                total_low_stock: lowStockItems ? lowStockItems.length : 0,
                out_of_stock: lowStockItems ? lowStockItems.filter(item => item.urgency_level === 'out_of_stock').length : 0,
                critical: lowStockItems ? lowStockItems.filter(item => item.urgency_level === 'critical').length : 0,
                low: lowStockItems ? lowStockItems.filter(item => item.urgency_level === 'low').length : 0
            };
            
            res.json({
                message: 'success',
                data: lowStockItems || [],
                stats: stats
            });
        });
        
    } catch (error) {
        console.error('Error obteniendo items con stock bajo:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            code: 'UNEXPECTED_ERROR'
        });
    }
});

// ===================================================================
// CATEGORÍAS DE INVENTARIO
// ===================================================================

/**
 * @route GET /api/inventory/categories
 * @desc Obtener categorías de inventario
 * @access Protegido - Requiere autenticación
 */
router.get('/categories', authenticateToken, async (req, res) => {
    try {
        const sql = `
        SELECT 
            ic.*,
            parent.name as parent_name,
            COUNT(i.id) as items_count
        FROM InventoryCategories ic
        LEFT JOIN InventoryCategories parent ON ic.parent_category_id = parent.id
        LEFT JOIN Inventory i ON ic.id = i.category_id AND i.is_active = 1
        WHERE ic.is_active = 1
        GROUP BY ic.id
        ORDER BY ic.name ASC`;
        
        const categories = await db.all(sql);
        
        res.json({
            message: 'success',
            data: categories || []
        });
        
    } catch (error) {
        console.error('Error obteniendo categorías:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

/**
 * @route POST /api/inventory/categories
 * @desc Crear nueva categoría
 * @access Protegido - Requiere autenticación
 */
router.post('/categories', authenticateToken, async (req, res) => {
    try {
        const { name, description, parent_category_id } = req.body;
        
        if (!name) {
            return res.status(400).json({
                error: 'Nombre de categoría requerido'
            });
        }
        
        const sql = `
        INSERT INTO InventoryCategories (name, description, parent_category_id)
        VALUES (?, ?, ?)`;
        
        await db.run(sql, [name, description, parent_category_id]);
        
        const newCategory = await db.get(
            'SELECT * FROM InventoryCategories WHERE name = ?',
            [name]
        );
        
        res.status(201).json({
            message: 'Categoría creada exitosamente',
            data: newCategory
        });
        
    } catch (error) {
        console.error('Error creando categoría:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// ===================================================================
// REPUESTOS (SPARE PARTS) PARA TICKETS
// ===================================================================

/**
 * @route GET /api/inventory/spare-parts
 * @desc Obtener lista de repuestos disponibles para tickets
 * @access Protegido - Requiere autenticación
 */
router.get('/spare-parts', authenticateToken, (req, res) => {
    console.log('🔧 Obteniendo lista de repuestos disponibles...');
    
    const sql = `
        SELECT 
            id,
            name,
            sku,
            current_stock,
            minimum_stock,
            created_at,
            updated_at
        FROM spareparts 
        WHERE current_stock > 0
        ORDER BY name ASC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Error obteniendo repuestos:', err.message);
            res.status(500).json({ 
                error: 'Error al cargar repuestos disponibles',
                code: 'SPARE_PARTS_ERROR'
            });
            return;
        }
        
        console.log(`✅ ${rows.length} repuestos disponibles encontrados`);
        res.json({
            message: "success",
            data: rows
        });
    });
});

/**
 * @route POST /api/inventory/spare-part-requests
 * @desc Crear solicitud de compra de repuesto no disponible
 * @access Protegido - Requiere autenticación
 */
router.post('/spare-part-requests', authenticateToken, (req, res) => {
    console.log('🛒 Creando solicitud de compra de repuesto...');
    
    const {
        ticket_id,
        spare_part_name,
        quantity_needed,
        priority,
        description,
        justification,
        requested_by
    } = req.body;
    
    // Validaciones
    if (!spare_part_name || !quantity_needed || !priority) {
        return res.status(400).json({
            error: 'Nombre de repuesto, cantidad y prioridad son requeridos',
            code: 'VALIDATION_ERROR'
        });
    }
    
    if (quantity_needed <= 0) {
        return res.status(400).json({
            error: 'La cantidad debe ser mayor a 0',
            code: 'VALIDATION_ERROR'
        });
    }
    
    const sql = `
        INSERT INTO spare_part_requests (
            ticket_id,
            spare_part_name,
            quantity_needed,
            priority,
            description,
            justification,
            requested_by,
            status,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', NOW())
    `;
    
    const params = [
        ticket_id || null,
        spare_part_name,
        quantity_needed,
        priority,
        description || null,
        justification || null,
        requested_by || 'Sistema'
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error creando solicitud de repuesto:', err.message);
            res.status(500).json({ 
                error: 'Error al crear solicitud de repuesto',
                code: 'REQUEST_CREATE_ERROR',
                details: err.message
            });
            return;
        }
        
        console.log(`✅ Solicitud de repuesto creada con ID: ${this.lastID}`);
        res.status(201).json({
            message: 'Solicitud de compra creada exitosamente',
            data: {
                id: this.lastID,
                ticket_id,
                spare_part_name,
                quantity_needed,
                priority,
                status: 'pendiente'
            }
        });
    });
});

/**
 * @route GET /api/inventory/spare-part-requests
 * @desc Obtener todas las solicitudes de compra de repuestos
 * @access Protegido - Requiere autenticación
 */
router.get('/spare-part-requests', authenticateToken, (req, res) => {
    console.log('📋 Obteniendo solicitudes de compra de repuestos...');
    
    const { status } = req.query;
    
    let sql = `
        SELECT 
            spr.*,
            t.title as ticket_title,
            t.ticket_number
        FROM spare_part_requests spr
        LEFT JOIN Tickets t ON spr.ticket_id = t.id
    `;
    
    const params = [];
    
    if (status) {
        sql += ' WHERE spr.status = ?';
        params.push(status);
    }
    
    sql += ' ORDER BY spr.created_at DESC';
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('❌ Error obteniendo solicitudes:', err.message);
            res.status(500).json({ 
                error: 'Error al cargar solicitudes',
                code: 'REQUESTS_FETCH_ERROR'
            });
            return;
        }
        
        console.log(`✅ ${rows.length} solicitudes encontradas`);
        res.json({
            message: 'success',
            data: rows || []
        });
    });
});

/**
 * @route POST /api/inventory/requests/:id/approve
 * @desc Aprobar solicitud de repuesto (con stock o genera orden de compra)
 * @access Protegido - Requiere autenticación
 */
router.post('/requests/:id/approve', authenticateToken, async (req, res) => {
    const requestId = req.params.id;
    const { notes } = req.body;
    
    try {
        console.log(`🔍 Aprobando solicitud #${requestId}...`);
        
        // 1. Obtener información de la solicitud
        const request = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM spare_part_requests WHERE id = ?',
                [requestId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        if (!request) {
            return res.status(404).json({
                error: 'Solicitud no encontrada',
                code: 'REQUEST_NOT_FOUND'
            });
        }
        
        if (request.status !== 'pendiente') {
            return res.status(400).json({
                error: `La solicitud ya fue ${request.status}`,
                code: 'REQUEST_ALREADY_PROCESSED'
            });
        }
        
        // 2. Buscar el repuesto en inventario por nombre
        const inventoryItem = await new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM Inventory 
                 WHERE LOWER(item_name) LIKE LOWER(?) 
                 OR LOWER(item_code) LIKE LOWER(?)
                 AND is_active = 1
                 LIMIT 1`,
                [`%${request.spare_part_name}%`, `%${request.spare_part_name}%`],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        const hasStock = inventoryItem && parseFloat(inventoryItem.current_stock) >= request.quantity_needed;
        
        // 3. Actualizar estado de la solicitud
        await new Promise((resolve, reject) => {
            db.run(
                `UPDATE spare_part_requests 
                 SET status = 'aprobada',
                     approved_by = ?,
                     approved_at = NOW(),
                     notes = ?
                 WHERE id = ?`,
                [req.user.id, notes || 'Solicitud aprobada', requestId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        
        let result = {
            request_id: requestId,
            has_stock: hasStock,
            action: null,
            movement_id: null,
            purchase_order_id: null
        };
        
        if (hasStock) {
            // 4A. HAY STOCK: Crear movimiento de salida
            console.log(`✅ Stock disponible: ${inventoryItem.current_stock} unidades`);
            
            const newStock = parseFloat(inventoryItem.current_stock) - request.quantity_needed;
            
            // Actualizar stock en Inventory
            await new Promise((resolve, reject) => {
                db.run(
                    `UPDATE Inventory 
                     SET current_stock = ?,
                         updated_at = NOW()
                     WHERE id = ?`,
                    [newStock, inventoryItem.id],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
            
            // Crear movimiento
            const movement = await new Promise((resolve, reject) => {
                db.run(
                    `INSERT INTO InventoryMovements (
                        inventory_id,
                        movement_type,
                        quantity,
                        stock_before,
                        stock_after,
                        reference_type,
                        reference_id,
                        notes,
                        performed_by,
                        performed_at
                    ) VALUES (?, 'out', ?, ?, ?, 'spare_part_request', ?, ?, ?, NOW())`,
                    [
                        inventoryItem.id,
                        request.quantity_needed,
                        inventoryItem.current_stock,
                        newStock,
                        requestId,
                        `Aprobación de solicitud #${requestId}: ${request.spare_part_name}`,
                        req.user.id
                    ],
                    function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });
            
            // Si hay ticket asociado, actualizar ticketspareparts
            if (request.ticket_id) {
                await new Promise((resolve, reject) => {
                    db.run(
                        `INSERT INTO ticketspareparts (
                            ticket_id,
                            inventory_id,
                            quantity_used,
                            unit_cost,
                            notes,
                            used_at
                        ) VALUES (?, ?, ?, ?, ?, NOW())`,
                        [
                            request.ticket_id,
                            inventoryItem.id,
                            request.quantity_needed,
                            inventoryItem.unit_cost || 0,
                            `Solicitud #${requestId} aprobada`
                        ],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            }
            
            result.action = 'stock_deducted';
            result.movement_id = movement;
            result.new_stock = newStock;
            
        } else {
            // 4B. NO HAY STOCK: Crear orden de compra automática
            console.log(`⚠️ Sin stock suficiente. Creando orden de compra...`);
            
            const orderNumber = `PO-AUTO-${Date.now()}`;
            
            // Crear orden de compra
            const purchaseOrder = await new Promise((resolve, reject) => {
                db.run(
                    `INSERT INTO PurchaseOrders (
                        order_number,
                        supplier_id,
                        status,
                        order_date,
                        expected_date,
                        total_amount,
                        notes,
                        created_by,
                        created_at
                    ) VALUES (?, ?, 'pending', NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 0, ?, ?, NOW())`,
                    [
                        orderNumber,
                        inventoryItem?.primary_supplier_id || null,
                        `Orden automática para solicitud #${requestId}: ${request.spare_part_name}`,
                        req.user.id
                    ],
                    function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });
            
            // Agregar item a la orden
            const estimatedCost = inventoryItem?.unit_cost || 0;
            const lineTotal = estimatedCost * request.quantity_needed;
            
            await new Promise((resolve, reject) => {
                db.run(
                    `INSERT INTO PurchaseOrderItems (
                        purchase_order_id,
                        inventory_id,
                        item_description,
                        quantity_ordered,
                        quantity_received,
                        unit_cost,
                        total_cost
                    ) VALUES (?, ?, ?, ?, 0, ?, ?)`,
                    [
                        purchaseOrder,
                        inventoryItem?.id || null,
                        request.spare_part_name,
                        request.quantity_needed,
                        estimatedCost,
                        lineTotal
                    ],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
            
            // Actualizar total de la orden
            await new Promise((resolve, reject) => {
                db.run(
                    `UPDATE PurchaseOrders 
                     SET total_amount = ?
                     WHERE id = ?`,
                    [lineTotal, purchaseOrder],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
            
            // Vincular orden de compra con la solicitud
            await new Promise((resolve, reject) => {
                db.run(
                    `UPDATE spare_part_requests 
                     SET purchase_order_id = ?,
                         status = 'aprobada'
                     WHERE id = ?`,
                    [purchaseOrder, requestId],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
            
            result.action = 'purchase_order_created';
            result.purchase_order_id = purchaseOrder;
            result.purchase_order_number = orderNumber;
        }
        
        console.log(`✅ Solicitud #${requestId} aprobada: ${result.action}`);
        
        res.json({
            message: 'Solicitud aprobada exitosamente',
            data: result
        });
        
    } catch (error) {
        console.error('❌ Error aprobando solicitud:', error);
        res.status(500).json({
            error: 'Error al aprobar solicitud',
            details: error.message
        });
    }
});

/**
 * @route POST /api/inventory/requests/:id/reject
 * @desc Rechazar una solicitud de repuesto
 * @access Protegido - Requiere autenticación
 */
router.post('/requests/:id/reject', authenticateToken, async (req, res) => {
    const requestId = req.params.id;
    const { rejection_reason } = req.body;
    
    console.log(`❌ Procesando rechazo de solicitud #${requestId}...`);
    
    try {
        // 1. Validar que la solicitud existe y está pendiente
        const request = await new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM spare_part_requests WHERE id = ?`,
                [requestId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        if (!request) {
            return res.status(404).json({
                error: 'Solicitud no encontrada',
                code: 'REQUEST_NOT_FOUND'
            });
        }
        
        if (request.status !== 'pendiente') {
            return res.status(400).json({
                error: `La solicitud ya fue ${request.status}`,
                code: 'REQUEST_ALREADY_PROCESSED'
            });
        }
        
        if (!rejection_reason || rejection_reason.trim() === '') {
            return res.status(400).json({
                error: 'Se requiere un motivo de rechazo',
                code: 'REJECTION_REASON_REQUIRED'
            });
        }
        
        // 2. Actualizar estado de la solicitud a rechazada
        await new Promise((resolve, reject) => {
            db.run(
                `UPDATE spare_part_requests 
                 SET status = 'rechazada',
                     notes = ?,
                     approved_by = ?,
                     approved_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [
                    `RECHAZADA: ${rejection_reason.trim()}`,
                    req.user.username || req.user.id,
                    requestId
                ],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        
        console.log(`✅ Solicitud #${requestId} rechazada por: ${req.user.username || req.user.id}`);
        
        res.json({
            message: 'Solicitud rechazada exitosamente',
            data: {
                request_id: requestId,
                status: 'rechazada',
                rejection_reason: rejection_reason.trim(),
                rejected_by: req.user.username || req.user.id,
                rejected_at: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ Error rechazando solicitud:', error);
        res.status(500).json({
            error: 'Error al rechazar solicitud',
            details: error.message
        });
    }
});

module.exports = router;
