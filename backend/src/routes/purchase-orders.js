const express = require('express');
const router = express.Router();
const db = require('../db-adapter');
const jwt = require('jsonwebtoken');

/**
 * GYMTEC ERP - API DE ÓRDENES DE COMPRA
 *
 * Endpoints implementados:
 * ✅ GET /api/purchase-orders - Listar órdenes de compra
 * ✅ GET /api/purchase-orders/:id - Obtener orden de compra por ID
 * ✅ POST /api/purchase-orders - Crear nueva orden de compra
 * ✅ PUT /api/purchase-orders/:id - Actualizar orden de compra
 * ✅ DELETE /api/purchase-orders/:id - Eliminar orden de compra
 * ✅ GET /api/purchase-orders/:id/items - Obtener items de una orden
 * ✅ POST /api/purchase-orders/:id/items - Agregar item a orden
 * ✅ PUT /api/purchase-orders/:id/status - Cambiar estado de orden
 */

// ===================================================================
// MIDDLEWARE DE AUTENTICACIÓN
// ===================================================================

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

const requireRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
};

// ===================================================================
// GESTIÓN DE ÓRDENES DE COMPRA
// ===================================================================

/**
 * @route GET /api/purchase-orders
 * @desc Obtener lista de órdenes de compra con filtros
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const {
            status,
            supplier_id,
            created_by,
            search,
            page = 1,
            limit = 50
        } = req.query;

        let sql = `
            SELECT
                po.*,
                s.company_name as supplier_name,
                u.username as created_by_name,
                u_approved.username as approved_by_name,
                (SELECT SUM(quantity * unit_price) FROM PurchaseOrderItems WHERE purchase_order_id = po.id) as total_amount,
                (SELECT COUNT(*) FROM PurchaseOrderItems WHERE purchase_order_id = po.id) as items_count
            FROM PurchaseOrders po
            LEFT JOIN Suppliers s ON po.supplier_id = s.id
            LEFT JOIN Users u ON po.created_by = u.id
            LEFT JOIN Users u_approved ON po.approved_by = u_approved.id
            WHERE 1=1
        `;

        const params = [];

        if (status) {
            sql += ' AND po.status = ?';
            params.push(status);
        }

        if (supplier_id) {
            sql += ' AND po.supplier_id = ?';
            params.push(supplier_id);
        }

        if (created_by) {
            sql += ' AND po.created_by = ?';
            params.push(created_by);
        }

        if (search) {
            sql += ' AND (po.order_number LIKE ? OR s.company_name LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        sql += ' ORDER BY po.created_at DESC';

        // Paginación
        const offset = (parseInt(page) - 1) * parseInt(limit);
        sql += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const orders = await db.all(sql, params);

        // Contar total para paginación
        let countSql = 'SELECT COUNT(*) as total FROM PurchaseOrders po WHERE 1=1';
        const countParams = [];

        if (status) {
            countSql += ' AND po.status = ?';
            countParams.push(status);
        }

        if (supplier_id) {
            countSql += ' AND po.supplier_id = ?';
            countParams.push(supplier_id);
        }

        if (created_by) {
            countSql += ' AND po.created_by = ?';
            countParams.push(created_by);
        }

        if (search) {
            countSql += ' AND (po.order_number LIKE ? OR s.company_name LIKE ?)';
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm);
        }

        const countResult = await db.get(countSql, countParams);
        const total = countResult ? countResult.total : 0;

        res.json({
            message: 'success',
            data: orders || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error obteniendo órdenes de compra:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * @route GET /api/purchase-orders/:id
 * @desc Obtener orden de compra por ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const sql = `
            SELECT
                po.*,
                s.company_name as supplier_name,
                s.contact_person,
                s.email as supplier_email,
                s.phone as supplier_phone,
                u.username as created_by_name,
                u_approved.username as approved_by_name
            FROM PurchaseOrders po
            LEFT JOIN Suppliers s ON po.supplier_id = s.id
            LEFT JOIN Users u ON po.created_by = u.id
            LEFT JOIN Users u_approved ON po.approved_by = u_approved.id
            WHERE po.id = ?
        `;

        const order = await db.get(sql, [id]);

        if (!order) {
            return res.status(404).json({ error: 'Orden de compra no encontrada' });
        }

        // Obtener items de la orden
        const itemsSql = `
            SELECT
                poi.*,
                i.item_name,
                i.item_code,
                i.unit_of_measure
            FROM PurchaseOrderItems poi
            LEFT JOIN Inventory i ON poi.inventory_item_id = i.id
            WHERE poi.purchase_order_id = ?
            ORDER BY poi.created_at ASC
        `;

        const items = await db.all(itemsSql, [id]);

        res.json({
            message: 'success',
            data: {
                ...order,
                items: items || []
            }
        });

    } catch (error) {
        console.error('Error obteniendo orden de compra:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * @route POST /api/purchase-orders
 * @desc Crear nueva orden de compra
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            supplier_id,
            order_number,
            notes,
            expected_delivery_date,
            items = []
        } = req.body;

        // Validaciones
        if (!supplier_id) {
            return res.status(400).json({
                error: 'Campos requeridos faltantes',
                details: 'supplier_id es obligatorio'
            });
        }

        // Generar número de orden si no se proporciona
        const finalOrderNumber = order_number || `PO-${Date.now()}`;

        const sql = `
            INSERT INTO PurchaseOrders
            (order_number, supplier_id, status, created_by, notes, expected_delivery_date, created_at, updated_at)
            VALUES (?, ?, 'draft', ?, ?, ?, NOW(), NOW())
        `;

        const result = await db.run(sql, [finalOrderNumber, supplier_id, req.user.id, notes, expected_delivery_date]);

        const orderId = result.lastID;

        // Agregar items si se proporcionaron
        if (items && items.length > 0) {
            for (const item of items) {
                const itemSql = `
                    INSERT INTO PurchaseOrderItems
                    (purchase_order_id, inventory_item_id, quantity, unit_price, notes)
                    VALUES (?, ?, ?, ?, ?)
                `;
                await db.run(itemSql, [orderId, item.inventory_item_id, item.quantity, item.unit_price, item.notes]);
            }
        }

        res.status(201).json({
            message: 'Orden de compra creada exitosamente',
            data: {
                id: orderId,
                order_number: finalOrderNumber,
                supplier_id,
                status: 'draft'
            }
        });

    } catch (error) {
        console.error('Error creando orden de compra:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * @route PUT /api/purchase-orders/:id
 * @desc Actualizar orden de compra
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            supplier_id,
            order_number,
            status,
            notes,
            expected_delivery_date,
            approved_by
        } = req.body;

        const sql = `
            UPDATE PurchaseOrders
            SET supplier_id = ?, order_number = ?, status = ?, notes = ?, expected_delivery_date = ?,
                approved_by = ?, updated_at = NOW()
            WHERE id = ?
        `;

        const params = [supplier_id, order_number, status, notes, expected_delivery_date, approved_by, id];
        await db.run(sql, params);

        res.json({
            message: 'Orden de compra actualizada exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando orden de compra:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * @route PUT /api/purchase-orders/:id/status
 * @desc Cambiar estado de orden de compra
 */
