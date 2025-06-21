require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db-adapter');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { validateClient, validateLocation, validateEquipment, validateClientUpdate, validateLocationUpdate, validateEquipmentUpdate } = require('./validators');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Aumentar límite para payloads grandes
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configuración para subida de archivos
const uploadsDir = path.join(__dirname, '../../uploads');
const modelsDir = path.join(uploadsDir, 'models');

// Crear directorios si no existen
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
}

// Configurar multer para subida de fotos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, modelsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, 'model-' + uniqueSuffix + extension);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB límite
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedMimeTypes.includes(file.mimetype.toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes reales (JPEG, JPG, PNG, GIF, WebP) - no SVG'));
        }
    }
});

// Configuración de multer para subida de manuales
const uploadManuals = multer({
    storage: multer.memoryStorage(), // Usar memoria para procesar directamente
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB límite para manuales
    },
    fileFilter: function (req, file, cb) {
        const allowedMimeTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const mimetype = allowedMimeTypes.includes(file.mimetype.toLowerCase());
        
        if (mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF, DOC y DOCX'));
        }
    }
});

// Servir archivos estáticos desde la carpeta 'frontend'
app.use(express.static(path.join(__dirname, '../../frontend')));

// Servir archivos de uploads
app.use('/uploads', express.static(uploadsDir));

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
        res.json({ message: "success", data: rows });
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
            if (err.message.includes('UNIQUE constraint failed: Clients.rut')) {
                return res.status(409).json({ "error": "El RUT ingresado ya se encuentra registrado en el sistema." });
            }
            return res.status(400).json({"error":err.message});
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
// GET all locations
app.get('/api/locations', (req, res) => {
    db.all(`
        SELECT 
            l.*,
            c.name as client_name,
            COUNT(e.id) as equipment_count
        FROM Locations l
        LEFT JOIN Clients c ON l.client_id = c.id
        LEFT JOIN Equipment e ON l.id = e.location_id
        GROUP BY l.id, l.name, l.address, l.client_id, c.name
        ORDER BY c.name, l.name
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// GET all locations for a specific client with equipment summary
app.get('/api/clients/:clientId/locations', (req, res) => {
    const { clientId } = req.params;
    
    // Consulta simplificada compatible con MySQL
    db.all(`
        SELECT 
            l.id,
            l.name,
            l.address,
            l.client_id,
            l.created_at,
            l.updated_at,
            COUNT(e.id) as equipment_count
        FROM Locations l
        LEFT JOIN Equipment e ON l.id = e.location_id
        WHERE l.client_id = ?
        GROUP BY l.id, l.name, l.address, l.client_id, l.created_at, l.updated_at
        ORDER BY l.name
    `, [clientId], (err, rows) => {
        if (err) {
            console.error('❌ Error en consulta de ubicaciones:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "success", data: rows });
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
// GET all equipment
app.get('/api/equipment', (req, res) => {
    db.all(`
        SELECT 
            e.*,
            l.name as location_name,
            c.name as client_name,
            em.name as model_name,
            em.brand as model_brand
        FROM Equipment e
        LEFT JOIN Locations l ON e.location_id = l.id
        LEFT JOIN Clients c ON l.client_id = c.id
        LEFT JOIN EquipmentModels em ON e.model_id = em.id
        ORDER BY c.name, l.name, e.name
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// GET equipment for a specific location
app.get('/api/locations/:locationId/equipment', (req, res) => {
    const { locationId } = req.params;
    const sql = `
        SELECT 
            e.*,
            em.name as model_name,
            em.brand as model_brand
        FROM Equipment e
        LEFT JOIN EquipmentModels em ON e.model_id = em.id
        WHERE e.location_id = ?
        ORDER BY e.type, e.name
    `;
    db.all(sql, [locationId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
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
        SELECT e.*, l.client_id, em.name as model_name, em.brand as model_brand
        FROM Equipment e
        JOIN Locations l ON e.location_id = l.id
        LEFT JOIN EquipmentModels em ON e.model_id = em.id
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
        if (err) {
            return res.status(500).json({ "error": "Error en consulta de ubicación: " + err.message });
        }
        if (!location) {
            return res.status(500).json({ "error": "No se encontró la ubicación con ID: " + location_id });
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
            const customId = `CLI${String(clientId).padStart(3, '0')}-${typePrefix}-${String(newCount).padStart(4, '0')}`;

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

// --- API Routes for Model Photos ---

// GET photos for a model
app.get('/api/models/:id/photos', (req, res) => {
    const modelId = req.params.id;
    const sql = `SELECT * FROM ModelPhotos WHERE model_id = ? ORDER BY created_at ASC`;
    
    db.all(sql, [modelId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const photos = rows.map(row => ({
            id: row.id,
            filename: row.file_name,
            originalName: row.file_name,
            size: row.file_size,
            uploadDate: row.created_at,
            isPrimary: row.is_primary,
            url: row.photo_data // Usar el data URL directamente desde la BD
        }));
        
        res.json(photos);
    });
});

// POST upload photos for a model
app.post('/api/models/:id/photos', upload.array('photos', 10), (req, res) => {
    const modelId = req.params.id;
    console.log('Photo upload request for model:', modelId);
    console.log('Files received:', req.files ? req.files.length : 0);
    
    if (!req.files || req.files.length === 0) {
        console.log('No files uploaded');
        return res.status(400).json({ error: 'No se subieron archivos' });
    }
    
    // Verificar que el modelo existe
    db.get('SELECT id FROM EquipmentModels WHERE id = ?', [modelId], (err, model) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!model) {
            // Eliminar archivos subidos si el modelo no existe
            req.files.forEach(file => {
                fs.unlink(file.path, () => {});
            });
            return res.status(404).json({ error: 'Modelo no encontrado' });
        }
        
        // Guardar información de fotos en la base de datos
        const insertPromises = req.files.map(file => {
            return new Promise((resolve, reject) => {
                // Leer el archivo y convertirlo a base64
                const fs = require('fs');
                const fileData = fs.readFileSync(file.path);
                const base64Data = fileData.toString('base64');
                const photoData = `data:${file.mimetype};base64,${base64Data}`;
                
                const sql = `INSERT INTO ModelPhotos (model_id, photo_data, file_name, mime_type, file_size, is_primary) VALUES (?, ?, ?, ?, ?, ?)`;
                db.run(sql, [modelId, photoData, file.filename, file.mimetype, file.size, false], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        // Eliminar archivo temporal después de guardarlo en BD
                        fs.unlink(file.path, (unlinkErr) => {
                            if (unlinkErr) console.error('Error eliminando archivo temporal:', unlinkErr);
                        });
                        
                        resolve({
                            id: this.lastID,
                            filename: file.filename,
                            originalName: file.originalname,
                            size: file.size,
                            url: photoData // Devolver el data URL directamente
                        });
                    }
                });
            });
        });
        
        // Esperar a que todas las fotos se guarden en BD
        Promise.all(insertPromises)
            .then(photos => {
                console.log('✅ Fotos guardadas en BD:', photos.length);
                res.json({
                    message: 'Fotos subidas exitosamente',
                    photos: photos
                });
            })
            .catch(err => {
                console.error('❌ Error guardando fotos en BD:', err);
                // Eliminar archivos si hay error en BD
                req.files.forEach(file => {
                    fs.unlink(file.path, () => {});
                });
                res.status(500).json({ error: 'Error guardando fotos en base de datos' });
            });
    });
});

// DELETE a photo by ID
app.delete('/api/models/photos/:photoId', (req, res) => {
    const photoId = req.params.photoId;
    
    console.log('🗑️ Eliminando foto ID:', photoId, 'Tipo:', typeof photoId);
    
    // Primero verificar que la foto existe
    db.get('SELECT id, model_id, file_name FROM ModelPhotos WHERE id = ?', [photoId], (err, row) => {
        if (err) {
            console.error('❌ Error consultando foto:', err);
            return res.status(500).json({ error: 'Error consultando base de datos' });
        }
        
        if (!row) {
            console.log('❌ Foto no encontrada con ID:', photoId);
            // Listar todas las fotos para debug
            db.all('SELECT id, model_id, file_name FROM ModelPhotos LIMIT 10', [], (err, allPhotos) => {
                if (!err) {
                    console.log('📸 Fotos disponibles:', allPhotos.map(p => `ID:${p.id}(${typeof p.id})`));
                }
            });
            return res.status(404).json({ error: 'Foto no encontrada en base de datos' });
        }
        
        console.log('✅ Foto encontrada:', row);
        
        // Ahora eliminar la foto
        db.run('DELETE FROM ModelPhotos WHERE id = ?', [photoId], function(err) {
            if (err) {
                console.error('❌ Error eliminando foto:', err);
                return res.status(500).json({ error: 'Error eliminando de base de datos' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Foto no encontrada en base de datos' });
            }
            
            console.log('✅ Foto eliminada exitosamente, ID:', photoId, 'Cambios:', this.changes);
            res.json({ message: 'Foto eliminada exitosamente' });
        });
    });
});

// DELETE a photo by filename (mantener compatibilidad)
app.delete('/api/models/photos/file/:filename', (req, res) => {
    const filename = req.params.filename;
    
    console.log('🗑️ Eliminando foto por filename:', filename);
    
    // Eliminar de la base de datos (no hay archivos físicos que eliminar)
    db.run('DELETE FROM ModelPhotos WHERE file_name = ?', [filename], function(err) {
        if (err) {
            console.error('❌ Error eliminando foto:', err);
            return res.status(500).json({ error: 'Error eliminando de base de datos' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Foto no encontrada en base de datos' });
        }
        
        console.log('✅ Foto eliminada exitosamente, filename:', filename);
        res.json({ message: 'Foto eliminada exitosamente' });
    });
});


// --- API Routes for Model Manuals ---

// GET manuals for a model
app.get('/api/models/:id/manuals', (req, res) => {
    const modelId = req.params.id;
    const sql = `SELECT * FROM ModelManuals WHERE model_id = ? ORDER BY created_at ASC`;
    
    db.all(sql, [modelId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const manuals = rows.map(row => ({
            id: row.id,
            filename: row.file_name,
            originalName: row.original_name,
            size: row.file_size,
            uploadDate: row.created_at,
            mimeType: row.mime_type,
            url: row.file_data // Data URL con el archivo en base64
        }));
        
        res.json(manuals);
    });
});

// POST upload manuals for a model
app.post('/api/models/:id/manuals', uploadManuals.array('manuals', 5), (req, res) => {
    const modelId = req.params.id;
    console.log('Manual upload request for model:', modelId);
    console.log('Files received:', req.files ? req.files.length : 0);
    
    if (!req.files || req.files.length === 0) {
        console.log('No files uploaded');
        return res.status(400).json({ error: 'No se subieron archivos' });
    }
    
    // Verificar que el modelo existe
    db.get('SELECT id FROM EquipmentModels WHERE id = ?', [modelId], (err, model) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!model) {
            return res.status(404).json({ error: 'Modelo no encontrado' });
        }
        
        // Validar tipos de archivo
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const invalidFiles = req.files.filter(file => !allowedTypes.includes(file.mimetype));
        
        if (invalidFiles.length > 0) {
            return res.status(400).json({ error: 'Solo se permiten archivos PDF, DOC y DOCX' });
        }
        
        // Guardar información de manuales en la base de datos
        const insertPromises = req.files.map(file => {
            return new Promise((resolve, reject) => {
                // El archivo está en memoria (file.buffer), convertirlo a base64
                const base64Data = file.buffer.toString('base64');
                const dataUrl = `data:${file.mimetype};base64,${base64Data}`;
                
                const sql = `INSERT INTO ModelManuals (model_id, file_data, file_name, original_name, mime_type, file_size) VALUES (?, ?, ?, ?, ?, ?)`;
                db.run(sql, [modelId, dataUrl, file.originalname, file.originalname, file.mimetype, file.size], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            id: this.lastID,
                            filename: file.originalname,
                            originalName: file.originalname,
                            size: file.size,
                            mimeType: file.mimetype,
                            url: dataUrl
                        });
                    }
                });
            });
        });
        
        // Esperar a que todos los manuales se guarden en BD
        Promise.all(insertPromises)
            .then(manuals => {
                console.log('✅ Manuales guardados en BD:', manuals.length);
                res.json({
                    message: 'Manuales subidos exitosamente',
                    manuals: manuals
                });
            })
            .catch(err => {
                console.error('❌ Error guardando manuales en BD:', err);
                res.status(500).json({ error: 'Error guardando manuales en base de datos' });
            });
    });
});

// DELETE a manual by ID
app.delete('/api/models/manuals/:manualId', (req, res) => {
    const manualId = req.params.manualId;
    
    console.log('🗑️ Eliminando manual ID:', manualId);
    
    // Primero verificar que el manual existe
    db.get('SELECT id, model_id, original_name FROM ModelManuals WHERE id = ?', [manualId], (err, row) => {
        if (err) {
            console.error('❌ Error consultando manual:', err);
            return res.status(500).json({ error: 'Error consultando base de datos' });
        }
        
        if (!row) {
            console.log('❌ Manual no encontrado con ID:', manualId);
            return res.status(404).json({ error: 'Manual no encontrado en base de datos' });
        }
        
        console.log('✅ Manual encontrado:', row);
        
        // Ahora eliminar el manual
        db.run('DELETE FROM ModelManuals WHERE id = ?', [manualId], function(err) {
            if (err) {
                console.error('❌ Error eliminando manual:', err);
                return res.status(500).json({ error: 'Error eliminando de base de datos' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Manual no encontrado en base de datos' });
            }
            
            console.log('✅ Manual eliminado exitosamente, ID:', manualId, 'Cambios:', this.changes);
            res.json({ message: 'Manual eliminado exitosamente' });
        });
    });
});


// --- API Routes for Tickets ---

// GET all tickets
app.get('/api/tickets', (req, res) => {
    const sql = `
        SELECT 
            t.*,
            c.name as client_name,
            l.name as location_name,
            e.name as equipment_name,
            e.custom_id as equipment_custom_id
        FROM Tickets t
        LEFT JOIN Clients c ON t.client_id = c.id
        LEFT JOIN Equipment e ON t.equipment_id = e.id
        LEFT JOIN Locations l ON e.location_id = l.id
        ORDER BY t.created_at DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Error en consulta de tickets:', err.message);
            res.status(500).json({ "error": err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// GET a single ticket by id
app.get('/api/tickets/:id', (req, res) => {
    const sql = "SELECT * FROM Tickets WHERE id = ?";
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            message: "success",
            data: row
        });
    });
});

// POST new ticket
app.post('/api/tickets', (req, res) => {
    const { client_id, location_id, equipment_id, title, description, priority, due_date } = req.body;

    // Basic validation
    if (!title || !client_id || !priority) {
        return res.status(400).json({ error: "Título, Cliente y Prioridad son campos obligatorios." });
    }

    const sql = `INSERT INTO Tickets (client_id, location_id, equipment_id, title, description, priority, due_date, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [client_id, location_id || null, equipment_id || null, title, description, priority, due_date || null, 'Abierto'];
    
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.status(201).json({
            message: "success",
            data: { id: this.lastID, ...req.body }
        });
    });
});

// PUT (update) a ticket
app.put('/api/tickets/:id', (req, res) => {
    const { client_id, location_id, equipment_id, title, description, status, priority, due_date } = req.body;
    
    if (!title || !client_id || !priority || !status) {
        return res.status(400).json({ error: "Título, Cliente, Prioridad y Estado son campos obligatorios." });
    }

    const sql = `UPDATE Tickets SET
                    client_id = ?,
                    location_id = ?,
                    equipment_id = ?,
                    title = ?,
                    description = ?,
                    status = ?,
                    priority = ?,
                    due_date = ?,
                    updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`;
                 
    const params = [client_id, location_id, equipment_id, title, description, status, priority, due_date, req.params.id];

    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "Ticket no encontrado." });
        }
        res.json({
            message: "success",
            changes: this.changes
        });
    });
});

