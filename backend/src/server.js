const express = require('express');
const cors = require('cors');
const db = require('./database');
const path = require('path');
const { validateClient, validateLocation, validateEquipment, validateClientUpdate, validateLocationUpdate, validateEquipmentUpdate } = require('./validators');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la carpeta 'frontend'
app.use(express.static(path.join(__dirname, '../../frontend')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// --- API Routes for Clients ---
// GET all clients with location count
app.get('/api/clients', (req, res) => {
    db.all(`
        SELECT c.*, COUNT(l.id) as location_count
        FROM Clients c
        LEFT JOIN Locations l ON c.id = l.client_id
        GROUP BY c.id
        ORDER BY c.name
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// GET a single client by id
app.get("/api/clients/:id", (req, res) => {
    const sql = "select * from Clients where id = ?"
    const params = [req.params.id]
    db.get(sql, params, (err, row) => {
        if (err) {
          res.status(400).json({"error":err.message});
          return;
        }
        res.json(row);
      });
});

// POST new client
app.post('/api/clients', (req, res) => {
    const { name, legal_name, rut, address, phone, email, business_activity, contact_name } = req.body;
    
    // Validar datos del cliente
    const validation = validateClient(req.body);
    if (!validation.isValid) {
        res.status(400).json({
            "error": "Datos de cliente inválidos",
            "details": validation.errors
        });
        return;
    }
    const sql = 'INSERT INTO Clients (name, legal_name, rut, address, phone, email, business_activity, contact_name) VALUES (?,?,?,?,?,?,?,?)';
    const params = [name, legal_name, rut, address, phone, email, business_activity, contact_name];
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        res.status(201).json({ id: this.lastID, ...req.body });
    });
});

// PUT (update) a client
app.put("/api/clients/:id", (req, res) => {
    const { name, legal_name, rut, address, phone, email, business_activity, contact_name } = req.body;
    
    // Validar datos del cliente (para actualizaciones, los campos obligatorios pueden estar vacíos)
    const validation = validateClientUpdate(req.body);
    if (!validation.isValid) {
        res.status(400).json({
            "error": "Datos de cliente inválidos",
            "details": validation.errors
        });
        return;
    }
    const sql = `UPDATE Clients set 
                 name = COALESCE(?,name),
                 legal_name = COALESCE(?,legal_name),
                 rut = COALESCE(?,rut),
                 address = COALESCE(?,address),
                 phone = COALESCE(?,phone),
                 email = COALESCE(?,email),
                 business_activity = COALESCE(?,business_activity),
                 contact_name = COALESCE(?,contact_name)
                 WHERE id = ?`;
    const params = [name, legal_name, rut, address, phone, email, business_activity, contact_name, req.params.id];
    db.run(sql, params, function (err, result) {
            if (err){
                res.status(400).json({"error": err.message})
                return;
            }
            res.json({
                message: "success",
                data: req.body,
                changes: this.changes
            })
    });
});

// DELETE a client
app.delete("/api/clients/:id", (req, res) => {
    const sql = 'DELETE FROM Clients WHERE id = ?';
    const params = [req.params.id];
    db.run(sql, params, function (err, result) {
        if (err){
            res.status(400).json({"error": err.message})
            return;
        }
        res.json({"message":"deleted", changes: this.changes})
    });
});


// --- API Routes for Locations (Sedes) ---
// GET all locations for a specific client with equipment summary
app.get('/api/clients/:clientId/locations', (req, res) => {
    const { clientId } = req.params;
    db.all(`
        SELECT 
            l.*,
            (SELECT GROUP_CONCAT(e.type || ' (' || type_count || ')', '; ') 
             FROM (
                SELECT type, COUNT(*) as type_count 
                FROM Equipment 
                WHERE location_id = l.id 
                GROUP BY type
             ) e
            ) as equipment_summary
        FROM Locations l
        WHERE l.client_id = ?
        ORDER BY l.name
    `, [clientId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// GET a single location by id
app.get("/api/locations/:id", (req, res) => {
    const sql = "SELECT * FROM Locations WHERE id = ?"
    const params = [req.params.id]
    db.get(sql, params, (err, row) => {
        if (err) {
          res.status(400).json({"error":err.message});
          return;
        }
        res.json(row);
      });
});

// POST new location for a client
app.post('/api/locations', (req, res) => {
    const { name, address, client_id } = req.body;
    
    // Validar datos de la ubicación
    const validation = validateLocation(req.body);
    if (!validation.isValid) {
        res.status(400).json({
            "error": "Datos de ubicación inválidos",
            "details": validation.errors
        });
        return;
    }
    const sql = 'INSERT INTO Locations (name, address, client_id) VALUES (?,?,?)';
    const params = [name, address, client_id];
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        res.status(201).json({ id: this.lastID, ...req.body });
    });
});

// PUT (update) a location
app.put("/api/locations/:id", (req, res) => {
    const { name, address } = req.body;
    
    // Validar datos de la ubicación
    const validation = validateLocationUpdate(req.body);
    if (!validation.isValid) {
        res.status(400).json({
            "error": "Datos de ubicación inválidos",
            "details": validation.errors
        });
        return;
    }
    const sql = `UPDATE Locations set 
                 name = COALESCE(?,name), 
                 address = COALESCE(?,address)
                 WHERE id = ?`;
    const params = [name, address, req.params.id];
    db.run(sql, params, function (err, result) {
            if (err){
                res.status(400).json({"error": err.message})
                return;
            }
            res.json({
                message: "success",
                data: req.body,
                changes: this.changes
            })
    });
});

// DELETE a location
app.delete("/api/locations/:id", (req, res) => {
    // We should also delete equipment in this location, but for now we'll just delete the location.
    // This can be improved with cascading deletes in the DB schema.
    const sql = 'DELETE FROM Locations WHERE id = ?';
    const params = [req.params.id];
    db.run(sql, params, function (err, result) {
        if (err){
            res.status(400).json({"error": err.message})
            return;
        }
        res.json({"message":"deleted", changes: this.changes})
    });
});


// --- API Routes for Equipment ---
// GET equipment for a specific location
app.get('/api/locations/:locationId/equipment', (req, res) => {
    const { locationId } = req.params;
    const sql = "SELECT * FROM Equipment WHERE location_id = ?";
    db.all(sql, [locationId], (err, rows) => {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        res.json(rows);
    });
});

// GET ticket history for a specific piece of equipment
app.get('/api/equipment/:id/tickets', (req, res) => {
    const sql = `
        SELECT * 
        FROM Tickets 
        WHERE equipment_id = ? 
        ORDER BY created_at DESC
    `;
    db.all(sql, [req.params.id], (err, rows) => {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        res.json(rows);
    });
});

// GET a single piece of equipment by id
app.get("/api/equipment/:id", (req, res) => {
    const equipmentId = req.params.id;

    const getEquipmentSql = `
        SELECT e.*, l.client_id
        FROM Equipment e
        JOIN Locations l ON e.location_id = l.id
        WHERE e.id = ?
    `;

    db.get(getEquipmentSql, [equipmentId], (err, row) => {
        if (err) {
            return res.status(400).json({ "error": err.message });
        }
        if (!row) {
            return res.status(404).json({ "error": "Equipo no encontrado" });
        }

        // Si no tiene custom_id, generarlo, guardarlo y devolverlo
        if (!row.custom_id) {
            const typePrefix = (row.type || 'UNK').substring(0, 4).toUpperCase();
            
            const countSql = `SELECT COUNT(*) as count FROM Equipment WHERE location_id IN (SELECT id FROM Locations WHERE client_id = ?)`;
            db.get(countSql, [row.client_id], (err, result) => {
                if (err) {
                    return res.status(500).json({ "error": "Error al contar equipos: " + err.message });
                }

                const newCount = result.count; // No sumamos 1 porque este equipo ya existe
                const customId = `${row.client_id}-${typePrefix}-${String(newCount).padStart(4, '0')}`;

                const updateSql = `UPDATE Equipment SET custom_id = ? WHERE id = ?`;
                db.run(updateSql, [customId, equipmentId], function(err) {
                    if (err) {
                        return res.status(500).json({ "error": "Error al guardar custom_id: " + err.message });
                    }
                    // Devolver el equipo con el nuevo ID
                    res.json({ ...row, custom_id: customId });
                });
            });
        } else {
            // Si ya tiene, devolverlo directamente
            res.json(row);
        }
    });
});

// POST new equipment for a location
app.post('/api/equipment', (req, res) => {
    const { name, type, brand, model, serial_number, location_id, acquisition_date, notes } = req.body;
    
    // Validar datos del equipo
    const validation = validateEquipment(req.body);
    if (!validation.isValid) {
        return res.status(400).json({
            "error": "Datos de equipo inválidos",
            "details": validation.errors
        });
    }

    // 1. Obtener el client_id a partir del location_id
    db.get("SELECT client_id FROM Locations WHERE id = ?", [location_id], (err, location) => {
        if (err || !location) {
            return res.status(500).json({ "error": "No se pudo encontrar el cliente para la sede." });
        }
        const clientId = location.client_id;
        const typePrefix = (type || 'UNK').substring(0, 4).toUpperCase();

        // 2. Contar cuántos equipos tiene el cliente para generar el secuencial
        const countSql = `SELECT COUNT(*) as count FROM Equipment WHERE location_id IN (SELECT id FROM Locations WHERE client_id = ?)`;
        db.get(countSql, [clientId], (err, result) => {
            if (err) {
                return res.status(500).json({ "error": "Error al contar equipos: " + err.message });
            }
            
            const newCount = result.count + 1;
            const customId = `${clientId}-${typePrefix}-${String(newCount).padStart(4, '0')}`;

            // 3. Insertar el nuevo equipo con el custom_id generado
            const insertSql = `INSERT INTO Equipment (location_id, custom_id, type, name, brand, model, serial_number, acquisition_date, notes) 
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const params = [location_id, customId, type, name, brand, model, serial_number, acquisition_date, notes];

            db.run(insertSql, params, function(err) {
                if (err) {
                    return res.status(400).json({ "error": err.message });
                }
                res.status(201).json({ id: this.lastID, custom_id: customId, ...req.body });
            });
        });
    });
});

