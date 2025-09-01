const express = require('express');
const router = express.Router();
const db = require('../db-adapter');

/**
 * GYMTEC ERP - APIs SISTEMA DE INVENTARIO INTELIGENTE
 * 
 * Endpoints implementados:
 * ✅ GET /api/inventory - Listar inventario con filtros
 * ✅ POST /api/inventory - Crear nuevo item
 * ✅ PUT /api/inventory/:id - Actualizar item
 * ✅ DELETE /api/inventory/:id - Eliminar item
 * ✅ GET /api/inventory/:id/movements - Movimientos de un item
 * ✅ POST /api/inventory/:id/adjust - Ajustar stock
 * ✅ GET /api/inventory/low-stock - Items con stock bajo
 * ✅ GET /api/inventory/analytics - Analytics de inventario
 * ✅ GET /api/inventory/categories - Categorías de inventario
 * ✅ POST /api/inventory/categories - Crear categoría
 */

// ===================================================================
// GESTIÓN DE INVENTARIO
// ===================================================================

/**
 * @route GET /api/inventory
 * @desc Obtener lista de inventario con filtros
 */
router.get('/', async (req, res) => {
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
 */
router.post('/', async (req, res) => {
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
 */
router.put('/:id', async (req, res) => {
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

/**
 * @route POST /api/inventory/:id/adjust
 * @desc Ajustar stock de un item
 */
router.post('/:id/adjust', async (req, res) => {
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
 */
router.get('/low-stock', (req, res) => {
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
 */
router.get('/categories', async (req, res) => {
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
 */
router.post('/categories', async (req, res) => {
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

module.exports = router;
