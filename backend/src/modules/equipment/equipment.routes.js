/**
 * GYMTEC ERP - Módulo de Equipos
 * Extraído de server-clean.js para arquitectura modular
 */

const express = require('express');
const router = express.Router();
const db = require('../../db-adapter');
const { authenticateToken } = require('../../core/middleware/auth.middleware');
const validateData = require('../../middleware/validate.middleware');
const { equipmentSchema, equipmentUpdateSchema } = require('../../schemas/equipment.schema');

// ===================================================================
// CRUD DE EQUIPOS
// ===================================================================

// GET all equipment (with optional location_id filter)
router.get('/equipment', authenticateToken, (req, res) => {
    const { location_id } = req.query;
    
    let sql = `
        SELECT 
            e.id, e.name, e.type, e.brand, e.model, e.serial_number, e.custom_id,
            e.location_id, e.model_id, e.acquisition_date, e.last_maintenance_date, e.notes,
            l.name as location_name, c.name as client_name, em.name as model_name
        FROM Equipment e
        LEFT JOIN Locations l ON e.location_id = l.id
        LEFT JOIN Clients c ON l.client_id = c.id
        LEFT JOIN EquipmentModels em ON e.model_id = em.id
    `;
    
    let params = [];
    
    // Filtrar por location_id si se proporciona
    if (location_id) {
        sql += ` WHERE e.location_id = ?`;
        params.push(location_id);
    }
    
    sql += ` ORDER BY e.name`;
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('❌ Error getting equipment:', err.message);
            res.status(500).json({"error": "Error al obtener equipos: " + err.message});
            return;
        }
        console.log(`✅ Equipment found: ${rows.length} items${location_id ? ` for location ${location_id}` : ''}`);
        res.json({ message: 'success', data: rows || [] });
    });
});

