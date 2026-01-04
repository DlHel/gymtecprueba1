// ===================================================================
// ENDPOINTS FALTANTES - GYMTEC ERP
// ===================================================================

// ===================================================================
// INVENTARIO
// ===================================================================

// GET /api/inventory - Listar todo el inventario
app.get('/api/inventory', authenticateToken, (req, res) => {
    console.log('📦 GET /api/inventory - Listando inventario');
    
    const sql = `
        SELECT 
            i.*,
            s.name as supplier_name
        FROM Inventory i
        LEFT JOIN Suppliers s ON i.supplier_id = s.id
        ORDER BY i.item_name ASC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Error al obtener inventario:', err.message);
            return res.status(500).json({
                error: 'Error interno del servidor',
                details: err.message
            });
        }
        
        console.log(`✅ Inventario obtenido: ${rows.length} items`);
        res.json({
            message: 'success',
            data: rows || []
        });
    });
});

// GET /api/inventory/categories - Listar categorías de inventario
app.get('/api/inventory/categories', authenticateToken, (req, res) => {
    console.log('📦 GET /api/inventory/categories - Listando categorías');
    
    const sql = `
        SELECT DISTINCT category 
        FROM Inventory 
        WHERE category IS NOT NULL 
        ORDER BY category ASC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Error al obtener categorías:', err.message);
            return res.status(500).json({
                error: 'Error interno del servidor',
                details: err.message
            });
        }
        
        const categories = rows.map(r => r.category);
        console.log(`✅ Categorías obtenidas: ${categories.length}`);
        res.json({
            message: 'success',
            data: categories
        });
    });
});

// GET /api/inventory/:id - Obtener un item de inventario
app.get('/api/inventory/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    console.log(`📦 GET /api/inventory/${id} - Obteniendo item`);
    
    const sql = `
        SELECT 
            i.*,
            s.name as supplier_name,
            s.contact_name as supplier_contact,
            s.phone as supplier_phone,
            s.email as supplier_email
        FROM Inventory i
        LEFT JOIN Suppliers s ON i.supplier_id = s.id
        WHERE i.id = ?
    `;
    
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
        
        console.log(`✅ Item obtenido: ${row.item_name}`);
        res.json({
            message: 'success',
            data: row
        });
    });
});

// ===================================================================
// MODELOS
// ===================================================================

// GET /api/models/:id - Obtener un modelo específico
app.get('/api/models/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    console.log(`📦 GET /api/models/${id} - Obteniendo modelo`);
    
    const sql = `
        SELECT 
            em.*,
            COUNT(DISTINCT e.id) as equipment_count
        FROM EquipmentModels em
        LEFT JOIN Equipment e ON em.id = e.model_id
        WHERE em.id = ?
        GROUP BY em.id
    `;
    
    db.get(sql, [id], (err, row) => {
        if (err) {
            console.error('❌ Error al obtener modelo:', err.message);
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

// ===================================================================
// UBICACIONES (LOCATIONS)
// ===================================================================

// GET /api/locations/:id/tickets - Tickets de una ubicación
app.get('/api/locations/:id/tickets', authenticateToken, (req, res) => {
    const { id } = req.params;
    console.log(`📍 GET /api/locations/${id}/tickets - Obteniendo tickets`);
    
    const sql = `
        SELECT 
            t.*,
            c.name as client_name,
            l.name as location_name,
            u.username as assigned_to_name
        FROM Tickets t
        LEFT JOIN Clients c ON t.client_id = c.id
        LEFT JOIN Locations l ON t.location_id = l.id
        LEFT JOIN Users u ON t.assigned_to = u.id
        WHERE t.location_id = ?
        ORDER BY t.created_at DESC
    `;
    
    db.all(sql, [id], (err, rows) => {
        if (err) {
            console.error('❌ Error al obtener tickets:', err.message);
            return res.status(500).json({
                error: 'Error interno del servidor',
                details: err.message
            });
        }
        
        console.log(`✅ Tickets obtenidos: ${rows.length}`);
        res.json({
            message: 'success',
            data: rows || []
        });
    });
});

// ===================================================================
// USUARIOS
// ===================================================================

// GET /api/users/me - Obtener información del usuario actual
app.get('/api/users/me', authenticateToken, (req, res) => {
    console.log('👤 GET /api/users/me - Obteniendo usuario actual');
    
    const userId = req.user.id;
    
    const sql = `
        SELECT 
            id,
            username,
            email,
            nombre,
            apellido,
            role,
            client_id,
            created_at
        FROM Users
        WHERE id = ?
    `;
    
    db.get(sql, [userId], (err, row) => {
        if (err) {
            console.error('❌ Error al obtener usuario:', err.message);
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

// ===================================================================
// DASHBOARD
// ===================================================================

// GET /api/dashboard/stats - Estadísticas generales del dashboard
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
    console.log('📊 GET /api/dashboard/stats - Obteniendo estadísticas');
    
    const queries = {
        totalClients: 'SELECT COUNT(*) as count FROM Clients',
        totalLocations: 'SELECT COUNT(*) as count FROM Locations',
        totalEquipment: 'SELECT COUNT(*) as count FROM Equipment WHERE activo = 1',
        totalTickets: 'SELECT COUNT(*) as count FROM Tickets',
        openTickets: 'SELECT COUNT(*) as count FROM Tickets WHERE status IN ("open", "in_progress")',
        totalUsers: 'SELECT COUNT(*) as count FROM Users',
        inventoryItems: 'SELECT COUNT(*) as count FROM Inventory',
        activeContracts: 'SELECT COUNT(*) as count FROM Contracts WHERE status = "active"'
    };
    
    const stats = {};
    const queryPromises = [];
    
    Object.keys(queries).forEach(key => {
        queryPromises.push(
            new Promise((resolve, reject) => {
                db.get(queries[key], [], (err, row) => {
                    if (err) {
                        stats[key] = 0;
                        resolve();
                    } else {
                        stats[key] = row ? row.count : 0;
                        resolve();
                    }
                });
            })
        );
    });
    
    Promise.all(queryPromises)
        .then(() => {
            console.log('✅ Estadísticas obtenidas:', stats);
            res.json({
                message: 'success',
                data: stats
            });
        })
        .catch(err => {
            console.error('❌ Error al obtener estadísticas:', err);
            res.status(500).json({
                error: 'Error interno del servidor',
                details: err.message
            });
        });
});

console.log('✅ Endpoints adicionales cargados correctamente');