// PUT (update) a piece of equipment
app.put("/api/equipment/:id", (req, res) => {
    const { name, type, brand, model, serial_number, acquisition_date, last_maintenance_date, notes } = req.body;
    
    // Validar datos del equipo
    const validation = validateEquipmentUpdate(req.body);
    if (!validation.isValid) {
        return res.status(400).json({
            "error": "Datos de equipo inválidos",
            "details": validation.errors
        });
    }
    const sql = `UPDATE Equipment set 
                 name = COALESCE(?,name), 
                 type = COALESCE(?,type),
                 brand = COALESCE(?,brand),
                 model = COALESCE(?,model),
                 serial_number = COALESCE(?,serial_number),
                 acquisition_date = COALESCE(?,acquisition_date),
                 last_maintenance_date = COALESCE(?,last_maintenance_date),
                 notes = COALESCE(?,notes)
                 WHERE id = ?`;
    const params = [name, type, brand, model, serial_number, acquisition_date, last_maintenance_date, notes, req.params.id];
    db.run(sql, params, function (err, result) {
            if (err){
                res.status(400).json({"error": err.message})
                return;
            }
            res.json({
                message: "success",
                data: req.body,
                changes: this.changes
            })
    });
});

// DELETE a piece of equipment
app.delete("/api/equipment/:id", (req, res) => {
    const sql = 'DELETE FROM Equipment WHERE id = ?';
    const params = [req.params.id];
    db.run(sql, params, function (err, result) {
        if (err){
            res.status(400).json({"error": err.message})
            return;
        }
        res.json({"message":"deleted", changes: this.changes})
    });
});


