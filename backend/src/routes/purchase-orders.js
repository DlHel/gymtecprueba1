const express = require('express');
const router = express.Router();
const db = require('../db-adapter');

/**
 * GYMTEC ERP - APIs ÓRDENES DE COMPRA
 * 
 * 🔐 NOTA: Todos los endpoints requieren autenticación JWT
 */

// Middleware de autenticación
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
    const JWT_SECRET = process.env.JWT_SECRET || 'gymtec_secret_key_2024_production_change_this';

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

/**
 * @route GET /api/purchase-orders
 * @desc Obtener lista de órdenes de compra
 * @access Protegido - Requiere autenticación
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { status, supplier_id, start_date, end_date, limit = 50 } = req.query;
        
        let sql = `
        SELECT 
            po.id,
            po.supplier,
            po.order_date,
            po.expected_delivery,
            po.status,
            po.total_amount,
            po.notes,
            po.created_by,
            po.created_at,
            po.updated_at,
            creator.username as created_by_name,
            COUNT(DISTINCT poi.id) as item_count,
            COALESCE(SUM(poi.quantity_ordered), 0) as total_items_ordered,
            COALESCE(SUM(poi.quantity_received), 0) as total_items_received,
            GROUP_CONCAT(DISTINCT CONCAT(spr.spare_part_name, ' (', spr.quantity_needed, ' unidades)') SEPARATOR ', ') as spare_parts_list,
            GROUP_CONCAT(DISTINCT spr.ticket_id SEPARATOR ', ') as ticket_ids
        FROM PurchaseOrders po
        LEFT JOIN Users creator ON po.created_by = creator.id
        LEFT JOIN PurchaseOrderItems poi ON po.id = poi.purchase_order_id
        LEFT JOIN spare_part_requests spr ON po.id = spr.purchase_order_id
        WHERE 1=1`;
        
        const params = [];
        
        if (status) {
            sql += ' AND po.status = ?';
            params.push(status);
        }
        
        if (supplier_id) {
            sql += ' AND po.supplier = ?';
            params.push(supplier_id);
        }
        
        if (start_date) {
            sql += ' AND po.order_date >= ?';
            params.push(start_date);
        }
        
        if (end_date) {
            sql += ' AND po.order_date <= ?';
            params.push(end_date);
        }
        
        sql += ' GROUP BY po.id ORDER BY po.order_date DESC LIMIT ?';
        params.push(parseInt(limit, 10));
        
        const orders = await db.all(sql, params);
        
        // Obtener estadísticas
        const statsSQL = `
        SELECT 
            COUNT(*) as total_orders,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) as received,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
            SUM(total_amount) as total_value
        FROM PurchaseOrders
        WHERE 1=1
        ${status ? 'AND status = ?' : ''}
        ${start_date ? 'AND order_date >= ?' : ''}
        ${end_date ? 'AND order_date <= ?' : ''}`;
        
        const statsParams = [];
        if (status) statsParams.push(status);
        if (start_date) statsParams.push(start_date);
        if (end_date) statsParams.push(end_date);
        
        const stats = await db.get(statsSQL, statsParams);
        
        res.json({
            message: 'success',
            data: orders || [],
            stats: stats || {
                total_orders: 0,
                pending: 0,
                approved: 0,
                received: 0,
                cancelled: 0,
                total_value: 0
            }
        });
        
    } catch (error) {
        console.error('Error al obtener órdenes de compra:', error);
        res.status(500).json({
            error: 'Error al obtener órdenes de compra',
            details: error.message
        });
    }
});

/**
 * @route GET /api/purchase-orders/:id
 * @desc Obtener una orden de compra específica con sus items
 * @access Protegido - Requiere autenticación
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Obtener orden
        const orderSQL = `
        SELECT 
            po.id,
            po.supplier,
            po.order_date,
            po.expected_delivery,
            po.status,
            po.total_amount,
            po.notes,
            po.created_by,
            po.created_at,
            po.updated_at,
            creator.username as created_by_name
        FROM PurchaseOrders po
        LEFT JOIN Users creator ON po.created_by = creator.id
        WHERE po.id = ?`;
        
        const order = await db.get(orderSQL, [id]);
        
        if (!order) {
            return res.status(404).json({
                error: 'Orden de compra no encontrada',
                code: 'NOT_FOUND'
            });
        }
        
        // Obtener items de la orden
        const itemsSQL = `
        SELECT 
            poi.*,
            i.item_code,
            i.item_name,
            i.description,
            ic.name as category_name
        FROM PurchaseOrderItems poi
        LEFT JOIN Inventory i ON poi.spare_part_id = i.id
        LEFT JOIN InventoryCategories ic ON i.category_id = ic.id
        WHERE poi.purchase_order_id = ?`;
        
        const items = await db.all(itemsSQL, [id]);
        
        res.json({
            message: 'success',
            data: {
                ...order,
                items: items || []
            }
        });
        
    } catch (error) {
        console.error('Error al obtener orden de compra:', error);
        res.status(500).json({
            error: 'Error al obtener orden de compra',
            details: error.message
        });
    }
});

/**
 * @route POST /api/purchase-orders
 * @desc Crear nueva orden de compra
 * @access Protegido - Requiere autenticación
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { 
            supplier_id, 
            order_date, 
            expected_delivery, 
            notes, 
            items 
        } = req.body;
        
        // Validación
        if (!supplier_id || !items || items.length === 0) {
            return res.status(400).json({
                error: 'Proveedor e items son requeridos',
                code: 'VALIDATION_ERROR'
            });
        }
        
        // Generar número de orden
        const lastOrderSQL = 'SELECT order_number FROM PurchaseOrders ORDER BY id DESC LIMIT 1';
        const lastOrder = await db.get(lastOrderSQL);
        let orderNumber = 'PO-001';
        
        if (lastOrder && lastOrder.order_number) {
            const lastNum = parseInt(lastOrder.order_number.split('-', 10)[1]);
            orderNumber = `PO-${String(lastNum + 1).padStart(3, '0')}`;
        }
        
        // Calcular total
        const total_amount = items.reduce((sum, item) => 
            sum + (parseFloat(item.unit_cost) * parseInt(item.quantity, 10)), 0
        );
        
        // Insertar orden
        const insertOrderSQL = `
        INSERT INTO PurchaseOrders (
            order_number, supplier, status, order_date, 
            expected_delivery, total_amount, notes, created_by
        ) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?)`;
        
        const orderResult = await db.run(insertOrderSQL, [
            orderNumber,
            supplier_id,
            order_date || new Date().toISOString().split('T')[0],
            expected_delivery,
            total_amount,
            notes,
            req.user.id
        ]);
        
        const orderId = orderResult.lastID;
        
        // Insertar items
        for (const item of items) {
            const itemSQL = `
            INSERT INTO PurchaseOrderItems (
                purchase_order_id, spare_part_id, quantity_ordered, 
                quantity_received, unit_cost, total_cost
            ) VALUES (?, ?, ?, 0, ?, ?)`;
            
            const itemTotal = parseFloat(item.unit_cost) * parseInt(item.quantity, 10);
            
            await db.run(itemSQL, [
                orderId,
                item.spare_part_id,
                item.quantity,
                item.unit_cost,
                itemTotal
            ]);
        }
        
        res.status(201).json({
            message: 'Orden de compra creada exitosamente',
            data: {
                id: orderId,
                order_number: orderNumber,
                total_amount,
                items_count: items.length
            }
        });
        
    } catch (error) {
        console.error('Error al crear orden de compra:', error);
        res.status(500).json({
            error: 'Error al crear orden de compra',
            details: error.message
        });
    }
});

/**
 * @route PUT /api/purchase-orders/:id
 * @desc Actualizar orden de compra completa
 * @access Protegido - Requiere autenticación
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            supplier, 
            expected_delivery, 
            notes, 
            total_amount,
            items 
        } = req.body;
        
        console.log(`📝 Actualizando orden de compra #${id}...`);
        
        // Verificar que la orden existe
        const checkSQL = 'SELECT id FROM PurchaseOrders WHERE id = ?';
        const existingOrder = await db.get(checkSQL, [id]);
        
        if (!existingOrder) {
            return res.status(404).json({
                error: 'Orden de compra no encontrada',
                code: 'NOT_FOUND'
            });
        }
        
        // Actualizar orden
        const updateOrderSQL = `
        UPDATE PurchaseOrders 
        SET supplier = ?,
            expected_delivery = ?,
            notes = ?,
            total_amount = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`;
        
        await db.runAsync(updateOrderSQL, [
            supplier,
            expected_delivery,
            notes,
            total_amount || 0,
            id
        ]);
        
        // Si se enviaron items, actualizar
        if (items && items.length > 0) {
            // Eliminar items existentes
            const deleteItemsSQL = 'DELETE FROM PurchaseOrderItems WHERE purchase_order_id = ?';
            await db.runAsync(deleteItemsSQL, [id]);
            
            // Insertar nuevos items
            for (const item of items) {
                const itemSQL = `
                INSERT INTO PurchaseOrderItems (
                    purchase_order_id, spare_part_id, quantity_ordered, 
                    quantity_received, unit_cost, total_cost
                ) VALUES (?, ?, ?, 0, ?, ?)`;
                
                const itemTotal = parseFloat(item.unit_price || 0) * parseInt(item.quantity || 0, 10);
                
                await db.runAsync(itemSQL, [
                    id,
                    item.spare_part_id,
                    item.quantity,
                    item.unit_price || 0,
                    itemTotal
                ]);
            }
        }
        
        console.log(`✅ Orden de compra #${id} actualizada correctamente`);
        
        res.json({
            message: 'Orden de compra actualizada exitosamente',
            data: {
                id: parseInt(id, 10),
                supplier,
                items_count: items ? items.length : 0
            }
        });
        
    } catch (error) {
        console.error('Error al actualizar orden de compra:', error);
        res.status(500).json({
            error: 'Error al actualizar orden de compra',
            details: error.message
        });
    }
});

/**
 * @route PUT /api/purchase-orders/:id/status
 * @desc Actualizar estado de orden de compra
 * @access Protegido - Requiere autenticación
 */
router.put('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const validStatuses = ['pending', 'approved', 'ordered', 'received', 'cancelled'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: 'Estado inválido',
                code: 'INVALID_STATUS'
            });
        }
        
        const updateSQL = 'UPDATE PurchaseOrders SET status = ?, updated_at = NOW() WHERE id = ?';
        await db.run(updateSQL, [status, id]);
        
        // Si se recibe, actualizar fecha de recepción
        if (status === 'received') {
            const updateDateSQL = 'UPDATE PurchaseOrders SET received_date = NOW() WHERE id = ?';
            await db.run(updateDateSQL, [id]);
        }
        
        res.json({
            message: 'Estado actualizado exitosamente',
            data: { id, status }
        });
        
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        res.status(500).json({
            error: 'Error al actualizar estado',
            details: error.message
        });
    }
});

module.exports = router;
