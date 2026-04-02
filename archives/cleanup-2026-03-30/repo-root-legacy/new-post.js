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
    
    // category y brand se insertan como strings. Si el frontend envía IDs, habría que convertir,
    // pero estamos asumiendo que SpareParts ahora tiene varchar. El frontend envía nombres si es texto libre.
    // Si usa selects, podría enviar ID. Por ahora asumiremos que se pasa el valor o un default.
    const params = [
        name, sku, category || 'General', brand || '', 
        current_stock || 0, min_stock || 0,
        unit_price || 0, location || '', description || ''
    ];

    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error creando item:', err.message);
            if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'SKU duplicado' });
            return res.status(500).json({ error: err.message });
        }
        
        // Registrar movimiento inicial si stock > 0
        if (current_stock > 0) {
            db.run(`INSERT INTO SparePartsMovements 
                (spare_part_id, movement_type, quantity, previous_stock, new_stock, notes, created_by)
                VALUES (?, 'in', ?, 0, ?, 'Stock inicial', ?)`,
                [this.lastID, current_stock, current_stock, req.user.id]
            );
        }

        console.log(`✅ Item creado: ${this.lastID}`);
        res.status(201).json({ message: 'success', data: { id: this.lastID } });
    });
});
