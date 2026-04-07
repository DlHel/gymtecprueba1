const express = require('express');
const router = express.Router();
const db = require('../../db-adapter');
const {
    buildStatsCase,
    getNextPurchaseOrderNumber,
    getStatusVariants,
    normalizePurchaseOrderStatus
} = require('../../shared/purchase-orders');

// ✅ MIGRADO: Usar middleware centralizado del core
const { authenticateToken } = require('../../core/middleware/auth.middleware');

let purchaseOrderSparePartReferenceTable = null;

async function queryRows(executor, sql, params = []) {
    if (executor && typeof executor.query === 'function') {
        const [rows] = await executor.query(sql, params);
        return rows;
    }

    return db.all(sql, params);
}

async function queryRow(executor, sql, params = []) {
    const rows = await queryRows(executor, sql, params);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

async function runCommand(executor, sql, params = []) {
    if (executor && typeof executor.execute === 'function') {
        const [result] = await executor.execute(sql, params);
        return {
            lastID: result.insertId || null,
            changes: result.affectedRows || 0
        };
    }

    return db.run(sql, params);
}

async function resolvePurchaseOrderSparePartReferenceTable() {
    if (purchaseOrderSparePartReferenceTable) {
        return purchaseOrderSparePartReferenceTable;
    }

    const row = await db.get(`
        SELECT REFERENCED_TABLE_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'PurchaseOrderItems'
          AND COLUMN_NAME = 'spare_part_id'
        LIMIT 1
    `);

    purchaseOrderSparePartReferenceTable = row?.REFERENCED_TABLE_NAME || 'Inventory';
    return purchaseOrderSparePartReferenceTable;
}

async function ensureCompatibleSparePartReference(sparePartId, executor = null) {
    const referenceTable = await resolvePurchaseOrderSparePartReferenceTable();

    if (!referenceTable || referenceTable.toLowerCase() === 'inventory') {
        return;
    }

    const existing = await queryRow(
        executor,
        `SELECT id FROM \`${referenceTable}\` WHERE id = ? LIMIT 1`,
        [sparePartId]
    );

    if (existing) {
        return;
    }

    const inventoryItem = await queryRow(
        executor,
        `SELECT id, item_name, item_code, current_stock, minimum_stock
         FROM Inventory
         WHERE id = ?
         LIMIT 1`,
        [sparePartId]
    );

    if (!inventoryItem) {
        throw new Error(`Repuesto ${sparePartId} no encontrado en Inventory para sincronización de orden de compra`);
    }

    const compatibleTable = referenceTable.toLowerCase();
    if (compatibleTable === 'spareparts' || compatibleTable.startsWith('spareparts_')) {
        await runCommand(
            executor,
            `INSERT INTO \`${referenceTable}\` (id, name, sku, current_stock, minimum_stock)
             VALUES (?, ?, ?, ?, ?)`,
            [
                inventoryItem.id,
                inventoryItem.item_name,
                inventoryItem.item_code || null,
                parseInt(inventoryItem.current_stock, 10) || 0,
                parseInt(inventoryItem.minimum_stock, 10) || 0
            ]
        );
        return;
    }

    throw new Error(`Tabla referenciada no soportada para spare_part_id: ${referenceTable}`);
}

/**
 * GYMTEC ERP - APIs ÓRDENES DE COMPRA
 * 
 * 🔐 NOTA: Todos los endpoints requieren autenticación JWT
 */

/**
 * @route GET /api/purchase-orders
 * @desc Obtener lista de órdenes de compra
 * @access Protegido - Requiere autenticación
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { status, supplier_id, start_date, end_date, limit = 50 } = req.query;
        const normalizedStatus = status ? normalizePurchaseOrderStatus(status) : null;
        
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
            GROUP_CONCAT(DISTINCT CONCAT(i.item_name, ' (', poi.quantity_ordered, ' unidades)') SEPARATOR ', ') as spare_parts_list
        FROM PurchaseOrders po
        LEFT JOIN Users creator ON po.created_by = creator.id
        LEFT JOIN PurchaseOrderItems poi ON po.id = poi.purchase_order_id
        LEFT JOIN Inventory i ON poi.spare_part_id = i.id
        WHERE 1=1`;
        
        const params = [];
        
        if (normalizedStatus) {
            sql += ` AND po.status IN (${getStatusVariants(normalizedStatus).map(() => '?').join(', ')})`;
            params.push(...getStatusVariants(normalizedStatus));
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
            ${buildStatsCase('pending', getStatusVariants('Pendiente'))},
            ${buildStatsCase('approved', getStatusVariants('Aprobada'))},
            ${buildStatsCase('received', getStatusVariants('Recibida'))},
            ${buildStatsCase('cancelled', getStatusVariants('Cancelada'))},
            SUM(total_amount) as total_value
        FROM PurchaseOrders
        WHERE 1=1
        ${normalizedStatus ? `AND status IN (${getStatusVariants(normalizedStatus).map(() => '?').join(', ')})` : ''}
        ${start_date ? 'AND order_date >= ?' : ''}
        ${end_date ? 'AND order_date <= ?' : ''}`;
        
        const statsParams = [];
        if (normalizedStatus) statsParams.push(...getStatusVariants(normalizedStatus));
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
            COALESCE(i.description, '') as description,
            i.category_name
        FROM PurchaseOrderItems poi
        LEFT JOIN Inventory i ON poi.spare_part_id = i.id
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

        // Calcular total
        const total_amount = items.reduce((sum, item) => 
            sum + (parseFloat(item.unit_cost) * parseInt(item.quantity, 10)), 0
        );

        const pool = db.db?.pool;
        if (!pool || typeof pool.getConnection !== 'function') {
            throw new Error('Pool MySQL no disponible para crear órdenes de compra');
        }

        const connection = await pool.getConnection();
        let orderId = null;
        let orderNumber = null;

        try {
            await connection.beginTransaction();
            orderNumber = await getNextPurchaseOrderNumber(connection);

            const insertOrderSQL = `
            INSERT INTO PurchaseOrders (
                order_number, supplier, status, order_date,
                expected_delivery, total_amount, notes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

            const orderResult = await runCommand(connection, insertOrderSQL, [
                orderNumber,
                supplier_id,
                normalizePurchaseOrderStatus('pending'),
                order_date || new Date().toISOString().split('T')[0],
                expected_delivery,
                total_amount,
                notes,
                req.user.id
            ]);

            orderId = orderResult.lastID;

            for (const item of items) {
                await ensureCompatibleSparePartReference(item.spare_part_id, connection);

                const itemSQL = `
                INSERT INTO PurchaseOrderItems (
                    purchase_order_id, spare_part_id, quantity_ordered,
                    quantity_received, unit_cost, total_cost
                ) VALUES (?, ?, ?, 0, ?, ?)`;

                const itemTotal = parseFloat(item.unit_cost) * parseInt(item.quantity, 10);

                await runCommand(connection, itemSQL, [
                    orderId,
                    item.spare_part_id,
                    item.quantity,
                    item.unit_cost,
                    itemTotal
                ]);
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
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
                await ensureCompatibleSparePartReference(item.spare_part_id);

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
        
        const validStatuses = ['pending', 'approved', 'ordered', 'received', 'cancelled', 'pendiente', 'aprobada', 'enviada', 'recibida', 'cancelada'];
        const normalizedStatus = normalizePurchaseOrderStatus(status, null);
        
        if (!validStatuses.includes(String(status || '').toLowerCase()) || !normalizedStatus) {
            return res.status(400).json({
                error: 'Estado inválido',
                code: 'INVALID_STATUS'
            });
        }
        
        const updateSQL = 'UPDATE PurchaseOrders SET status = ?, updated_at = NOW() WHERE id = ?';
        await db.run(updateSQL, [normalizedStatus, id]);
        
        // Si se recibe, actualizar fecha de recepción
        if (normalizedStatus === 'Recibida') {
            const updateDateSQL = 'UPDATE PurchaseOrders SET received_date = NOW() WHERE id = ?';
            await db.run(updateDateSQL, [id]);
        }
        
        res.json({
            message: 'Estado actualizado exitosamente',
            data: { id, status: normalizedStatus }
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
