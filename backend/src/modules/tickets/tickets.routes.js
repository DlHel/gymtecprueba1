/**
 * GYMTEC ERP - Módulo de Tickets
 * Extraído de server-clean.js para arquitectura modular
 */

const express = require('express');
const router = express.Router();
const db = require('../../db-adapter');
const sharp = require('sharp');
const { authenticateToken } = require('../../core/middleware/auth.middleware');
const ticketPartsRoutes = require('./ticket-parts.routes');

// Importar hook de notificaciones
let triggerNotificationProcessing;
try {
    const hooks = require('../../../notification-hooks');
    triggerNotificationProcessing = hooks.triggerNotificationProcessing;
} catch (e) {
    triggerNotificationProcessing = async () => {}; // No-op si no existe
    console.log('⚠️ notification-hooks no disponible, notificaciones deshabilitadas');
}

// ===================================================================
// CRUD PRINCIPAL DE TICKETS
// ===================================================================

// GET all tickets
router.get('/tickets', authenticateToken, (req, res) => {
    const { location_id } = req.query;
    
    let sql = `
        SELECT t.*, c.name as client_name, l.name as location_name,
               e.name as equipment_name, e.custom_id as equipment_custom_id
        FROM Tickets t
        LEFT JOIN Clients c ON t.client_id = c.id
        LEFT JOIN Equipment e ON t.equipment_id = e.id
        LEFT JOIN Locations l ON t.location_id = l.id
    `;
    
    const params = [];
    if (location_id) {
        sql += ` WHERE t.location_id = ?`;
        params.push(location_id);
    }
    sql += ` ORDER BY t.created_at DESC`;
    
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        res.json({ message: "success", data: rows });
    });
});

// GET a single ticket by id
router.get('/tickets/:id', authenticateToken, (req, res) => {
    const sql = `
        SELECT t.*, c.name as client_name, l.name as location_name,
               e.name as equipment_name, e.custom_id as equipment_custom_id
        FROM Tickets t
        LEFT JOIN Clients c ON t.client_id = c.id
        LEFT JOIN Equipment e ON t.equipment_id = e.id
        LEFT JOIN Locations l ON t.location_id = l.id
        WHERE t.id = ?
    `;
    
    db.get(sql, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ "error": err.message });
        if (!row) return res.status(404).json({ error: "Ticket no encontrado" });
        res.json({ message: "success", data: row });
    });
});

// GET detailed ticket information
router.get('/tickets/:id/detail', authenticateToken, (req, res) => {
    const ticketId = req.params.id;
    
    const ticketSql = `
        SELECT t.*, c.name as client_name, c.legal_name as client_legal_name,
               c.rut as client_rut, c.address as client_address, c.phone as client_phone, c.email as client_email,
               l.name as location_name, l.address as location_address,
               e.name as equipment_name, e.custom_id as equipment_custom_id,
               e.serial_number as equipment_serial, e.acquisition_date as equipment_installation,
               em.name as equipment_model_name, em.category as equipment_category, em.brand as equipment_brand,
               u.username as assigned_to_name
        FROM Tickets t
        LEFT JOIN Clients c ON t.client_id = c.id
        LEFT JOIN Locations l ON t.location_id = l.id
        LEFT JOIN Equipment e ON t.equipment_id = e.id
        LEFT JOIN EquipmentModels em ON e.model_id = em.id
        LEFT JOIN Users u ON t.assigned_technician_id = u.id
        WHERE t.id = ?
    `;
    
    db.get(ticketSql, [ticketId], (err, ticket) => {
        if (err) return res.status(500).json({ error: 'Error interno del servidor', code: 'TICKET_FETCH_ERROR' });
        if (!ticket) return res.status(404).json({ error: "Ticket no encontrado", code: 'TICKET_NOT_FOUND' });
        
        const photosSql = `SELECT * FROM TicketPhotos WHERE ticket_id = ? ORDER BY created_at DESC`;
        db.all(photosSql, [ticketId], (photoErr, photos) => {
            photos = photos || [];
            
            const notesSql = `SELECT * FROM TicketNotes WHERE ticket_id = ? ORDER BY created_at DESC`;
            db.all(notesSql, [ticketId], (notesErr, notes) => {
                notes = notes || [];
                
                const checklistSql = `
                    SELECT * FROM TicketChecklists
                    WHERE ticket_id = ?
                    ORDER BY order_index ASC, id ASC
                `;
                db.all(checklistSql, [ticketId], (checklistErr, checklist) => {
                    checklist = checklist || [];
                    
                    const detailedTicket = {
                        ...ticket,
                        photos, notes, checklist,
                        activities: [],
                        metadata: {
                            photos_count: photos.length,
                            notes_count: notes.length,
                            checklist_count: checklist.length,
                            activities_count: 0,
                            last_updated: ticket.updated_at,
                            created_date: ticket.created_at
                        }
                    };
                    
                    return res.json({ success: true, message: "success", data: detailedTicket });
                });
            });
        });
    });
});