router.put('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, approved_by } = req.body;

        const sql = `
            UPDATE PurchaseOrders
            SET status = ?, approved_by = ?, updated_at = NOW()
            WHERE id = ?
        `;

        await db.run(sql, [status, approved_by || req.user.id, id]);

        res.json({
            message: 'Estado de orden de compra actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando estado de orden:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * @route DELETE /api/purchase-orders/:id
 * @desc Eliminar orden de compra
 */
router.delete('/:id', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
    try {
        const { id } = req.params;

        // Primero eliminar los items de la orden
        await db.run('DELETE FROM PurchaseOrderItems WHERE purchase_order_id = ?', [id]);

        // Luego eliminar la orden
        await db.run('DELETE FROM PurchaseOrders WHERE id = ?', [id]);

        res.json({
            message: 'Orden de compra eliminada exitosamente'
        });

    } catch (error) {
        console.error('Error eliminando orden de compra:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * @route GET /api/purchase-orders/:id/items
 * @desc Obtener items de una orden de compra
 */
router.get('/:id/items', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const sql = `
            SELECT
                poi.*,
                i.item_name,
                i.item_code,
                i.unit_of_measure,
                (poi.quantity * poi.unit_price) as line_total
            FROM PurchaseOrderItems poi
            LEFT JOIN Inventory i ON poi.inventory_item_id = i.id
            WHERE poi.purchase_order_id = ?
            ORDER BY poi.created_at ASC
        `;

        const items = await db.all(sql, [id]);

        res.json({
            message: 'success',
            data: items || []
        });

    } catch (error) {
        console.error('Error obteniendo items de orden:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * @route POST /api/purchase-orders/:id/items
 * @desc Agregar item a orden de compra
 */
router.post('/:id/items', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            inventory_item_id,
            quantity,
            unit_price,
            notes
        } = req.body;

        // Validaciones
        if (!inventory_item_id || !quantity || !unit_price) {
            return res.status(400).json({
                error: 'Campos requeridos faltantes',
                details: 'inventory_item_id, quantity y unit_price son obligatorios'
            });
        }

        const sql = `
            INSERT INTO PurchaseOrderItems
            (purchase_order_id, inventory_item_id, quantity, unit_price, notes)
            VALUES (?, ?, ?, ?, ?)
        `;

        const result = await db.run(sql, [id, inventory_item_id, quantity, unit_price, notes]);

        res.status(201).json({
            message: 'Item agregado a la orden exitosamente',
            data: {
                id: result.lastID,
                purchase_order_id: id,
                inventory_item_id,
                quantity,
                unit_price
            }
        });

    } catch (error) {
        console.error('Error agregando item a orden:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

module.exports = router;
