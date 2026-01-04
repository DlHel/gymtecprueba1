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
        if (err) { 
             console.error('❌ Error movements:', err);
             // Return empty array on error to avoiding breaking UI? No, better 500 or error msg
             return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'success', data: rows || [] });
    });
});