// POST new ticket
router.post('/tickets', authenticateToken, (req, res) => {
    const { client_id, location_id, equipment_id, title, description, priority, due_date } = req.body;

    if (!title || !client_id || !priority) {
        return res.status(400).json({ error: "Título, Cliente y Prioridad son campos obligatorios." });
    }

    const sql = `INSERT INTO Tickets (client_id, location_id, equipment_id, title, description, priority, due_date, status, ticket_type, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
    const params = [client_id, location_id || null, equipment_id || null, title, description, priority, due_date || null, 'Abierto', 'individual'];
    
    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ "error": err.message });
        
        const ticketId = this.lastID;
        triggerNotificationProcessing('create', ticketId).catch(() => {});
        
        res.status(201).json({ message: "success", data: { id: ticketId, ...req.body, status: 'Abierto' } });
    });
});

// PUT (update) a ticket
router.put('/tickets/:id', authenticateToken, (req, res) => {
    const { client_id, location_id, equipment_id, title, description, status, priority, due_date } = req.body;
    
    if (!title || !client_id || !priority || !status) {
        return res.status(400).json({ error: "Título, Cliente, Prioridad y Estado son campos obligatorios." });
    }

    const sql = `UPDATE Tickets SET client_id = ?, location_id = ?, equipment_id = ?, title = ?, description = ?, status = ?, priority = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    const params = [client_id, location_id, equipment_id, title, description, status, priority, due_date, req.params.id];

    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ "error": err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Ticket no encontrado." });
        
        triggerNotificationProcessing('update', req.params.id).catch(() => {});
        res.json({ message: "success", changes: this.changes });
    });
});

// DELETE a ticket
router.delete('/tickets/:id', authenticateToken, (req, res) => {
    const sql = 'DELETE FROM Tickets WHERE id = ?';
    db.run(sql, [req.params.id], function(err) {
        if (err) return res.status(500).json({ "error": err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Ticket no encontrado." });
        res.json({ "message": "deleted", changes: this.changes });
    });
});

// GET equipment scope for gimnación ticket
router.get('/tickets/:id/equipment-scope', authenticateToken, (req, res) => {
    const sql = `
        SELECT tes.id, tes.equipment_id, e.name as equipment_name, e.custom_id,
               em.name as model_name, em.category, em.brand, tes.is_included, tes.exclusion_reason
        FROM TicketEquipmentScope tes
        INNER JOIN Equipment e ON tes.equipment_id = e.id
        INNER JOIN EquipmentModels em ON e.model_id = em.id
        WHERE tes.ticket_id = ?
        ORDER BY em.category, em.name, em.brand
    `;
    
    db.all(sql, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "success", data: rows || [] });
    });
});

// ===================================================================
// NOTAS DE TICKETS
// ===================================================================

router.get('/tickets/:ticketId/notes', authenticateToken, (req, res) => {
    const sql = `SELECT * FROM TicketNotes WHERE ticket_id = ? ORDER BY created_at DESC`;
    db.all(sql, [req.params.ticketId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al obtener notas del ticket' });
        res.json({ message: "success", data: rows || [] });
    });
});

router.post('/tickets/:ticketId/notes', authenticateToken, (req, res) => {
    const { ticketId } = req.params;
    const { note, note_type, author, is_internal } = req.body;
    
    if (!note || note.trim() === '') {
        return res.status(400).json({ error: "La nota no puede estar vacía", code: 'NOTE_REQUIRED' });
    }
    
    const sql = `INSERT INTO ticketnotes (ticket_id, note, note_type, author, is_internal, created_at) VALUES (?, ?, ?, ?, ?, NOW())`;
    const params = [parseInt(ticketId, 10), note.trim(), note_type || 'General', author || (req.user ? req.user.username : 'Sistema'), is_internal || false];
    
    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: 'Error al agregar nota al ticket', code: 'NOTE_INSERT_ERROR' });
        
        db.get('SELECT * FROM TicketNotes WHERE id = ?', [this.lastID], (err, newNote) => {
            if (err) return res.status(500).json({ error: 'Error al obtener nota creada', code: 'NOTE_RETRIEVE_ERROR' });
            res.status(201).json({ message: "Nota agregada exitosamente", data: newNote });
        });
    });
});

