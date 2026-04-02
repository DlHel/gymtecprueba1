
// ===================================================================
// ENDPOINTS FALTANTES - AGREGADOS PARA COMPLETAR FUNCIONALIDAD
// ===================================================================

// GET /api/inventory - Listar inventario completo
app.get('/api/inventory', authenticateToken, (req, res) => {
    console.log('📦 GET /api/inventory - Listando inventario');
    
    const sql = `SELECT * FROM Inventory ORDER BY item_name`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Error al obtener inventario:', err);
            return res.status(500).json({
                error: 'Error interno del servidor',
                details: err.message
            });
        }
        
        console.log(`✅ Inventario obtenido: ${rows.length} items`);
        res.json({
            message: 'success',
            data: rows
        });
    });
});

// GET /api/inventory/categories - Listar categorías de inventario
app.get('/api/inventory/categories', authenticateToken, (req, res) => {
    console.log('📦 GET /api/inventory/categories - Listando categorías');
    
    const sql = `SELECT DISTINCT category FROM Inventory WHERE category IS NOT NULL ORDER BY category`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Error al obtener categorías:', err);
            return res.status(500).json({
                error: 'Error interno del servidor',
                details: err.message
            });
        }
        
        const categories = rows.map(row => row.category);
        console.log(`✅ Categorías obtenidas: ${categories.length}`);
        res.json({
            message: 'success',
            data: categories
        });
    });
});

// GET /api/dashboard/activity - Actividad reciente del dashboard
app.get('/api/dashboard/activity', authenticateToken, (req, res) => {
    console.log('📊 GET /api/dashboard/activity - Obteniendo actividad reciente');
    
    const limit = parseInt(req.query.limit) || 10;
    
    const sql = `
        SELECT 
            'ticket' as type,
            id,
            title as description,
            created_at as date,
            created_by as user
        FROM Tickets
        ORDER BY created_at DESC
        LIMIT ?
    `;
    
    db.all(sql, [limit], (err, rows) => {
        if (err) {
            console.error('❌ Error al obtener actividad:', err);
            return res.status(500).json({
                error: 'Error interno del servidor',
                details: err.message
            });
        }
        
        console.log(`✅ Actividad obtenida: ${rows.length} registros`);
        res.json({
            message: 'success',
            data: rows
        });
    });
});

// GET /api/models/:id - Obtener modelo individual
app.get('/api/models/:id', authenticateToken, (req, res) => {
    console.log(`🔧 GET /api/models/${req.params.id} - Obteniendo modelo`);
    
    const sql = `SELECT * FROM EquipmentModels WHERE id = ?`;
    
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            console.error('❌ Error al obtener modelo:', err);
            return res.status(500).json({
                error: 'Error interno del servidor',
                details: err.message
            });
        }
        
        if (!row) {
            return res.status(404).json({
                error: 'Modelo no encontrado'
            });
        }
        
        console.log(`✅ Modelo obtenido: ${row.name}`);
        res.json({
            message: 'success',
            data: row
        });
    });
});

// GET /api/users/me - Obtener información del usuario actual
app.get('/api/users/me', authenticateToken, (req, res) => {
    console.log(`👤 GET /api/users/me - Usuario actual: ${req.user.username}`);
    
    const sql = `
        SELECT 
            id,
            username,
            email,
            role,
            status,
            created_at
        FROM Users
        WHERE id = ?
    `;
    
    db.get(sql, [req.user.id], (err, row) => {
        if (err) {
            console.error('❌ Error al obtener usuario:', err);
            return res.status(500).json({
                error: 'Error interno del servidor',
                details: err.message
            });
        }
        
        if (!row) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }
        
        console.log(`✅ Usuario obtenido: ${row.username}`);
        res.json({
            message: 'success',
            data: row
        });
    });
});

// GET /api/locations/:id/tickets - Obtener tickets de una ubicación
app.get('/api/locations/:id/tickets', authenticateToken, (req, res) => {
    console.log(`🎫 GET /api/locations/${req.params.id}/tickets - Obteniendo tickets`);
    
    const sql = `
        SELECT 
            t.*,
            e.serial_number as equipment_serial
        FROM Tickets t
        LEFT JOIN Equipment e ON t.equipment_id = e.id
        WHERE e.location_id = ?
        ORDER BY t.created_at DESC
    `;
    
    db.all(sql, [req.params.id], (err, rows) => {
        if (err) {
            console.error('❌ Error al obtener tickets:', err);
            return res.status(500).json({
                error: 'Error interno del servidor',
                details: err.message
            });
        }
        
        console.log(`✅ Tickets obtenidos: ${rows.length}`);
        res.json({
            message: 'success',
            data: rows
        });
    });
});

console.log('✅ Endpoints adicionales agregados correctamente');
