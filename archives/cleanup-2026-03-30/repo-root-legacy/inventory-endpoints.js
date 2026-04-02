// ===================================================================
// ENDPOINTS ADICIONALES DE INVENTARIO PARA VPS - MYSQL COMPATIBLE
// Agregar estos endpoints después de GET /api/inventory/categories
// ===================================================================

// GET /api/inventory/:id - Obtener un item de inventario
app.get('/api/inventory/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    console.log(`📦 GET /api/inventory/${id} - Obteniendo item`);
    
    try {
        const sql = `
            SELECT 
                sp.*,
                ic.name as category_name
            FROM SpareParts sp
            LEFT JOIN InventoryCategories ic ON sp.category_id = ic.id
            WHERE sp.id = ?
        `;
        
        const [rows] = await db.execute(sql, [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({
                error: 'Item no encontrado'
            });
        }
        
        console.log(`✅ Item obtenido: ${rows[0].name}`);
        res.json({
            message: 'success',
            data: rows[0]
        });
    } catch (error) {
        console.error('❌ Error al obtener item:', error.message);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// POST /api/inventory - Crear nuevo item de inventario
app.post('/api/inventory', authenticateToken, async (req, res) => {
    console.log('📦 POST /api/inventory - Creando nuevo item');
    
    const {
        name,
        sku,
        category_id,
        brand,
        current_stock,
        min_stock,
        unit_price,
        location,
        description
    } = req.body;
    
    if (!name || !sku) {
        return res.status(400).json({
            error: 'Nombre y SKU son requeridos'
        });
    }
    
    try {
        const sql = `
            INSERT INTO SpareParts 
            (name, sku, category_id, brand, current_stock, min_stock, unit_price, location, description, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        const [result] = await db.execute(sql, [
            name,
            sku,
            category_id || null,
            brand || null,
            current_stock || 0,
            min_stock || 0,
            unit_price || 0,
            location || null,
            description || null
        ]);
        
        console.log(`✅ Item creado con ID: ${result.insertId}`);
        res.status(201).json({
            message: 'success',
            data: {
                id: result.insertId,
                name,
                sku
            }
        });
    } catch (error) {
        console.error('❌ Error al crear item:', error.message);
        
        // Error de SKU duplicado
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                error: 'Ya existe un item con ese SKU'
            });
        }
        
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// PUT /api/inventory/:id - Actualizar item de inventario
app.put('/api/inventory/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    console.log(`📦 PUT /api/inventory/${id} - Actualizando item`);
    
    const {
        name,
        sku,
        category_id,
        brand,
        current_stock,
        min_stock,
        unit_price,
        location,
        description
    } = req.body;
    
    try {
        const sql = `
            UPDATE SpareParts SET
                name = COALESCE(?, name),
                sku = COALESCE(?, sku),
                category_id = ?,
                brand = ?,
                current_stock = COALESCE(?, current_stock),
                min_stock = COALESCE(?, min_stock),
                unit_price = COALESCE(?, unit_price),
                location = ?,
                description = ?,
                updated_at = NOW()
            WHERE id = ?
        `;
        
        const [result] = await db.execute(sql, [
            name,
            sku,
            category_id || null,
            brand || null,
            current_stock,
            min_stock,
            unit_price,
            location || null,
            description || null,
            id
        ]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Item no encontrado'
            });
        }
        
        console.log(`✅ Item ${id} actualizado`);
        res.json({
            message: 'success',
            data: { id, ...req.body }
        });
    } catch (error) {
        console.error('❌ Error al actualizar item:', error.message);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// DELETE /api/inventory/:id - Eliminar item de inventario
app.delete('/api/inventory/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    console.log(`📦 DELETE /api/inventory/${id} - Eliminando item`);
    
    try {
        const sql = 'DELETE FROM SpareParts WHERE id = ?';
        const [result] = await db.execute(sql, [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Item no encontrado'
            });
        }
        
        console.log(`✅ Item ${id} eliminado`);
        res.json({
            message: 'success',
            data: { id }
        });
    } catch (error) {
        console.error('❌ Error al eliminar item:', error.message);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// GET /api/inventory/technicians - Listar técnicos con inventario asignado
app.get('/api/inventory/technicians', authenticateToken, async (req, res) => {
    console.log('📦 GET /api/inventory/technicians - Listando técnicos con inventario');
    
    try {
        const sql = `
            SELECT 
                u.id,
                u.username,
                u.email,
                COUNT(ti.id) as items_count,
                COALESCE(SUM(ti.quantity), 0) as total_quantity
            FROM Users u
            LEFT JOIN TechnicianInventory ti ON u.id = ti.user_id
            WHERE u.role = 'Technician' AND u.is_active = 1
            GROUP BY u.id, u.username, u.email
            ORDER BY u.username
        `;
        
        const [rows] = await db.execute(sql);
        
        console.log(`✅ Técnicos obtenidos: ${rows.length}`);
        res.json({
            message: 'success',
            data: rows
        });
    } catch (error) {
        console.error('❌ Error al obtener técnicos:', error.message);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// POST /api/inventory/assign - Asignar inventario a técnico
app.post('/api/inventory/assign', authenticateToken, async (req, res) => {
    console.log('📦 POST /api/inventory/assign - Asignando inventario a técnico');
    
    const { technician_id, spare_part_id, quantity, notes } = req.body;
    
    if (!technician_id || !spare_part_id || !quantity) {
        return res.status(400).json({
            error: 'Técnico, repuesto y cantidad son requeridos'
        });
    }
    
    try {
        // Verificar stock disponible
        const [stock] = await db.execute(
            'SELECT current_stock, name FROM SpareParts WHERE id = ?',
            [spare_part_id]
        );
        
        if (stock.length === 0) {
            return res.status(404).json({ error: 'Repuesto no encontrado' });
        }
        
        if (stock[0].current_stock < quantity) {
            return res.status(400).json({ 
                error: `Stock insuficiente. Disponible: ${stock[0].current_stock}` 
            });
        }
        
        // Descontar del stock central
        await db.execute(
            'UPDATE SpareParts SET current_stock = current_stock - ? WHERE id = ?',
            [quantity, spare_part_id]
        );
        
        // Agregar o actualizar inventario del técnico
        const insertSql = `
            INSERT INTO TechnicianInventory (user_id, spare_part_id, quantity, notes, assigned_at)
            VALUES (?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
                quantity = quantity + VALUES(quantity),
                notes = COALESCE(VALUES(notes), notes)
        `;
        
        await db.execute(insertSql, [technician_id, spare_part_id, quantity, notes || null]);
        
        console.log(`✅ ${quantity} unidades de ${stock[0].name} asignadas al técnico ${technician_id}`);
        res.json({
            message: 'success',
            data: {
                technician_id,
                spare_part_id,
                quantity,
                spare_part_name: stock[0].name
            }
        });
    } catch (error) {
        console.error('❌ Error al asignar inventario:', error.message);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

console.log('✅ Endpoints CRUD de inventario cargados correctamente');