// DELETE a ticket
app.delete('/api/tickets/:id', (req, res) => {
    const sql = 'DELETE FROM Tickets WHERE id = ?';
    db.run(sql, [req.params.id], function(err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "Ticket no encontrado." });
        }
        res.json({ "message": "deleted", changes: this.changes });
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


// --- API Routes for Equipment Photos ---

// GET all photos for a specific equipment
app.get('/api/equipment/:equipmentId/photos', (req, res) => {
    const { equipmentId } = req.params;
    const sql = `
        SELECT * FROM EquipmentPhotos 
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

// POST new photo for equipment
app.post('/api/equipment/:equipmentId/photos', (req, res) => {
    const { equipmentId } = req.params;
    const { photo_data, mime_type, filename } = req.body;
    
    if (!photo_data || !mime_type) {
        return res.status(400).json({ error: "photo_data y mime_type son requeridos" });
    }
    
    const sql = 'INSERT INTO EquipmentPhotos (equipment_id, photo_data, mime_type, filename) VALUES (?, ?, ?, ?)';
    const params = [equipmentId, photo_data, mime_type, filename || 'foto.jpg'];
    
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        
        // Devolver la foto creada
        const selectSql = 'SELECT * FROM EquipmentPhotos WHERE id = ?';
        db.get(selectSql, [this.lastID], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.status(201).json(row);
        });
    });
});

// DELETE a photo
app.delete('/api/equipment/photos/:photoId', (req, res) => {
    const { photoId } = req.params;
    const sql = 'DELETE FROM EquipmentPhotos WHERE id = ?';
    
    db.run(sql, [photoId], function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: "Foto eliminada", changes: this.changes });
    });
});

// GET main photo for a model (for equipment display)
app.get('/api/models/:modelId/main-photo', (req, res) => {
    const { modelId } = req.params;
    const sql = `
        SELECT file_path FROM modelphotos 
        WHERE model_id = ? 
        ORDER BY created_at ASC 
        LIMIT 1
    `;
    db.get(sql, [modelId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: "No hay fotos para este modelo" });
            return;
        }
        
        // Leer el archivo y convertirlo a base64
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(__dirname, '..', row.file_path);
        
        if (!fs.existsSync(filePath)) {
            res.status(404).json({ error: "Archivo de foto no encontrado" });
            return;
        }
        
        try {
            const fileBuffer = fs.readFileSync(filePath);
            const base64Data = fileBuffer.toString('base64');
            const mimeType = `image/${path.extname(filePath).slice(1)}`;
            
            res.json({
                photo_data: base64Data,
                mime_type: mimeType,
                file_path: row.file_path
            });
        } catch (error) {
            res.status(500).json({ error: "Error al leer el archivo de foto" });
        }
    });
});



// --- Server ---
app.listen(port, () => {
    console.log(`Gymtec ERP backend listening at http://localhost:${port}`);
}); 