// --- API Routes for Spare Parts (Inventory) ---

// GET all spare parts
app.get('/api/inventory', (req, res) => {
    const sql = "SELECT * FROM SpareParts ORDER BY name";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        res.json({
            "message":"success",
            "data":rows
        });
    });
});

// POST new spare part
app.post('/api/inventory', (req, res) => {
    const { name, sku, current_stock, minimum_stock } = req.body;
    if (!name) {
        return res.status(400).json({"error": "El campo 'name' es obligatorio."});
    }
    const sql = 'INSERT INTO SpareParts (name, sku, current_stock, minimum_stock) VALUES (?,?,?,?)';
    const params = [name, sku, current_stock, minimum_stock];
    db.run(sql, params, function(err) {
        if (err) {
            return res.status(400).json({"error":err.message});
        }
        res.status(201).json({
            "message": "success",
            "data": { id: this.lastID, ...req.body }
        });
    });
});

// PUT (update) a spare part
app.put("/api/inventory/:id", (req, res) => {
    const { name, sku, current_stock, minimum_stock } = req.body;
    const sql = `UPDATE SpareParts set 
                 name = COALESCE(?,name), 
                 sku = COALESCE(?,sku),
                 current_stock = COALESCE(?,current_stock),
                 minimum_stock = COALESCE(?,minimum_stock)
                 WHERE id = ?`;
    const params = [name, sku, current_stock, minimum_stock, req.params.id];
    db.run(sql, params, function (err, result) {
        if (err){
            return res.status(400).json({"error": err.message});
        }
        res.json({
            message: "success",
            data: req.body,
            changes: this.changes
        });
    });
});