// GET individual equipment by ID
router.get('/equipment/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const sql = `
        SELECT 
            e.id, e.custom_id, e.location_id, e.model_id, e.acquisition_date,
            e.last_maintenance_date, e.notes, e.created_at, e.updated_at,
            COALESCE(NULLIF(e.name, ''), em.name, 'Sin nombre') as name,
            CASE 
                WHEN e.custom_id LIKE 'CARD-%' THEN 'Cardio'
                WHEN e.custom_id LIKE 'FUER-%' THEN 'Fuerza'
                WHEN e.custom_id LIKE 'FUNC-%' THEN 'Funcional'
                WHEN e.custom_id LIKE 'ACCE-%' THEN 'Accesorio'
                ELSE COALESCE(NULLIF(e.type, ''), 'Sin categoría')
            END as type,
            COALESCE(NULLIF(e.brand, ''), em.brand, 'Sin marca') as brand,
            COALESCE(NULLIF(e.model, ''), em.name, 'Sin modelo') as model,
            COALESCE(NULLIF(e.serial_number, ''), 'No asignado') as serial_number,
            em.name as model_name, em.brand as model_brand,
            l.name as location_name, c.name as client_name
        FROM Equipment e
        LEFT JOIN EquipmentModels em ON e.model_id = em.id
        LEFT JOIN Locations l ON e.location_id = l.id
        LEFT JOIN Clients c ON l.client_id = c.id
        WHERE e.id = ?
    `;
    
    db.get(sql, [id], (err, row) => {
        if (err) {
            console.error(`❌ Error fetching equipment ${id}:`, err);
            return res.status(500).json({ error: 'Error al obtener el equipo', code: 'DB_ERROR' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Equipo no encontrado', code: 'EQUIPMENT_NOT_FOUND' });
        }
        console.log(`✅ Equipment ${id} found:`, row.name || row.type);
        res.json({ message: 'success', data: row });
    });
});

// POST crear nuevo equipo
router.post('/equipment', authenticateToken, validateData(equipmentSchema), (req, res) => {
    const { location_id, model_id, custom_id, serial_number, acquisition_date, notes } = req.body;
    
    // Manual validation removed, handled by middleware
    // if (!location_id) return res.status(400).... handled by Zod
    
    let finalCustomId = custom_id;
    
    const insertEquipment = (customIdValue) => {
        const sql = `INSERT INTO Equipment 
                     (location_id, model_id, custom_id, serial_number, acquisition_date, notes, name, type, brand, model, created_at, updated_at) 
                     VALUES (?, ?, ?, ?, ?, ?, '', '', '', '', NOW(), NOW())`;
        
        const params = [parseInt(location_id, 10), parseInt(model_id, 10), customIdValue, serial_number || null, acquisition_date || null, notes || null];
        
        db.run(sql, params, function(err) {
            if (err) {
                console.error('❌ Error creando equipo:', err.message);
                if (err.message.includes('UNIQUE') || err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ error: 'Ya existe un equipo con ese custom_id o serial_number', code: 'DUPLICATE_EQUIPMENT' });
                }
                return res.status(500).json({ error: 'Error al crear equipo: ' + err.message, code: 'EQUIPMENT_CREATE_ERROR' });
            }
            
            const equipmentId = this.lastID;
            console.log(`✅ Equipo creado exitosamente, ID: ${equipmentId}`);
            
            const selectSql = `
                SELECT e.id, e.custom_id, e.serial_number, e.location_id, e.model_id, e.acquisition_date, e.notes,
                       COALESCE(NULLIF(e.name, ''), em.name) as name, COALESCE(NULLIF(e.type, ''), em.category) as type,
                       COALESCE(NULLIF(e.brand, ''), em.brand) as brand, em.name as model_name
                FROM Equipment e LEFT JOIN EquipmentModels em ON e.model_id = em.id WHERE e.id = ?
            `;
            
            db.get(selectSql, [equipmentId], (err, row) => {
                if (err) return res.status(500).json({ error: 'Equipo creado pero error al recuperar datos', code: 'EQUIPMENT_RETRIEVE_ERROR', data: { id: equipmentId } });
                res.status(201).json({ message: 'Equipo creado exitosamente', data: row });
            });
        });
    };
    
    if (!finalCustomId) {
        const findMaxSql = `SELECT custom_id FROM Equipment WHERE location_id = ? AND custom_id LIKE 'CARD-%' ORDER BY CAST(SUBSTRING(custom_id, 6) AS UNSIGNED) DESC LIMIT 10`;
        
        db.get(findMaxSql, [location_id], (err, row) => {
            if (err) return res.status(500).json({ error: 'Error al generar custom_id', code: 'CUSTOM_ID_ERROR' });
            
            let nextNumber = 1;
            if (row && row.custom_id) {
                const match = row.custom_id.match(/CARD-(\d+)/);
                if (match) nextNumber = parseInt(match[1], 10) + 1;
            }
            finalCustomId = `CARD-${nextNumber}`;
            insertEquipment(finalCustomId);
        });
    } else {
        insertEquipment(finalCustomId);
    }
});

// PUT actualizar equipo existente
router.put('/equipment/:id', authenticateToken, validateData(equipmentUpdateSchema), (req, res) => {
    const { id } = req.params;
    const { location_id, model_id, custom_id, serial_number, acquisition_date, notes } = req.body;
    
    // Manual validation removed/redundant but kept specific checks safe if needed, Zod handles types/required keys
    
    const sql = `UPDATE Equipment SET location_id = ?, model_id = ?, custom_id = ?, serial_number = ?, acquisition_date = ?, notes = ?, updated_at = NOW() WHERE id = ?`;
    const params = [parseInt(location_id, 10), parseInt(model_id, 10), custom_id || null, serial_number || null, acquisition_date || null, notes || null, parseInt(id, 10)];
    
    db.run(sql, params, function(err) {
        if (err) {
            if (err.message.includes('UNIQUE') || err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'Ya existe un equipo con ese custom_id o serial_number', code: 'DUPLICATE_EQUIPMENT' });
            }
            return res.status(500).json({ error: 'Error al actualizar equipo: ' + err.message, code: 'EQUIPMENT_UPDATE_ERROR' });
        }
        if (this.changes === 0) return res.status(404).json({ error: 'Equipo no encontrado', code: 'EQUIPMENT_NOT_FOUND' });
        
        console.log(`✅ Equipo ${id} actualizado exitosamente`);
        
        const selectSql = `SELECT e.id, e.custom_id, e.serial_number, e.location_id, e.model_id, e.acquisition_date, e.notes,
                           COALESCE(NULLIF(e.name, ''), em.name) as name, em.name as model_name
                           FROM Equipment e LEFT JOIN EquipmentModels em ON e.model_id = em.id WHERE e.id = ?`;
        
        db.get(selectSql, [id], (err, row) => {
            if (err) return res.status(500).json({ error: 'Equipo actualizado pero error al recuperar datos', code: 'EQUIPMENT_RETRIEVE_ERROR' });
            res.json({ message: 'Equipo actualizado exitosamente', data: row });
        });
    });
});

// ===================================================================
// GESTIÓN DE FOTOS PARA EQUIPOS
// ===================================================================

router.get('/equipment/:equipmentId/photos', authenticateToken, (req, res) => {
    const { equipmentId } = req.params;
    const sql = `SELECT * FROM EquipmentPhotos WHERE equipment_id = ? ORDER BY created_at DESC`;
    
    db.all(sql, [equipmentId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al obtener fotos del equipo', code: 'PHOTOS_FETCH_ERROR' });
        console.log(`📸 Fotos encontradas para equipo ${equipmentId}:`, rows.length);
        res.json({ message: 'success', data: rows || [] });
    });
});

router.post('/equipment/:equipmentId/photos', authenticateToken, (req, res) => {
    const { equipmentId } = req.params;
    const { photo_data, mime_type, filename } = req.body;
    
    if (!photo_data || !mime_type) return res.status(400).json({ error: 'Se requiere photo_data y mime_type', code: 'MISSING_PHOTO_DATA' });
    
    const sql = `INSERT INTO EquipmentPhotos (equipment_id, photo_data, file_name, mime_type, file_size, created_at) VALUES (?, ?, ?, ?, ?, NOW())`;
    const file_size = filename ? Math.round(photo_data.length * 0.75) : 0;
    const params = [parseInt(equipmentId, 10), photo_data, filename || 'foto.jpg', mime_type, file_size];
    
    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: 'Error al agregar foto al equipo', code: 'PHOTO_UPLOAD_ERROR' });
        console.log(`✅ Foto agregada al equipo ${equipmentId}, ID: ${this.lastID}`);
        res.json({ message: "Foto agregada exitosamente", photoId: this.lastID });
    });
});

router.delete('/equipment/photos/:photoId', authenticateToken, (req, res) => {
    const { photoId } = req.params;
    const sql = 'DELETE FROM EquipmentPhotos WHERE id = ?';
    
    db.run(sql, [photoId], function(err) {
        if (err) return res.status(500).json({ error: 'Error al eliminar foto del equipo', code: 'PHOTO_DELETE_ERROR' });
        if (this.changes === 0) return res.status(404).json({ error: "Foto no encontrada", code: 'PHOTO_NOT_FOUND' });
        console.log(`✅ Foto ${photoId} eliminada del equipo`);
        res.json({ message: "Foto eliminada exitosamente", changes: this.changes });
    });
});

// ===================================================================
// GESTIÓN DE NOTAS PARA EQUIPOS
// ===================================================================

router.get('/equipment/:equipmentId/notes', authenticateToken, (req, res) => {
    const { equipmentId } = req.params;
    const sql = `SELECT * FROM EquipmentNotes WHERE equipment_id = ? ORDER BY created_at DESC`;
    
    db.all(sql, [equipmentId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al obtener notas del equipo', code: 'NOTES_FETCH_ERROR' });
        console.log(`📝 Notas encontradas para equipo ${equipmentId}:`, rows.length);
        res.json({ message: 'success', data: rows || [] });
    });
});

router.post('/equipment/:equipmentId/notes', authenticateToken, (req, res) => {
    const { equipmentId } = req.params;
    const { note } = req.body;
    
    if (!note || note.trim() === '') return res.status(400).json({ error: 'La nota no puede estar vacía', code: 'EMPTY_NOTE' });
    
    const sql = `INSERT INTO EquipmentNotes (equipment_id, note, author, created_at) VALUES (?, ?, ?, NOW())`;
    const params = [parseInt(equipmentId, 10), note.trim(), req.user.username || 'Sistema'];
    
    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: 'Error al agregar nota al equipo', code: 'NOTE_ADD_ERROR' });
        console.log(`✅ Nota agregada al equipo ${equipmentId}, ID: ${this.lastID}`);
        res.json({ message: "Nota agregada exitosamente", noteId: this.lastID });
    });
});

router.delete('/equipment/notes/:noteId', authenticateToken, (req, res) => {
    const { noteId } = req.params;
    const sql = 'DELETE FROM EquipmentNotes WHERE id = ?';
    
    db.run(sql, [noteId], function(err) {
        if (err) return res.status(500).json({ error: 'Error al eliminar nota del equipo', code: 'NOTE_DELETE_ERROR' });
        if (this.changes === 0) return res.status(404).json({ error: "Nota no encontrada", code: 'NOTE_NOT_FOUND' });
        console.log(`✅ Nota ${noteId} eliminada del equipo`);
        res.json({ message: "Nota eliminada exitosamente", changes: this.changes });
    });
});

// ===================================================================
// GESTIÓN DE TICKETS PARA EQUIPOS
// ===================================================================

router.get('/equipment/:equipmentId/tickets', authenticateToken, (req, res) => {
    const { equipmentId } = req.params;
    
    const sql = `
        SELECT DISTINCT t.id, t.title, t.description, t.status, t.priority, t.ticket_type, t.created_at, t.updated_at,
               c.name as client_name, l.name as location_name, 'individual' as source
        FROM Tickets t
        LEFT JOIN Clients c ON t.client_id = c.id
        LEFT JOIN Locations l ON t.location_id = l.id
        WHERE t.equipment_id = ?
        UNION
        SELECT DISTINCT t.id, t.title, t.description, t.status, t.priority, t.ticket_type, t.created_at, t.updated_at,
               c.name as client_name, l.name as location_name, 'gimnacion' as source
        FROM Tickets t
        INNER JOIN TicketEquipmentScope tes ON t.id = tes.ticket_id
        LEFT JOIN Clients c ON t.client_id = c.id
        LEFT JOIN Locations l ON t.location_id = l.id
        WHERE tes.equipment_id = ?
        ORDER BY created_at DESC
    `;
    
    db.all(sql, [equipmentId, equipmentId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al obtener tickets del equipo', code: 'TICKETS_FETCH_ERROR' });
        console.log(`🎫 Tickets encontrados para equipo ${equipmentId}:`, rows.length);
        res.json({ message: 'success', data: rows || [] });
    });
});

module.exports = router;
