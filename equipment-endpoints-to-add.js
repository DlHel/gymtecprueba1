// ==================================================================
// ENDPOINTS PARA EQUIPMENT DRAWER - AGREGAR A server-clean.js
// Insertar después del endpoint GET /api/equipment/:id (línea ~1415)
// ==================================================================

// GET /api/equipment/:id/tickets - Tickets de un equipo
app.get('/api/equipment/:id/tickets', authenticateToken, (req, res) => {
    const { id } = req.params;
    console.log(`📋 GET /api/equipment/${id}/tickets`);

    const sql = `
        SELECT 
            t.id, t.title, t.description, t.status, t.priority,
            t.created_at, t.updated_at, t.due_date,
            u.username as assigned_to
        FROM Tickets t
        LEFT JOIN Users u ON t.assigned_technician_id = u.id
        WHERE t.equipment_id = ?
        ORDER BY t.created_at DESC
    `;

    db.all(sql, [id], (err, rows) => {
        if (err) {
            console.error('❌ Error:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'success', data: rows || [] });
    });
});

// GET /api/equipment/:id/photos - Fotos de un equipo
app.get('/api/equipment/:id/photos', authenticateToken, (req, res) => {
    const { id } = req.params;
    console.log(`📸 GET /api/equipment/${id}/photos`);

    const sql = `
        SELECT id, photo_base64, description, created_at
        FROM EquipmentPhotos
        WHERE equipment_id = ?
        ORDER BY created_at DESC
    `;

    db.all(sql, [id], (err, rows) => {
        if (err) {
            console.error('❌ Error:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'success', data: rows || [] });
    });
});

// GET /api/equipment/:id/notes - Notas de un equipo
app.get('/api/equipment/:id/notes', authenticateToken, (req, res) => {
    const { id } = req.params;
    console.log(`📝 GET /api/equipment/${id}/notes`);

    const sql = `
        SELECT 
            n.id, n.note_text, n.created_at,
            u.username as created_by
        FROM EquipmentNotes n
        LEFT JOIN Users u ON n.created_by_id = u.id
        WHERE n.equipment_id = ?
        ORDER BY n.created_at DESC
    `;

    db.all(sql, [id], (err, rows) => {
        if (err) {
            console.error('❌ Error:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'success', data: rows || [] });
    });
});

// GET /api/models/:id/main-photo - Foto principal de modelo
app.get('/api/models/:id/main-photo', authenticateToken, (req, res) => {
    const { id } = req.params;
    console.log(`🖼️ GET /api/models/${id}/main-photo`);

    const sql = `SELECT main_photo FROM EquipmentModels WHERE id = ?`;

    db.get(sql, [id], (err, row) => {
        if (err) {
            console.error('❌ Error:', err);
            return res.status(500).json({ error: err.message });
        }
        if (!row || !row.main_photo) {
            return res.status(404).json({ error: 'Foto no encontrada' });
        }
        res.json({ message: 'success', data: { photo: row.main_photo } });
    });
});
