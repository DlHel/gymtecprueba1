// ===================================================================
// ENDPOINTS EQUIPMENT DRAWER - COPIADOS DEL PROYECTO LOCAL
// ===================================================================

// GET /api/equipment/:equipmentId/tickets
app.get('/api/equipment/:equipmentId/tickets', authenticateToken, (req, res) => {
    const { equipmentId } = req.params;
    
    // Buscar tickets de dos fuentes:
    // 1. Tickets individuales donde equipment_id = equipmentId
    // 2. Tickets de gimnación que incluyan este equipo en ticket_equipment_scope
    const sql = `
        SELECT DISTINCT
            t.id,
            t.title,
            t.description,
            t.status,
            t.priority,
            t.ticket_type,
            t.created_at,
            t.updated_at,
            c.name as client_name,
            l.name as location_name,
            'individual' as source
        FROM Tickets t
        LEFT JOIN Clients c ON t.client_id = c.id
        LEFT JOIN Locations l ON t.location_id = l.id
        WHERE t.equipment_id = ?
        
        UNION
        
        SELECT DISTINCT
            t.id,
            t.title,
            t.description,
            t.status,
            t.priority,
            t.ticket_type,
            t.created_at,
            t.updated_at,
            c.name as client_name,
            l.name as location_name,
            'gimnacion' as source
        FROM Tickets t
        INNER JOIN TicketEquipmentScope tes ON t.id = tes.ticket_id
        LEFT JOIN Clients c ON t.client_id = c.id
        LEFT JOIN Locations l ON t.location_id = l.id
        WHERE tes.equipment_id = ?
        
        ORDER BY created_at DESC
    `;
    
    db.all(sql, [equipmentId, equipmentId], (err, rows) => {
        if (err) {
            console.error('❌ Error fetching equipment tickets:', err.message);
            res.status(500).json({ 
                error: 'Error al obtener tickets del equipo',
                code: 'TICKETS_FETCH_ERROR'
            });
            return;
        }
        
        console.log(`🎫 Tickets encontrados para equipo ${equipmentId}:`, rows.length);
        res.json(rows || []);
    });
});

// GET /api/equipment/:equipmentId/photos
app.get('/api/equipment/:equipmentId/photos', authenticateToken, (req, res) => {
    const { equipmentId } = req.params;
    const sql = `
        SELECT * FROM EquipmentPhotos 
        WHERE equipment_id = ? 
        ORDER BY created_at DESC
    `;
    
    db.all(sql, [equipmentId], (err, rows) => {
        if (err) {
            console.error('❌ Error fetching equipment photos:', err.message);
            res.status(500).json({ 
                error: 'Error al obtener fotos del equipo',
                code: 'PHOTOS_FETCH_ERROR'
            });
            return;
        }
        
        console.log(`📸 Fotos encontradas para equipo ${equipmentId}:`, rows.length);
        res.json(rows || []);
    });
});

// GET /api/equipment/:equipmentId/notes
app.get('/api/equipment/:equipmentId/notes', authenticateToken, (req, res) => {
    const { equipmentId } = req.params;
    const sql = `
        SELECT * FROM EquipmentNotes 
        WHERE equipment_id = ? 
        ORDER BY created_at DESC
    `;
    
    db.all(sql, [equipmentId], (err, rows) => {
        if (err) {
            console.error('❌ Error fetching equipment notes:', err.message);
            res.status(500).json({ 
                error: 'Error al obtener notas del equipo',
                code: 'NOTES_FETCH_ERROR'
            });
            return;
        }
        
        console.log(`📝 Notas encontradas para equipo ${equipmentId}:`, rows.length);
        res.json(rows || []);
    });
});

// GET /api/models/:id/main-photo
app.get('/api/models/:id/main-photo', (req, res) => {
    const modelId = req.params.id;
    
    console.log('🖼️ Obteniendo foto principal del modelo ID:', modelId);
    
    const query = `
        SELECT 
            id,
            photo_data,
            file_name,
            mime_type,
            file_size,
            created_at
        FROM ModelPhotos 
        WHERE model_id = ? AND is_primary = 1
        LIMIT 1
    `;
    
    db.get(query, [modelId], (err, row) => {
        if (err) {
            console.error('❌ Error obteniendo foto principal:', err);
            return res.status(500).json({
                error: 'Error al obtener foto principal',
                details: err.message
            });
        }
        
        if (!row) {
            // No hay foto principal, devolver 404
            return res.status(404).json({
                error: 'No se encontró foto principal para este modelo'
            });
        }
        
        res.json(row);
    });
});