router.delete('/tickets/notes/:noteId', authenticateToken, (req, res) => {
    const sql = 'DELETE FROM TicketNotes WHERE id = ?';
    db.run(sql, [req.params.noteId], function(err) {
        if (err) return res.status(500).json({ error: 'Error al eliminar nota del ticket', code: 'NOTE_DELETE_ERROR' });
        if (this.changes === 0) return res.status(404).json({ error: "Nota no encontrada", code: 'NOTE_NOT_FOUND' });
        res.json({ message: "Nota eliminada exitosamente", changes: this.changes });
    });
});

// ===================================================================
// FOTOS DE TICKETS
// ===================================================================

router.get('/tickets/:ticketId/photos', authenticateToken, (req, res) => {
    const sql = `SELECT * FROM TicketPhotos WHERE ticket_id = ? ORDER BY created_at DESC`;
    db.all(sql, [req.params.ticketId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al obtener fotos del ticket' });
        res.json({ message: "success", data: rows || [] });
    });
});

router.post('/tickets/:ticketId/photos', authenticateToken, async (req, res) => {
    const { ticketId } = req.params;
    const { photo_data, file_size, description, photo_type } = req.body;
    let { file_name, mime_type } = req.body;

    if (!photo_data || !mime_type) {
        return res.status(400).json({
            error: 'photo_data y mime_type son requeridos',
            code: 'PHOTO_DATA_REQUIRED'
        });
    }

    const maxSize = 10 * 1024 * 1024;
    if (photo_data.length > maxSize) {
        return res.status(400).json({
            error: 'La imagen es demasiado grande (máximo 10MB)',
            code: 'FILE_TOO_LARGE'
        });
    }

    try {
        let processedPhotoData = photo_data;
        let processedSize = file_size;

        try {
            if (photo_data.includes('base64,')) {
                const base64Data = photo_data.split(';base64,').pop();
                const imgBuffer = Buffer.from(base64Data, 'base64');
                const compressedBuffer = await sharp(imgBuffer)
                    .resize(1280, 1280, {
                        fit: 'inside',
                        withoutEnlargement: true
                    })
                    .jpeg({ quality: 80, mozjpeg: true })
                    .toBuffer();

                processedPhotoData = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
                processedSize = compressedBuffer.length;
                mime_type = 'image/jpeg';

                if (file_name && !file_name.toLowerCase().endsWith('.jpg') && !file_name.toLowerCase().endsWith('.jpeg')) {
                    file_name = `${file_name.split('.')[0]}.jpg`;
                }
            }
        } catch (compressionError) {
            console.warn('⚠️ No se pudo comprimir la foto del ticket, se guardará original:', compressionError.message);
        }

        const result = await db.runAsync(
            `INSERT INTO TicketPhotos
             (ticket_id, photo_data, file_name, mime_type, file_size, description, photo_type, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                parseInt(ticketId, 10),
                processedPhotoData,
                file_name || 'foto.jpg',
                mime_type,
                processedSize || 0,
                description || null,
                photo_type || 'Otros'
            ]
        );

        const newPhoto = await db.getAsync(
            'SELECT id, ticket_id, file_name, mime_type, file_size, description, photo_type, created_at FROM TicketPhotos WHERE id = ?',
            [result.lastID]
        );

        if (!newPhoto) {
            return res.status(500).json({
                error: 'Error al obtener foto creada',
                code: 'PHOTO_RETRIEVE_ERROR'
            });
        }

        return res.status(201).json({
            message: 'Foto agregada exitosamente',
            data: newPhoto
        });
    } catch (error) {
        console.error('❌ Error procesando foto del ticket:', error);
        return res.status(500).json({
            error: `Error al procesar la foto: ${error.message}`,
            code: 'PHOTO_PROCESSING_ERROR'
        });
    }
});

router.delete('/tickets/photos/:photoId', authenticateToken, (req, res) => {
    const sql = 'DELETE FROM TicketPhotos WHERE id = ?';
    db.run(sql, [req.params.photoId], function(err) {
        if (err) return res.status(500).json({ error: 'Error al eliminar foto del ticket' });
        if (this.changes === 0) return res.status(404).json({ error: "Foto no encontrada" });
        res.json({ message: "Foto eliminada exitosamente", changes: this.changes });
    });
});

router.use(ticketPartsRoutes);

module.exports = router;
