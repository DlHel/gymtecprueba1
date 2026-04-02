// Módulo de endpoints de inventario para inyectar en server-clean.js
// Reemplaza a las secciones existentes

// GET /api/inventory/technicians - CORREGIDO
app.get('/api/inventory/technicians', authenticateToken, (req, res) => {
    console.log('📦 GET /api/inventory/technicians - Listando técnicos con inventario');

    const sql = `
        SELECT
            u.id,
            u.username,
            u.email,
            u.first_name,
            u.last_name,
            COUNT(ti.id) as items_count,
            COALESCE(SUM(ti.quantity), 0) as total_quantity
        FROM Users u
        LEFT JOIN TechnicianInventory ti ON u.id = ti.technician_id
        WHERE u.role = 'Technician' AND u.is_active = 1
        GROUP BY u.id, u.username, u.email
        ORDER BY u.username
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Error al obtener técnicos:', err.message);
            // Fallback silencioso si devuelve vacío
            return res.json({ message: 'success', data: [] });
        }
        res.json({ message: 'success', data: rows || [] });
    });
});

// GET /api/inventory/movements - NUEVO
app.get('/api/inventory/movements', authenticateToken, (req, res) => {
    console.log('📦 GET /api/inventory/movements - Historial');
    const sql = `
        SELECT 
            m.*,
            s.name as spare_part_name,
            s.sku,
            u.username as created_by_name
        FROM SparePartsMovements m
        JOIN SpareParts s ON m.spare_part_id = s.id
        LEFT JOIN Users u ON m.created_by = u.id
        ORDER BY m.created_at DESC
        LIMIT 100
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows || [] });
    });
});

// POST /api/inventory - ACTUALIZADO (Con nuevos campos)
app.post('/api/inventory', authenticateToken, (req, res) => {
    console.log('📦 POST /api/inventory - Creando nuevo item COMPLETO');
    const {
        name, sku, category, brand, 
        current_stock, min_stock, 
        unit_price, location, description
    } = req.body;

    if (!name || !sku) {
        return res.status(400).json({ error: 'Nombre y SKU son requeridos' });
    }

    const sql = `
        INSERT INTO SpareParts
        (name, sku, category, brand, current_stock, minimum_stock, unit_price, location, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
        name, sku, category || 'General', brand || '', 
        current_stock || 0, min_stock || 0,
        unit_price || 0, location || '', description || ''
    ];

    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // Registrar movimiento inicial si stock > 0
        if (current_stock > 0) {
            db.run(`INSERT INTO SparePartsMovements 
                (spare_part_id, movement_type, quantity, previous_stock, new_stock, notes, created_by)
                VALUES (?, 'in', ?, 0, ?, 'Stock inicial', ?)`,
                [this.lastID, current_stock, current_stock, req.user.id]
            );
        }

        res.status(201).json({ message: 'success', data: { id: this.lastID } });
    });
});
