// ===================================================================
// ENDPOINTS ADICIONALES DE INVENTARIO PARA VPS - SQLITE COMPATIBLE
// Insertar después del endpoint GET /api/inventory/categories
// ===================================================================

// GET /api/inventory/:id - Obtener un item de inventario
app.get('/api/inventory/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    console.log(`📦 GET /api/inventory/${id} - Obteniendo item`);
    
    const sql = `SELECT * FROM SpareParts WHERE id = ?`;
    
    db.get(sql, [id], (err, row) => {
        if (err) {
            console.error('❌ Error al obtener item:', err.message);
            return res.status(500).json({
                error: 'Error interno del servidor',
                details: err.message
            });
        }
        
        if (!row) {
            return res.status(404).json({
                error: 'Item no encontrado'
            });
        }
        
        console.log(`✅ Item obtenido: ${row.name}`);
        res.json({
            message: 'success',
            data: row
        });
    });
});

// POST /api/inventory - Crear nuevo item de inventario
app.post('/api/inventory', authenticateToken, (req, res) => {
    console.log('📦 POST /api/inventory - Creando nuevo item');
    console.log('📋 Body recibido:', req.body);
    
    const {
        name,
        sku,
        category_id,
        category,
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
    
    const sql = `
        INSERT INTO SpareParts 
        (name, sku, category, brand, current_stock, min_stock, unit_price, location, description, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;
    
    const params = [
        name,
        sku,
        category || null,
        brand || null,
        current_stock || 0,
        min_stock || 0,
        unit_price || 0,
        location || null,
        description || null
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error al crear item:', err.message);
            
            // Error de SKU duplicado
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({
                    error: 'Ya existe un item con ese SKU'
                });
            }
            
            return res.status(500).json({
                error: 'Error interno del servidor',
                details: err.message
            });
        }
        
        console.log(`✅ Item creado con ID: ${this.lastID}`);
        res.status(201).json({
            message: 'success',
            data: {
                id: this.lastID,
                name,
                sku
            }
        });
    });
});

// PUT /api/inventory/:id - Actualizar item de inventario
app.put('/api/inventory/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    console.log(`📦 PUT /api/inventory/${id} - Actualizando item`);
    
    const {
        name,
        sku,
        category,
        brand,
        current_stock,
        min_stock,
        unit_price,
        location,
        description
    } = req.body;
    
    const sql = `
        UPDATE SpareParts SET
            name = COALESCE(?, name),
            sku = COALESCE(?, sku),
            category = ?,
            brand = ?,
            current_stock = COALESCE(?, current_stock),
            min_stock = COALESCE(?, min_stock),
            unit_price = COALESCE(?, unit_price),
            location = ?,
            description = ?,
            updated_at = datetime('now')
        WHERE id = ?
    `;
    
    const params = [
        name,
        sku,
        category || null,
        brand || null,
        current_stock,
        min_stock,
        unit_price,
        location || null,
        description || null,
        id
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error al actualizar item:', err.message);
            return res.status(500).json({
                error: 'Error interno del servidor',
                details: err.message
            });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({
                error: 'Item no encontrado'
            });
        }
        
        console.log(`✅ Item ${id} actualizado`);
        res.json({
            message: 'success',
            data: { id, ...req.body }
        });
    });
});

// DELETE /api/inventory/:id - Eliminar item de inventario
app.delete('/api/inventory/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    console.log(`📦 DELETE /api/inventory/${id} - Eliminando item`);
    
    const sql = 'DELETE FROM SpareParts WHERE id = ?';
    
    db.run(sql, [id], function(err) {
        if (err) {
            console.error('❌ Error al eliminar item:', err.message);
            return res.status(500).json({
                error: 'Error interno del servidor',
                details: err.message
            });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({
                error: 'Item no encontrado'
            });
        }
        
        console.log(`✅ Item ${id} eliminado`);
        res.json({
            message: 'success',
            data: { id }
        });
    });
});

// GET /api/inventory/technicians - Listar técnicos con inventario asignado
app.get('/api/inventory/technicians', authenticateToken, (req, res) => {
    console.log('📦 GET /api/inventory/technicians - Listando técnicos con inventario');
    
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
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Error al obtener técnicos:', err.message);
            return res.status(500).json({
                error: 'Error interno del servidor',
                details: err.message
            });
        }
        
        console.log(`✅ Técnicos obtenidos: ${rows.length}`);
        res.json({
            message: 'success',
            data: rows || []
        });
    });
});

// POST /api/inventory/assign - Asignar inventario a técnico
app.post('/api/inventory/assign', authenticateToken, (req, res) => {
    console.log('📦 POST /api/inventory/assign - Asignando inventario a técnico');
    
    const { technician_id, spare_part_id, quantity, notes } = req.body;
    
    if (!technician_id || !spare_part_id || !quantity) {
        return res.status(400).json({
            error: 'Técnico, repuesto y cantidad son requeridos'
        });
    }
    
    // Verificar stock disponible
    db.get('SELECT current_stock, name FROM SpareParts WHERE id = ?', [spare_part_id], (err, stock) => {
        if (err) {
            console.error('❌ Error verificando stock:', err);
            return res.status(500).json({ error: 'Error interno', details: err.message });
        }
        
        if (!stock) {
            return res.status(404).json({ error: 'Repuesto no encontrado' });
        }
        
        if (stock.current_stock < quantity) {
            return res.status(400).json({ 
                error: `Stock insuficiente. Disponible: ${stock.current_stock}` 
            });
        }
        
        // Descontar del stock central
        db.run('UPDATE SpareParts SET current_stock = current_stock - ? WHERE id = ?', [quantity, spare_part_id], (err) => {
            if (err) {
                console.error('❌ Error actualizando stock:', err);
                return res.status(500).json({ error: 'Error interno', details: err.message });
            }
            
            // Agregar al inventario del técnico
            const insertSql = `
                INSERT INTO TechnicianInventory (user_id, spare_part_id, quantity, notes, assigned_at)
                VALUES (?, ?, ?, ?, datetime('now'))
            `;
            
            db.run(insertSql, [technician_id, spare_part_id, quantity, notes || null], function(err) {
                if (err) {
                    // Si falla, restaurar stock
                    db.run('UPDATE SpareParts SET current_stock = current_stock + ? WHERE id = ?', [quantity, spare_part_id]);
                    console.error('❌ Error asignando:', err);
                    return res.status(500).json({ error: 'Error interno', details: err.message });
                }
                
                console.log(`✅ ${quantity} unidades de ${stock.name} asignadas al técnico ${technician_id}`);
                res.json({
                    message: 'success',
                    data: {
                        id: this.lastID,
                        technician_id,
                        spare_part_id,
                        quantity,
                        spare_part_name: stock.name
                    }
                });
            });
        });
    });
});

console.log('✅ Endpoints CRUD de inventario (SQLite) cargados correctamente');