// DELETE a spare part
app.delete("/api/inventory/:id", (req, res) => {
    const sql = 'DELETE FROM SpareParts WHERE id = ?';
    const params = [req.params.id];
    db.run(sql, params, function (err, result) {
        if (err){
            return res.status(400).json({"error": err.message});
        }
        res.json({"message":"deleted", changes: this.changes});
    });
});


// --- API Routes for Equipment Models ---

// GET all equipment models
app.get('/api/models', (req, res) => {
    let sql = 'SELECT * FROM EquipmentModels';
    const params = [];
    
    // Filtros opcionales
    if (req.query.category) {
        sql += ' WHERE category = ?';
        params.push(req.query.category);
    }
    
    if (req.query.brand) {
        if (params.length > 0) {
            sql += ' AND brand = ?';
        } else {
            sql += ' WHERE brand = ?';
        }
        params.push(req.query.brand);
    }
    
    sql += ' ORDER BY brand, name';
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// GET a single equipment model by id
app.get('/api/models/:id', (req, res) => {
    const sql = 'SELECT * FROM EquipmentModels WHERE id = ?';
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Modelo no encontrado' });
            return;
        }
        res.json(row);
    });
});

// POST new equipment model
app.post('/api/models', (req, res) => {
    const { name, brand, category, model_code, description, weight, dimensions, voltage, power, specifications } = req.body;
    
    if (!name || !brand || !category) {
        return res.status(400).json({ error: "Campos requeridos: name, brand, category" });
    }
    
    const sql = `INSERT INTO EquipmentModels 
                 (name, brand, category, model_code, description, weight, dimensions, voltage, power, specifications, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
    const params = [name, brand, category, model_code, description, weight, dimensions, voltage, power, specifications];
    
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.status(201).json({ 
            id: this.lastID, 
            name, brand, category, model_code, description, weight, dimensions, voltage, power, specifications,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    });
});

// PUT (update) an equipment model
app.put('/api/models/:id', (req, res) => {
    const { name, brand, category, model_code, description, weight, dimensions, voltage, power, specifications } = req.body;
    
    const sql = `UPDATE EquipmentModels SET 
                 name = COALESCE(?, name),
                 brand = COALESCE(?, brand),
                 category = COALESCE(?, category),
                 model_code = COALESCE(?, model_code),
                 description = COALESCE(?, description),
                 weight = COALESCE(?, weight),
                 dimensions = COALESCE(?, dimensions),
                 voltage = COALESCE(?, voltage),
                 power = COALESCE(?, power),
                 specifications = COALESCE(?, specifications),
                 updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`;
    const params = [name, brand, category, model_code, description, weight, dimensions, voltage, power, specifications, req.params.id];
    
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Modelo no encontrado' });
            return;
        }
        res.json({ 
            message: "Modelo actualizado exitosamente", 
            changes: this.changes 
        });
    });
});

// DELETE an equipment model
app.delete('/api/models/:id', (req, res) => {
    const sql = 'DELETE FROM EquipmentModels WHERE id = ?';
    db.run(sql, [req.params.id], function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Modelo no encontrado' });
            return;
        }
        res.json({ 
            message: "Modelo eliminado exitosamente", 
            changes: this.changes 
        });
    });
});


// --- API Routes for Tickets ---

// GET all tickets
app.get('/api/tickets', (req, res) => {
    let sql = `
        SELECT 
            t.*, 
            c.name as client_name 
        FROM Tickets t
        LEFT JOIN Clients c ON t.client_id = c.id
    `;
    const params = [];
    
    if (req.query.location_id) {
        sql += " WHERE t.location_id = ?";
        params.push(req.query.location_id);
    }

    sql += " ORDER BY t.created_at DESC";

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        res.json({ message: "success", data: rows });
    });
});

// GET a single ticket by id
app.get("/api/tickets/:id", (req, res) => {
    const sql = "SELECT * FROM Tickets WHERE id = ?";
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
          res.status(400).json({"error":err.message});
          return;
        }
        res.json({ message:"success", data:row });
    });
});

// POST new ticket
app.post('/api/tickets', (req, res) => {
    const { title, description, status, priority, client_id, location_id, equipment_id, assigned_technician_id, due_date } = req.body;
    if (!title || !client_id) {
        return res.status(400).json({"error": "Missing required fields: title, client_id"});
    }
    const sql = `INSERT INTO Tickets (title, description, status, priority, client_id, location_id, equipment_id, assigned_technician_id, due_date) VALUES (?,?,?,?,?,?,?,?,?)`;
    const params = [title, description, status, priority, client_id, location_id, equipment_id, assigned_technician_id, due_date];
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        res.status(201).json({ message: "success", data: { id: this.lastID, ...req.body } });
    });
});

// PUT (update) a ticket
app.put("/api/tickets/:id", (req, res) => {
    const { title, description, status, priority, client_id, location_id, equipment_id, assigned_technician_id, due_date } = req.body;
    const sql = `UPDATE Tickets set 
                 title = COALESCE(?,title), 
                 description = COALESCE(?,description), 
                 status = COALESCE(?,status), 
                 priority = COALESCE(?,priority), 
                 client_id = COALESCE(?,client_id), 
                 location_id = COALESCE(?,location_id), 
                 equipment_id = COALESCE(?,equipment_id),
                 assigned_technician_id = COALESCE(?, assigned_technician_id),
                 due_date = COALESCE(?, due_date),
                 updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`;
    const params = [title, description, status, priority, client_id, location_id, equipment_id, assigned_technician_id, due_date, req.params.id];
    db.run(sql, params, function (err, result) {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        res.json({ message: "success", data: req.body, changes: this.changes });
    });
});

// DELETE a ticket
app.delete("/api/tickets/:id", (req, res) => {
    const sql = 'DELETE FROM Tickets WHERE id = ?';
    db.run(sql, [req.params.id], function (err) {
        if (err){
            res.status(400).json({"error": err.message});
            return;
        }
        res.json({ message:"deleted", changes: this.changes });
    });
});


// --- API Routes for Equipment Notes ---

// GET all notes for a specific equipment
app.get('/api/equipment/:equipmentId/notes', (req, res) => {
    const { equipmentId } = req.params;
    const sql = `
        SELECT * FROM EquipmentNotes 
        WHERE equipment_id = ? 
        ORDER BY created_at DESC
    `;
    db.all(sql, [equipmentId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// POST new note for equipment
app.post('/api/equipment/:equipmentId/notes', (req, res) => {
    const { equipmentId } = req.params;
    const { note, author } = req.body;
    
    if (!note || note.trim() === '') {
        return res.status(400).json({ error: "La nota no puede estar vacía" });
    }
    
    const sql = 'INSERT INTO EquipmentNotes (equipment_id, note, author) VALUES (?, ?, ?)';
    const params = [equipmentId, note.trim(), author || 'Sistema'];
    
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        
        // Devolver la nota creada
        const selectSql = 'SELECT * FROM EquipmentNotes WHERE id = ?';
        db.get(selectSql, [this.lastID], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.status(201).json(row);
        });
    });
});

// DELETE a note
app.delete('/api/equipment/notes/:noteId', (req, res) => {
    const { noteId } = req.params;
    const sql = 'DELETE FROM EquipmentNotes WHERE id = ?';
    
    db.run(sql, [noteId], function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: "Nota eliminada", changes: this.changes });
    });
});


// --- Server ---
app.listen(port, () => {
    console.log(`Gymtec ERP backend listening at http://localhost:${port}`);
}); 