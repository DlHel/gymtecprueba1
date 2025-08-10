require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db-adapter');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { validateClient, validateLocation, validateEquipment, validateClientUpdate, validateLocationUpdate, validateEquipmentUpdate } = require('./validators');

// Importar sistema de autenticación
const { authenticateToken, requireRole, optionalAuth } = require('./middleware/auth');
const AuthService = require('./services/authService');

const app = express();
const port = process.env.PORT || 3000;

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

// --- RUTAS DE AUTENTICACIÓN ---

// POST login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            error: 'Username y contraseña son requeridos',
            code: 'MISSING_CREDENTIALS'
        });
    }

    try {
        const result = await AuthService.login(username, password);
        
        console.log(`✅ Login exitoso para usuario: ${username}`);
        
        res.json({
            message: 'Login exitoso',
            ...result
        });

    } catch (error) {
        console.log(`❌ Login fallido para usuario: ${username} - ${error.message}`);
        
        res.status(401).json({
            error: error.message,
            code: error.code || 'LOGIN_FAILED'
        });
    }
});

// POST logout (opcional - para invalidar token en frontend)
app.post('/api/auth/logout', authenticateToken, (req, res) => {
    // En una implementación más avanzada, aquí se podría agregar el token a una blacklist
    console.log(`📤 Logout del usuario: ${req.user.username}`);
    
    res.json({
        message: 'Logout exitoso'
    });
});

// GET verificar token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({
        message: 'Token válido',
        user: req.user
    });
});

// POST cambiar contraseña
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            error: 'Contraseña actual y nueva contraseña son requeridas'
        });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({
            error: 'La nueva contraseña debe tener al menos 6 caracteres'
        });
    }

    try {
        await AuthService.changePassword(req.user.id, currentPassword, newPassword);
        
        console.log(`🔐 Contraseña cambiada para usuario: ${req.user.username}`);
        
        res.json({
            message: 'Contraseña actualizada exitosamente'
        });

    } catch (error) {
        res.status(400).json({
            error: error.message,
            code: error.code || 'PASSWORD_CHANGE_FAILED'
        });
    }
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
    const clientId = req.params.id;
    console.log(`🗑️ Iniciando eliminación en cascada para cliente ID: ${clientId}`);
    
    // Transacción para eliminar todo en orden correcto
    db.serialize(() => {
        db.run("BEGIN TRANSACTION", (err) => {
            if (err) {
                console.error("❌ Error al iniciar transacción:", err);
                return res.status(500).json({"error": "Error al iniciar transacción: " + err.message});
            }
            
            console.log("📋 Paso 1: Eliminando fotos de equipos...");
            // 1. Eliminar fotos de equipos del cliente
            const deleteEquipmentPhotosSQL = `
                DELETE FROM EquipmentPhotos 
                WHERE equipment_id IN (
                    SELECT e.id FROM Equipment e 
                    JOIN Locations l ON e.location_id = l.id 
                    WHERE l.client_id = ?
                )
            `;
            
            db.run(deleteEquipmentPhotosSQL, [clientId], function(err) {
                if (err) {
                    console.error("❌ Error eliminando fotos de equipos:", err);
                    return db.run("ROLLBACK", () => {
                        res.status(500).json({"error": "Error eliminando fotos de equipos: " + err.message});
                    });
                }
                console.log(`✅ Eliminadas ${this.changes} fotos de equipos`);
                
                console.log("🎫 Paso 2: Eliminando tickets...");
                // 2. Eliminar tickets de equipos del cliente
                const deleteTicketsSQL = `
                    DELETE FROM Tickets 
                    WHERE equipment_id IN (
                        SELECT e.id FROM Equipment e 
                        JOIN Locations l ON e.location_id = l.id 
                        WHERE l.client_id = ?
                    )
                `;
                
                db.run(deleteTicketsSQL, [clientId], function(err) {
                    if (err) {
                        console.error("❌ Error eliminando tickets:", err);
                        return db.run("ROLLBACK", () => {
                            res.status(500).json({"error": "Error eliminando tickets: " + err.message});
                        });
                    }
                    console.log(`✅ Eliminados ${this.changes} tickets`);
                    
                    console.log("🔧 Paso 3: Eliminando equipos...");
                    // 3. Eliminar equipos del cliente
                    const deleteEquipmentSQL = `
                        DELETE FROM Equipment 
                        WHERE location_id IN (
                            SELECT id FROM Locations WHERE client_id = ?
                        )
                    `;
                    
                    db.run(deleteEquipmentSQL, [clientId], function(err) {
                        if (err) {
                            console.error("❌ Error eliminando equipos:", err);
                            return db.run("ROLLBACK", () => {
                                res.status(500).json({"error": "Error eliminando equipos: " + err.message});
                            });
                        }
                        console.log(`✅ Eliminados ${this.changes} equipos`);
                        
                        console.log("🏢 Paso 4: Eliminando sedes...");
                        // 4. Eliminar sedes del cliente
                        const deleteLocationsSQL = 'DELETE FROM Locations WHERE client_id = ?';
                        
                        db.run(deleteLocationsSQL, [clientId], function(err) {
                            if (err) {
                                console.error("❌ Error eliminando sedes:", err);
                                return db.run("ROLLBACK", () => {
                                    res.status(500).json({"error": "Error eliminando sedes: " + err.message});
                                });
                            }
                            console.log(`✅ Eliminadas ${this.changes} sedes`);
                            
                            console.log("👤 Paso 5: Eliminando cliente...");
                            // 5. Finalmente eliminar el cliente
                            const deleteClientSQL = 'DELETE FROM Clients WHERE id = ?';
                            
                            db.run(deleteClientSQL, [clientId], function(err) {
                                if (err) {
                                    console.error("❌ Error eliminando cliente:", err);
                                    return db.run("ROLLBACK", () => {
                                        res.status(500).json({"error": "Error eliminando cliente: " + err.message});
                                    });
                                }
                                
                                if (this.changes === 0) {
                                    console.log("⚠️ Cliente no encontrado");
                                    return db.run("ROLLBACK", () => {
                                        res.status(404).json({"error": "Cliente no encontrado"});
                                    });
                                }
                                
                                console.log("✅ Cliente eliminado exitosamente");
                                // Confirmar transacción
                                db.run("COMMIT", (err) => {
                                    if (err) {
                                        console.error("❌ Error al confirmar transacción:", err);
                                        return res.status(500).json({"error": "Error al confirmar eliminación: " + err.message});
                                    }
                                    
                                    console.log("🎉 Eliminación en cascada completada exitosamente");
                                    res.json({
                                        "message": "Cliente y todos sus datos relacionados eliminados exitosamente",
                                        "clientId": clientId,
                                        "changes": this.changes
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});


// --- API Routes for Locations (Sedes) ---
// GET all locations
app.get('/api/locations', (req, res) => {
    const { client_id } = req.query;
    
    let sql = `
        SELECT 
            l.*,
            c.name as client_name,
            COUNT(e.id) as equipment_count
        FROM Locations l
        LEFT JOIN Clients c ON l.client_id = c.id
        LEFT JOIN Equipment e ON l.id = e.location_id
    `;
    
    let params = [];
    
    // Filtrar por client_id si se proporciona
    if (client_id) {
        sql += ` WHERE l.client_id = ?`;
        params.push(client_id);
    }
    
    sql += ` GROUP BY l.id, l.name, l.address, l.client_id, c.name
             ORDER BY c.name, l.name`;
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ 
            message: "success",
            data: rows 
        });
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
    const { location_id } = req.query;
    
    let sql = `
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
    `;
    
    let params = [];
    
    // Filtrar por location_id si se proporciona
    if (location_id) {
        sql += ` WHERE e.location_id = ?`;
        params.push(location_id);
    }
    
    sql += ` ORDER BY c.name, l.name, e.name`;
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ 
            message: "success",
            data: rows 
        });
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
    console.log('📥 Datos recibidos para nuevo equipo:', req.body);
    const { name, type, brand, model, serial_number, location_id, acquisition_date, notes } = req.body;
    
    // Validar datos del equipo
    const validation = validateEquipment(req.body);
    if (!validation.isValid) {
        console.log('❌ Validación fallida:', validation.errors);
        return res.status(400).json({
            "error": "Datos de equipo inválidos",
            "details": validation.errors
        });
    }

    // 1. Obtener el client_id a partir del location_id
    db.get("SELECT client_id FROM Locations WHERE id = ?", [location_id], (err, location) => {
        if (err) {
            console.log('❌ Error en consulta de ubicación:', err.message);
            return res.status(500).json({ "error": "Error en consulta de ubicación: " + err.message });
        }
        if (!location) {
            console.log('❌ Ubicación no encontrada:', location_id);
            return res.status(400).json({ "error": "No se encontró la ubicación con ID: " + location_id });
        }
        
        const clientId = location.client_id;
        const typePrefix = (type || 'UNK').substring(0, 4).toUpperCase();

        // 2. Contar cuántos equipos tiene el cliente para generar el secuencial
        const countSql = `SELECT COUNT(*) as count FROM Equipment WHERE location_id IN (SELECT id FROM Locations WHERE client_id = ?)`;
        db.get(countSql, [clientId], (err, result) => {
            if (err) {
                console.log('❌ Error al contar equipos:', err.message);
                return res.status(500).json({ "error": "Error al contar equipos: " + err.message });
            }
            
            const newCount = result.count + 1;
            const customId = `CLI${String(clientId).padStart(3, '0')}-${typePrefix}-${String(newCount).padStart(4, '0')}`;

            // 3. Insertar el nuevo equipo con el custom_id generado
            const insertSql = `INSERT INTO Equipment (location_id, custom_id, type, name, brand, model, serial_number, acquisition_date, notes) 
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            
            // Asegurar que todos los valores sean válidos o null
            const params = [
                location_id, 
                customId, 
                type || null, 
                name || null, 
                brand || null, 
                model || null, 
                serial_number || null, 
                acquisition_date || null, 
                notes || null
            ];
            
            console.log('📤 Parámetros a insertar:', params);

            db.run(insertSql, params, function(err) {
                if (err) {
                    console.log('❌ Error al insertar equipo:', err.message);
                    
                    // Manejar errores específicos
                    if (err.message.includes('Duplicate entry') && err.message.includes('serial_number')) {
                        return res.status(409).json({ 
                            "error": "El número de serie ya existe en el sistema",
                            "details": "Ya existe un equipo registrado con este número de serie. Los números de serie deben ser únicos."
                        });
                    } else if (err.message.includes('Duplicate entry')) {
                        return res.status(409).json({ 
                            "error": "Datos duplicados", 
                            "details": err.message 
                        });
                    }
                    
                    return res.status(400).json({ "error": err.message });
                }
                console.log('✅ Equipo creado exitosamente con ID:', this.lastID);
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

// GET technician inventory
app.get('/api/inventory/technicians', (req, res) => {
    const sql = `
        SELECT 
            ti.*,
            u.username as technician_name,
            u.email as technician_email,
            sp.name as spare_part_name,
            sp.sku as spare_part_sku,
            sp.current_stock,
            assigned_user.username as assigned_by_name
        FROM TechnicianInventory ti
        LEFT JOIN Users u ON ti.technician_id = u.id
        LEFT JOIN SpareParts sp ON ti.spare_part_id = sp.id
        LEFT JOIN Users assigned_user ON ti.assigned_by = assigned_user.id
        ORDER BY ti.assigned_at DESC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Error en consulta de inventario de técnicos:', err.message);
            res.status(500).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// GET inventory transactions
app.get('/api/inventory/transactions', (req, res) => {
    const sql = `
        SELECT 
            it.*,
            sp.name as spare_part_name,
            sp.sku as spare_part_sku,
            u_tech.username as technician_name,
            u_performed.username as performed_by_name
        FROM InventoryTransactions it
        LEFT JOIN SpareParts sp ON it.spare_part_id = sp.id
        LEFT JOIN Users u_tech ON it.technician_id = u_tech.id
        LEFT JOIN Users u_performed ON it.performed_by = u_performed.id
        ORDER BY it.transaction_date DESC
        LIMIT 100
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Error en consulta de transacciones de inventario:', err.message);
            res.status(500).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
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

// GET spare parts for ticket modals (alias for compatibility)
app.get('/api/inventory/spare-parts', (req, res) => {
    const sql = "SELECT * FROM SpareParts ORDER BY name";
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Error al obtener repuestos:', err.message);
            res.status(400).json({"error":err.message});
            return;
        }
        console.log(`📦 Repuestos obtenidos: ${rows.length} items`);
        res.json({
            "message":"success",
            "data":rows
        });
    });
});

// GET spare parts with low stock alerts
app.get('/api/inventory/spare-parts/alerts', (req, res) => {
    const sql = `SELECT * FROM SpareParts 
                 WHERE current_stock <= minimum_stock 
                 ORDER BY (current_stock - minimum_stock) ASC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Error al obtener alertas de stock:', err.message);
            res.status(400).json({"error":err.message});
            return;
        }
        console.log(`⚠️ Alertas de stock bajo: ${rows.length} items`);
        res.json({
            "message":"success",
            "data":rows
        });
    });
});

// GET spare part requests
app.get('/api/inventory/spare-part-requests', (req, res) => {
    const { status, ticket_id } = req.query;
    
    let sql = `SELECT spr.*, t.title as ticket_title, t.description as ticket_description
               FROM SparePartRequests spr 
               LEFT JOIN Tickets t ON spr.ticket_id = t.id 
               WHERE 1=1`;
    const params = [];
    
    if (status) {
        sql += ` AND spr.status = ?`;
        params.push(status);
    }
    
    if (ticket_id) {
        sql += ` AND spr.ticket_id = ?`;
        params.push(ticket_id);
    }
    
    sql += ` ORDER BY spr.created_at DESC`;
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('❌ Error consultando solicitudes de repuestos:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        
        console.log(`✅ Consultadas ${rows.length} solicitudes de repuestos`);
        res.json({ message: "success", data: rows });
    });
});

// POST spare part request
app.post('/api/inventory/spare-part-requests', (req, res) => {
    const { 
        ticket_id, 
        spare_part_name, 
        quantity_needed, 
        priority, 
        description, 
        justification, 
        requested_by 
    } = req.body;
    
    // Validaciones
    if (!ticket_id || !spare_part_name || !quantity_needed) {
        return res.status(400).json({ 
            error: "ticket_id, spare_part_name y quantity_needed son requeridos" 
        });
    }
    
    const sql = `INSERT INTO SparePartRequests 
                 (ticket_id, spare_part_name, quantity_needed, priority, description, justification, requested_by, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente')`;
    
    db.run(sql, [
        ticket_id,
        spare_part_name,
        quantity_needed,
        priority || 'Media',
        description,
        justification,
        requested_by || 'Usuario'
    ], function(err) {
        if (err) {
            console.error('❌ Error insertando solicitud de repuesto:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        
        console.log('✅ Nueva solicitud de repuesto guardada:', {
            id: this.lastID,
            ticket_id,
            spare_part_name,
            quantity_needed,
            priority: priority || 'Media'
        });
        
        res.json({
            message: "success",
            data: {
                id: this.lastID,
                ticket_id,
                spare_part_name,
                quantity_needed,
                priority: priority || 'Media',
                description,
                justification,
                requested_by: requested_by || 'Usuario',
                status: 'pendiente',
                created_at: new Date().toISOString()
            }
        });
    });
});

// PUT update spare part request status
app.put('/api/inventory/spare-part-requests/:id', async (req, res) => {
    const { id } = req.params;
    const { status, approved_by, notes } = req.body;
    
    if (!status) {
        return res.status(400).json({ error: "Status es requerido" });
    }
    
    console.log('🔄 Actualizando solicitud de repuesto:', { id, status, approved_by, notes });
    
    try {
        // Primero obtenemos la información de la solicitud
        const getRequestSql = `SELECT * FROM SparePartRequests WHERE id = ?`;
        
        const request = await new Promise((resolve, reject) => {
            db.get(getRequestSql, [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!request) {
            return res.status(404).json({ error: "Solicitud no encontrada" });
        }
        
        // Actualizar estado de la solicitud
        let updateSql = `UPDATE SparePartRequests SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP`;
        let params = [status, notes || null];
        
        if (status === 'aprobada' && approved_by) {
            updateSql += `, approved_by = ?, approved_at = CURRENT_TIMESTAMP`;
            params.push(approved_by);
        }
        
        updateSql += ` WHERE id = ?`;
        params.push(id);
        
        await new Promise((resolve, reject) => {
            db.run(updateSql, params, function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
        
        // Si se aprobó la solicitud, asignar repuesto al técnico
        if (status === 'aprobada') {
            await processApprovedRequest(request);
        }
        
        console.log(`✅ Solicitud de repuesto ${id} actualizada a estado: ${status}`);
        res.json({ message: "success", changes: 1 });
        
    } catch (error) {
        console.error('❌ Error actualizando solicitud de repuesto:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Función para procesar solicitud aprobada
async function processApprovedRequest(request) {
    try {
        console.log('🎯 Procesando solicitud aprobada:', request.spare_part_name);
        
        // Obtener información del ticket para saber a qué técnico asignar
        const getTicketSql = `SELECT assigned_technician_id FROM Tickets WHERE id = ?`;
        
        const ticket = await new Promise((resolve, reject) => {
            db.get(getTicketSql, [request.ticket_id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!ticket || !ticket.assigned_technician_id) {
            console.log('⚠️ Ticket sin técnico asignado, no se puede asignar repuesto');
            return;
        }
        
        // Buscar si existe el repuesto en el inventario central
        const findSparePartSql = `SELECT id FROM SpareParts WHERE name LIKE ? LIMIT 1`;
        
        const sparePart = await new Promise((resolve, reject) => {
            db.get(findSparePartSql, [`%${request.spare_part_name}%`], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (sparePart) {
            // Si existe, asignar desde inventario central
            const assignSql = `INSERT INTO TechnicianInventory 
                              (technician_id, spare_part_id, spare_part_name, quantity, assigned_at, source_ticket_id) 
                              VALUES (?, ?, ?, ?, NOW(), ?)`;
            
            await new Promise((resolve, reject) => {
                db.run(assignSql, [
                    ticket.assigned_technician_id,
                    sparePart.id,
                    request.spare_part_name,
                    request.quantity_needed,
                    request.ticket_id
                ], function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
            });
            
            console.log(`✅ Repuesto ${request.spare_part_name} asignado al técnico ${ticket.assigned_technician_id}`);
        } else {
            // Si no existe, crear orden de compra
            const createOrderSql = `INSERT INTO PurchaseOrders 
                                   (spare_part_name, quantity, priority, requested_for_ticket, requested_for_technician, status, created_at) 
                                   VALUES (?, ?, ?, ?, ?, 'pendiente', NOW())`;
            
            await new Promise((resolve, reject) => {
                db.run(createOrderSql, [
                    request.spare_part_name,
                    request.quantity_needed,
                    request.priority,
                    request.ticket_id,
                    ticket.assigned_technician_id
                ], function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
            });
            
            console.log(`✅ Orden de compra creada para ${request.spare_part_name}`);
        }
        
    } catch (error) {
        console.error('❌ Error procesando solicitud aprobada:', error.message);
        // No lanzamos el error para no afectar la respuesta principal
    }
}

// POST request order for specific spare part
app.post('/api/inventory/spare-parts/:id/request-order', (req, res) => {
    const sparePartId = req.params.id;
    const { ticket_id, requested_by } = req.body;
    
    console.log('🛒 Solicitud de orden de compra:', {
        spare_part_id: sparePartId,
        ticket_id,
        requested_by
    });
    
    // Simular éxito - en el futuro se integrará con el sistema de órdenes de compra
    res.json({
        "message":"success",
        "data": {
            id: Date.now(),
            spare_part_id: sparePartId,
            ticket_id,
            status: 'solicitada',
            created_at: new Date().toISOString()
        }
    });
});

// --- API Routes for Purchase Orders ---

// GET all purchase orders
app.get('/api/purchase-orders', (req, res) => {
    const sql = `
        SELECT 
            po.*,
            u.username as created_by_name,
            COUNT(poi.id) as items_count,
            SUM(poi.total_cost) as calculated_total
        FROM PurchaseOrders po
        LEFT JOIN Users u ON po.created_by = u.id
        LEFT JOIN PurchaseOrderItems poi ON po.id = poi.purchase_order_id
        GROUP BY po.id
        ORDER BY po.created_at DESC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Error en consulta de órdenes de compra:', err.message);
            res.status(500).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// GET purchase order by ID with items
app.get('/api/purchase-orders/:id', (req, res) => {
    const orderId = req.params.id;
    
    const orderSql = `
        SELECT 
            po.*,
            u.username as created_by_name
        FROM PurchaseOrders po
        LEFT JOIN Users u ON po.created_by = u.id
        WHERE po.id = ?
    `;
    
    const itemsSql = `
        SELECT 
            poi.*,
            sp.name as spare_part_name,
            sp.sku as spare_part_sku
        FROM PurchaseOrderItems poi
        LEFT JOIN SpareParts sp ON poi.spare_part_id = sp.id
        WHERE poi.purchase_order_id = ?
    `;
    
    db.get(orderSql, [orderId], (err, order) => {
        if (err) {
            return res.status(500).json({ "error": err.message });
        }
        if (!order) {
            return res.status(404).json({ "error": "Orden de compra no encontrada" });
        }
        
        db.all(itemsSql, [orderId], (err, items) => {
            if (err) {
                return res.status(500).json({ "error": err.message });
            }
            
            res.json({
                "message": "success",
                "data": {
                    ...order,
                    items: items
                }
            });
        });
    });
});

// POST new purchase order
app.post('/api/purchase-orders', (req, res) => {
    const { order_number, supplier, order_date, expected_delivery, notes, items } = req.body;
    
    if (!order_number || !supplier || !order_date) {
        return res.status(400).json({ "error": "order_number, supplier y order_date son requeridos" });
    }
    
    // Calcular total
    const total_amount = items ? items.reduce((sum, item) => sum + (item.quantity_ordered * item.unit_cost), 0) : 0;
    
    const orderSql = `
        INSERT INTO PurchaseOrders 
        (order_number, supplier, order_date, expected_delivery, total_amount, notes, created_by) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const orderParams = [order_number, supplier, order_date, expected_delivery || null, total_amount, notes || null, 1]; // TODO: usar usuario actual
    
    db.run(orderSql, orderParams, function(err) {
        if (err) {
            return res.status(400).json({ "error": err.message });
        }
        
        const orderId = this.lastID;
        
        // Insertar items si existen
        if (items && items.length > 0) {
            const itemSql = `
                INSERT INTO PurchaseOrderItems 
                (purchase_order_id, spare_part_id, quantity_ordered, unit_cost, total_cost) 
                VALUES (?, ?, ?, ?, ?)
            `;
            
            let completed = 0;
            const errors = [];
            
            items.forEach(item => {
                const total_cost = item.quantity_ordered * item.unit_cost;
                db.run(itemSql, [orderId, item.spare_part_id, item.quantity_ordered, item.unit_cost, total_cost], (err) => {
                    completed++;
                    if (err) errors.push(err.message);
                    
                    if (completed === items.length) {
                        if (errors.length > 0) {
                            return res.status(400).json({ "error": "Error insertando items: " + errors.join(", ") });
                        }
                        res.status(201).json({
                            "message": "success",
                            "data": { id: orderId, ...req.body }
                        });
                    }
                });
            });
        } else {
            res.status(201).json({
                "message": "success",
                "data": { id: orderId, ...req.body }
            });
        }
    });
});

// PUT update purchase order status
app.put('/api/purchase-orders/:id/status', (req, res) => {
    const { status, received_date } = req.body;
    const orderId = req.params.id;
    
    if (!status) {
        return res.status(400).json({ "error": "status es requerido" });
    }
    
    const sql = `
        UPDATE PurchaseOrders 
        SET status = ?, received_date = ?
        WHERE id = ?
    `;
    
    db.run(sql, [status, received_date || null, orderId], function(err) {
        if (err) {
            return res.status(400).json({ "error": err.message });
        }
        
        res.json({
            "message": "success",
            "data": { id: orderId, status, received_date }
        });
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
    const { location_id } = req.query;
    
    let sql = `
        SELECT 
            t.*,
            c.name as client_name,
            l.name as location_name,
            e.name as equipment_name,
            e.custom_id as equipment_custom_id
        FROM Tickets t
        LEFT JOIN Clients c ON t.client_id = c.id
        LEFT JOIN Equipment e ON t.equipment_id = e.id
        LEFT JOIN Locations l ON t.location_id = l.id
    `;
    
    let params = [];
    
    // Filtrar por location_id si se proporciona
    if (location_id) {
        sql += ` WHERE t.location_id = ?`;
        params.push(location_id);
    }
    
    sql += ` ORDER BY t.created_at DESC`;
    
    db.all(sql, params, (err, rows) => {
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
    console.log('📸 Subiendo foto para equipo:', equipmentId);
    console.log('📋 Body recibido:', {
        ...req.body,
        photo_data: req.body.photo_data ? `[base64 data ${req.body.photo_data.length} chars]` : 'undefined'
    });
    
    const { photo_data, mime_type, filename } = req.body;
    
    if (!photo_data || !mime_type) {
        console.log('❌ Faltan datos requeridos:', { photo_data: !!photo_data, mime_type: !!mime_type });
        return res.status(400).json({ error: "photo_data y mime_type son requeridos" });
    }
    
    const sql = 'INSERT INTO EquipmentPhotos (equipment_id, photo_data, mime_type, file_name) VALUES (?, ?, ?, ?)';
    const params = [equipmentId, photo_data, mime_type, filename || 'foto.jpg'];
    
    console.log('📤 Insertando en BD con parámetros:', {
        equipmentId,
        photo_data_length: photo_data.length,
        mime_type,
        filename: filename || 'foto.jpg'
    });
    
    db.run(sql, params, function(err) {
        if (err) {
            console.log('❌ Error al insertar foto:', err.message);
            res.status(400).json({ error: err.message });
            return;
        }
        
        console.log('✅ Foto insertada con ID:', this.lastID);
        
        // Devolver la foto creada
        const selectSql = 'SELECT * FROM EquipmentPhotos WHERE id = ?';
        db.get(selectSql, [this.lastID], (err, row) => {
            if (err) {
                console.log('❌ Error al recuperar foto creada:', err.message);
                res.status(500).json({ error: err.message });
                return;
            }
            console.log('✅ Foto creada exitosamente');
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



// === APIS COMPLETAS PARA SISTEMA DE TICKETS ===

// --- API Routes for Ticket Time Entries ---

// GET all time entries for a specific ticket
app.get('/api/tickets/:ticketId/time-entries', (req, res) => {
    const { ticketId } = req.params;
    const sql = `
        SELECT 
            tte.*,
            u.username as technician_name
        FROM TicketTimeEntries tte
        LEFT JOIN Users u ON tte.technician_id = u.id
        WHERE tte.ticket_id = ? 
        ORDER BY tte.created_at DESC
    `;
    db.all(sql, [ticketId], (err, rows) => {
        if (err) {
            console.error('❌ Error obteniendo time entries:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log(`✅ Time entries obtenidas para ticket ${ticketId}:`, rows.length);
        res.json({
            message: "success",
            data: rows
        });
    });
});

// POST new time entry for ticket
app.post('/api/tickets/:ticketId/time-entries', (req, res) => {
    const { ticketId } = req.params;
    const { technician_id, start_time, end_time, duration_seconds, description } = req.body;
    
    if (!start_time || !duration_seconds) {
        return res.status(400).json({ error: "start_time y duration_seconds son requeridos" });
    }
    
    const sql = `INSERT INTO TicketTimeEntries 
                 (ticket_id, technician_id, start_time, end_time, duration_seconds, description) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
    const params = [ticketId, technician_id || null, start_time, end_time || null, duration_seconds, description || null];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error creando time entry:', err.message);
            res.status(400).json({ error: err.message });
            return;
        }
        
        console.log(`✅ Time entry creada para ticket ${ticketId}, ID: ${this.lastID}`);
        res.status(201).json({
            message: "success",
            data: { id: this.lastID, ticket_id: ticketId, ...req.body }
        });
    });
});

// DELETE a time entry
app.delete('/api/tickets/time-entries/:entryId', (req, res) => {
    const { entryId } = req.params;
    const sql = 'DELETE FROM TicketTimeEntries WHERE id = ?';
    
    db.run(sql, [entryId], function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "Time entry no encontrada" });
        }
        res.json({ message: "Time entry eliminada", changes: this.changes });
    });
});

// --- API Routes for Ticket Notes ---

// GET all notes for a specific ticket
app.get('/api/tickets/:ticketId/notes', (req, res) => {
    const { ticketId } = req.params;
    const sql = `
        SELECT * FROM TicketNotes 
        WHERE ticket_id = ? 
        ORDER BY created_at DESC
    `;
    db.all(sql, [ticketId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// POST new note for ticket
app.post('/api/tickets/:ticketId/notes', (req, res) => {
    const { ticketId } = req.params;
    const { note, note_type, author, is_internal } = req.body;
    
    if (!note || note.trim() === '') {
        return res.status(400).json({ error: "La nota no puede estar vacía" });
    }
    
    const sql = `INSERT INTO TicketNotes 
                 (ticket_id, note, note_type, author, is_internal) 
                 VALUES (?, ?, ?, ?, ?)`;
    const params = [
        ticketId, 
        note.trim(), 
        note_type || 'Comentario', 
        author || 'Sistema', 
        is_internal || false
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        
        // Devolver la nota creada
        const selectSql = 'SELECT * FROM TicketNotes WHERE id = ?';
        db.get(selectSql, [this.lastID], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.status(201).json({
                message: "success",
                data: row
            });
        });
    });
});

// DELETE a ticket note
app.delete('/api/tickets/notes/:noteId', (req, res) => {
    const { noteId } = req.params;
    const sql = 'DELETE FROM TicketNotes WHERE id = ?';
    
    db.run(sql, [noteId], function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "Nota no encontrada" });
        }
        res.json({ message: "Nota eliminada", changes: this.changes });
    });
});

// PUT update a ticket note
app.put('/api/tickets/notes/:noteId', (req, res) => {
    const { noteId } = req.params;
    const { note, note_type, is_internal } = req.body;
    
    if (!note || note.trim() === '') {
        return res.status(400).json({ error: "La nota no puede estar vacía" });
    }
    
    // Mapear tipos del frontend a los del ENUM en la BD
    const typeMapping = {
        'general': 'Comentario',
        'diagnostico': 'Diagnóstico', 
        'solucion': 'Solución',
        'seguimiento': 'Seguimiento',
        'cliente': 'Comentario' // cliente se mapea a Comentario
    };
    
    const mappedType = typeMapping[note_type] || 'Comentario';
    
    const sql = `UPDATE TicketNotes 
                 SET note = ?, note_type = ?, is_internal = ?
                 WHERE id = ?`;
    const params = [note.trim(), mappedType, is_internal || false, noteId];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error al actualizar nota:', err);
            res.status(400).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: "Nota no encontrada" });
        }
        
        // Devolver la nota actualizada
        const selectSql = 'SELECT * FROM TicketNotes WHERE id = ?';
        db.get(selectSql, [noteId], (err, row) => {
            if (err) {
                console.error('❌ Error al obtener nota actualizada:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            
            console.log('✅ Nota actualizada exitosamente:', noteId);
            res.json({
                message: "success",
                data: row
            });
        });
    });
});

// --- API Routes for Ticket Checklists ---

// GET all checklist items for a specific ticket
app.get('/api/tickets/:ticketId/checklist', (req, res) => {
    const { ticketId } = req.params;
    const sql = `
        SELECT * FROM TicketChecklists 
        WHERE ticket_id = ? 
        ORDER BY order_index ASC, created_at ASC
    `;
    db.all(sql, [ticketId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// POST new checklist item for ticket
app.post('/api/tickets/:ticketId/checklist', (req, res) => {
    const { ticketId } = req.params;
    const { title, description, order_index } = req.body;
    
    if (!title || title.trim() === '') {
        return res.status(400).json({ error: "El título del checklist no puede estar vacío" });
    }
    
    const sql = `INSERT INTO TicketChecklists 
                 (ticket_id, title, description, order_index) 
                 VALUES (?, ?, ?, ?)`;
    const params = [ticketId, title.trim(), description || null, order_index || 0];
    
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        
        // Devolver el item creado
        const selectSql = 'SELECT * FROM TicketChecklists WHERE id = ?';
        db.get(selectSql, [this.lastID], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.status(201).json({
                message: "success",
                data: row
            });
        });
    });
});

// PUT update checklist item (mark as completed/uncompleted)
app.put('/api/tickets/checklist/:itemId', (req, res) => {
    const { itemId } = req.params;
    const { is_completed, completed_by } = req.body;
    
    // Validar parámetros
    if (typeof is_completed !== 'boolean') {
        return res.status(400).json({ 
            error: "El campo 'is_completed' debe ser un valor booleano (true/false)" 
        });
    }
    
    if (!itemId || isNaN(parseInt(itemId))) {
        return res.status(400).json({ 
            error: "ID de item de checklist inválido" 
        });
    }
    
    console.log('🔄 Actualizando checklist item:', { itemId, is_completed, completed_by });
    
    const sql = `UPDATE TicketChecklists SET 
                 is_completed = ?, 
                 completed_at = ?, 
                 completed_by = ? 
                 WHERE id = ?`;
    const params = [
        is_completed ? 1 : 0, // Convertir explícitamente para SQLite
        is_completed ? new Date().toISOString() : null,
        is_completed ? (completed_by || 'Sistema') : null,
        parseInt(itemId)
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error updating checklist item:', err);
            res.status(400).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            console.warn('⚠️ No checklist item found with ID:', itemId);
            return res.status(404).json({ error: "Item de checklist no encontrado" });
        }
        
        console.log('✅ Checklist item updated successfully:', { itemId, changes: this.changes });
        res.json({
            message: "success",
            changes: this.changes,
            itemId: parseInt(itemId),
            is_completed: is_completed
        });
    });
});

// DELETE a checklist item
app.delete('/api/tickets/checklist/:itemId', (req, res) => {
    const { itemId } = req.params;
    const sql = 'DELETE FROM TicketChecklists WHERE id = ?';
    
    db.run(sql, [itemId], function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "Item de checklist no encontrado" });
        }
        res.json({ message: "Item eliminado", changes: this.changes });
    });
});

// --- API Routes for Ticket Spare Parts ---

// GET all spare parts used in a specific ticket
app.get('/api/tickets/:ticketId/spare-parts', (req, res) => {
    const { ticketId } = req.params;
    const sql = `
        SELECT 
            tsp.*,
            sp.name as spare_part_name,
            sp.sku as spare_part_sku
        FROM TicketSpareParts tsp
        JOIN SpareParts sp ON tsp.spare_part_id = sp.id
        WHERE tsp.ticket_id = ? 
        ORDER BY tsp.used_at DESC
    `;
    db.all(sql, [ticketId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// POST new spare part usage for ticket
app.post('/api/tickets/:ticketId/spare-parts', (req, res) => {
    const { ticketId } = req.params;
    const { spare_part_id, quantity_used, unit_cost, notes } = req.body;
    
    if (!spare_part_id || !quantity_used) {
        return res.status(400).json({ error: "spare_part_id y quantity_used son requeridos" });
    }
    
    const sql = `INSERT INTO TicketSpareParts 
                 (ticket_id, spare_part_id, quantity_used, unit_cost, notes) 
                 VALUES (?, ?, ?, ?, ?)`;
    const params = [ticketId, spare_part_id, quantity_used, unit_cost || null, notes || null];
    
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        
        // Actualizar stock del repuesto
        const updateStockSql = `UPDATE SpareParts 
                               SET current_stock = current_stock - ? 
                               WHERE id = ?`;
        db.run(updateStockSql, [quantity_used, spare_part_id], (err) => {
            if (err) {
                console.error('⚠️ Error actualizando stock:', err.message);
            }
        });
        
        res.status(201).json({
            message: "success",
            data: { id: this.lastID, ticket_id: ticketId, ...req.body }
        });
    });
});

// DELETE a spare part usage
app.delete('/api/tickets/spare-parts/:usageId', (req, res) => {
    const { usageId } = req.params;
    
    // Primero obtener la información para restaurar el stock
    const getSql = 'SELECT spare_part_id, quantity_used FROM TicketSpareParts WHERE id = ?';
    db.get(getSql, [usageId], (err, row) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        if (!row) {
            return res.status(404).json({ error: "Uso de repuesto no encontrado" });
        }
        
        // Eliminar el registro
        const deleteSql = 'DELETE FROM TicketSpareParts WHERE id = ?';
        db.run(deleteSql, [usageId], function(err) {
            if (err) {
                res.status(400).json({ error: err.message });
                return;
            }
            
            // Restaurar stock
            const updateStockSql = `UPDATE SpareParts 
                                   SET current_stock = current_stock + ? 
                                   WHERE id = ?`;
            db.run(updateStockSql, [row.quantity_used, row.spare_part_id], (err) => {
                if (err) {
                    console.error('⚠️ Error restaurando stock:', err.message);
                }
            });
            
            res.json({ message: "Uso de repuesto eliminado", changes: this.changes });
        });
    });
});

// --- API Routes for Ticket Photos ---

// GET all photos for a specific ticket
app.get('/api/tickets/:ticketId/photos', (req, res) => {
    const { ticketId } = req.params;
    const sql = `
        SELECT * FROM TicketPhotos 
        WHERE ticket_id = ? 
        ORDER BY created_at DESC
    `;
    db.all(sql, [ticketId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// POST new photo for ticket
app.post('/api/tickets/:ticketId/photos', (req, res) => {
    const { ticketId } = req.params;
    const { photo_data, file_name, mime_type, file_size, description, photo_type, note_id, author } = req.body;
    
    if (!photo_data || !mime_type) {
        return res.status(400).json({ error: "photo_data y mime_type son requeridos" });
    }
    
    const sql = `INSERT INTO TicketPhotos 
                 (ticket_id, photo_data, file_name, mime_type, file_size, description, photo_type, note_id, author) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
        ticketId, 
        photo_data, 
        file_name || 'foto.jpg', 
        mime_type, 
        file_size || 0, 
        description || null, 
        photo_type || 'Otros',
        note_id || null,
        author || null
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        
        res.status(201).json({
            message: "success",
            data: { id: this.lastID, ticket_id: ticketId, ...req.body }
        });
    });
});

// DELETE a ticket photo
app.delete('/api/tickets/photos/:photoId', (req, res) => {
    const { photoId } = req.params;
    const sql = 'DELETE FROM TicketPhotos WHERE id = ?';
    
    db.run(sql, [photoId], function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "Foto no encontrada" });
        }
        res.json({ message: "Foto eliminada", changes: this.changes });
    });
});

// --- API Routes for Ticket History ---

// GET history for a specific ticket
app.get('/api/tickets/:ticketId/history', (req, res) => {
    const { ticketId } = req.params;
    const sql = `
        SELECT * FROM TicketHistory 
        WHERE ticket_id = ? 
        ORDER BY changed_at DESC
    `;
    db.all(sql, [ticketId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// Function to log ticket changes (internal use)
function logTicketChange(ticketId, fieldChanged, oldValue, newValue, changedBy = 'Sistema') {
    const sql = `INSERT INTO TicketHistory 
                 (ticket_id, field_changed, old_value, new_value, changed_by) 
                 VALUES (?, ?, ?, ?, ?)`;
    const params = [ticketId, fieldChanged, oldValue, newValue, changedBy];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('⚠️ Error logging ticket change:', err.message);
        } else {
            console.log(`📝 Cambio registrado en ticket ${ticketId}: ${fieldChanged}`);
        }
    });
}

// GET enhanced ticket detail with all related data
app.get('/api/tickets/:id/detail', async (req, res) => {
    const ticketId = req.params.id;
    
    // Query principal del ticket con joins
    const ticketSql = `
        SELECT 
            t.*,
            c.name as client_name,
            l.name as location_name,
            l.address as location_address,
            e.name as equipment_name,
            e.custom_id as equipment_custom_id,
            e.serial_number as equipment_serial,
            em.name as equipment_model_name,
            em.brand as equipment_brand,
            em.category as equipment_category,
            u.username as technician_name
        FROM Tickets t
        LEFT JOIN Clients c ON t.client_id = c.id
        LEFT JOIN Locations l ON t.location_id = l.id
        LEFT JOIN Equipment e ON t.equipment_id = e.id
        LEFT JOIN EquipmentModels em ON e.model_id = em.id
        LEFT JOIN Users u ON t.assigned_technician_id = u.id
        WHERE t.id = ?
    `;
    
    db.get(ticketSql, [ticketId], async (err, ticket) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!ticket) {
            return res.status(404).json({ error: "Ticket no encontrado" });
        }
        
        try {
            // Obtener datos relacionados en paralelo
            const [timeEntries, notes, checklist, spareParts, photos, history] = await Promise.all([
                new Promise((resolve, reject) => {
                    db.all('SELECT * FROM TicketTimeEntries WHERE ticket_id = ? ORDER BY created_at DESC', 
                           [ticketId], (err, rows) => err ? reject(err) : resolve(rows));
                }),
                new Promise((resolve, reject) => {
                    db.all('SELECT * FROM TicketNotes WHERE ticket_id = ? ORDER BY created_at DESC', 
                           [ticketId], (err, rows) => err ? reject(err) : resolve(rows));
                }),
                new Promise((resolve, reject) => {
                    db.all('SELECT * FROM TicketChecklists WHERE ticket_id = ? ORDER BY order_index ASC', 
                           [ticketId], (err, rows) => err ? reject(err) : resolve(rows));
                }),
                new Promise((resolve, reject) => {
                    db.all(`SELECT tsp.*, sp.name as spare_part_name, sp.sku as spare_part_sku 
                            FROM TicketSpareParts tsp 
                            JOIN SpareParts sp ON tsp.spare_part_id = sp.id 
                            WHERE tsp.ticket_id = ? ORDER BY tsp.used_at DESC`, 
                           [ticketId], (err, rows) => err ? reject(err) : resolve(rows));
                }),
                new Promise((resolve, reject) => {
                    db.all('SELECT * FROM TicketPhotos WHERE ticket_id = ? ORDER BY created_at DESC', 
                           [ticketId], (err, rows) => err ? reject(err) : resolve(rows));
                }),
                new Promise((resolve, reject) => {
                    db.all('SELECT * FROM TicketHistory WHERE ticket_id = ? ORDER BY changed_at DESC', 
                           [ticketId], (err, rows) => err ? reject(err) : resolve(rows));
                })
            ]);
            
            // 🎯 NUEVA FUNCIONALIDAD: Auto-generar checklist desde template si está vacío
            let finalChecklist = checklist;
            
            if (ticket.equipment_id && checklist.length === 0) {
                console.log('🔧 Ticket tiene equipo pero no checklist, generando desde template...');
                try {
                    const autoChecklist = await createChecklistFromTemplate(ticketId, ticket.equipment_id);
                    if (autoChecklist.length > 0) {
                        finalChecklist = autoChecklist;
                        console.log(`✅ Auto-generado checklist con ${autoChecklist.length} tareas para ticket ${ticketId} (${ticket.equipment_category || 'equipo'})`);
                        
                        // Log del evento
                        logTicketChange(ticketId, 'checklist_auto_generated', '', `Auto-generado desde template de ${ticket.equipment_category || 'equipo'}`);
                    }
                } catch (error) {
                    console.error('❌ Error auto-generando checklist:', error);
                    // Continuar sin checklist automático
                }
            }
            
            res.json({
                message: "success",
                data: {
                    ...ticket,
                    time_entries: timeEntries,
                    notes: notes,
                    checklist: finalChecklist,
                    spare_parts: spareParts,
                    photos: photos,
                    history: history,
                    // Información adicional sobre el checklist
                    checklist_auto_generated: finalChecklist.length > 0 && checklist.length === 0,
                    equipment_category: ticket.equipment_category
                }
            });
            
        } catch (error) {
            console.error('❌ Error obteniendo datos relacionados del ticket:', error);
            res.status(500).json({ error: "Error obteniendo datos completos del ticket" });
        }
    });
});

// --- API Routes for Dashboard KPIs ---

// GET dashboard KPIs and statistics
app.get('/api/dashboard/kpis', (req, res) => {
    const queries = [
        // Total de clientes
        new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as total FROM Clients', (err, row) => {
                if (err) reject(err);
                else resolve({ key: 'total_clients', value: row.total });
            });
        }),
        // Total de equipos
        new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as total FROM Equipment', (err, row) => {
                if (err) reject(err);
                else resolve({ key: 'total_equipment', value: row.total });
            });
        }),
        // Tickets por estado
        new Promise((resolve, reject) => {
            db.all(`SELECT status, COUNT(*) as count FROM Tickets GROUP BY status`, (err, rows) => {
                if (err) reject(err);
                else resolve({ key: 'tickets_by_status', value: rows });
            });
        }),
        // Tickets activos (no cerrados)
        new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as total FROM Tickets WHERE status != 'Cerrado'`, (err, row) => {
                if (err) reject(err);
                else resolve({ key: 'active_tickets', value: row.total });
            });
        }),
        // Tickets críticos
        new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as total FROM Tickets WHERE priority = 'Alta' AND status != 'Cerrado'`, (err, row) => {
                if (err) reject(err);
                else resolve({ key: 'critical_tickets', value: row.total });
            });
        }),
        // Inventario bajo stock
        new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as total FROM SpareParts WHERE current_stock <= minimum_stock`, (err, row) => {
                if (err) reject(err);
                else resolve({ key: 'low_stock_items', value: row.total });
            });
        }),
        // Tickets recientes (últimos 7 días)
        new Promise((resolve, reject) => {
            db.all(`SELECT DATE(created_at) as date, COUNT(*) as count 
                   FROM Tickets 
                   WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                   GROUP BY DATE(created_at)
                   ORDER BY date DESC`, (err, rows) => {
                if (err) reject(err);
                else resolve({ key: 'recent_tickets', value: rows });
            });
        }),
        // Técnicos con tickets asignados
        new Promise((resolve, reject) => {
            db.all(`SELECT u.username, COUNT(t.id) as ticket_count
                   FROM Users u
                   LEFT JOIN Tickets t ON u.id = t.assigned_technician_id AND t.status != 'Cerrado'
                   WHERE u.role = 'Técnico'
                   GROUP BY u.id, u.username
                   ORDER BY ticket_count DESC`, (err, rows) => {
                if (err) reject(err);
                else resolve({ key: 'technician_workload', value: rows });
            });
        })
    ];

    Promise.all(queries)
        .then(results => {
            const kpis = {};
            results.forEach(result => {
                kpis[result.key] = result.value;
            });
            res.json({
                message: "success",
                data: kpis
            });
        })
        .catch(error => {
            console.error('❌ Error obteniendo KPIs:', error);
            res.status(500).json({ error: "Error obteniendo estadísticas del dashboard" });
        });
});

// GET recent activity for dashboard
app.get('/api/dashboard/activity', (req, res) => {
    const limit = req.query.limit || 10;
    const sql = `
        SELECT 
            'ticket' as type,
            id,
            title as description,
            status,
            priority,
            created_at,
            updated_at
        FROM Tickets
        ORDER BY updated_at DESC
        LIMIT ?
    `;
    
    db.all(sql, [limit], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// --- API Routes for Users Management ---

// GET all users
app.get('/api/users', (req, res) => {
    const sql = `SELECT id, username, email, role, status, created_at FROM Users ORDER BY username`;
    db.all(sql, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// GET technicians and administrators only (for ticket assignment)
app.get('/api/users/technicians', (req, res) => {
    const sql = `SELECT id, username, email, role, status, created_at 
                 FROM Users 
                 WHERE (role IN ('Admin', 'Técnico', 'Administrador', 'Technician', 'Tecnico') 
                    OR role LIKE '%admin%' 
                    OR role LIKE '%tecnic%' 
                    OR role LIKE '%técnic%')
                   AND status IN ('active', 'Activo')
                 ORDER BY username`;
    db.all(sql, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// GET single user
app.get('/api/users/:id', (req, res) => {
    const sql = `SELECT id, username, email, role, status, created_at FROM Users WHERE id = ?`;
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        res.json({
            message: "success",
            data: row
        });
    });
});

// POST new user
app.post('/api/users', authenticateToken, requireRole(['Admin']), async (req, res) => {
    const { username, email, password, role, status } = req.body;
    
    if (!username || !email || !password || !role) {
        return res.status(400).json({ error: "username, email, password y role son requeridos" });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
    }

    try {
        // Usar el servicio de autenticación para crear el usuario con hash
        const newUser = await AuthService.register({
            username,
            email,
            password,
            role,
            status: status || 'Activo'
        });

        console.log(`👤 Usuario creado por admin: ${newUser.username}`);

        res.status(201).json({
            message: "success",
            data: newUser
        });

    } catch (error) {
        if (error.code === 'USER_EXISTS') {
            return res.status(409).json({ error: error.message });
        }
        
        console.error('Error creando usuario:', error);
        res.status(400).json({ 
            error: error.message || 'Error al crear usuario'
        });
    }
});

// PUT update user
app.put('/api/users/:id', authenticateToken, requireRole(['Admin']), (req, res) => {
    const { username, email, role, status } = req.body;
    const sql = `UPDATE Users SET 
                 username = COALESCE(?, username),
                 email = COALESCE(?, email),
                 role = COALESCE(?, role),
                 status = COALESCE(?, status)
                 WHERE id = ?`;
    const params = [username, email, role, status, req.params.id];
    
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        
        console.log(`👤 Usuario actualizado por admin: ${req.params.id}`);
        
        res.json({
            message: "success",
            changes: this.changes
        });
    });
});

// DELETE user
app.delete('/api/users/:id', authenticateToken, requireRole(['Admin']), (req, res) => {
    const sql = 'DELETE FROM Users WHERE id = ?';
    db.run(sql, [req.params.id], function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        
        console.log(`🗑️ Usuario eliminado por admin: ${req.params.id}`);
        
        res.json({ message: "Usuario eliminado", changes: this.changes });
    });
});

// --- RUTAS DE GESTIÓN DE PERMISOS ---

// GET todos los módulos del sistema
app.get('/api/modules', authenticateToken, (req, res) => {
    const sql = `SELECT m.*, 
                 (SELECT COUNT(*) FROM ModulePermissions WHERE module_id = m.id) as permissions_count
                 FROM SystemModules m 
                 WHERE m.is_active = true 
                 ORDER BY m.display_order, m.module_name`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// GET permisos de un módulo específico
app.get('/api/modules/:moduleId/permissions', authenticateToken, (req, res) => {
    const sql = `SELECT p.*, m.module_name, m.module_key
                 FROM ModulePermissions p
                 JOIN SystemModules m ON p.module_id = m.id
                 WHERE p.module_id = ?
                 ORDER BY p.permission_key`;
    
    db.all(sql, [req.params.moduleId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// GET permisos de un usuario específico
app.get('/api/users/:userId/permissions', authenticateToken, requireRole(['Admin']), (req, res) => {
    const sql = `SELECT ump.*, m.module_name, m.module_key, m.icon, p.permission_key, p.permission_name
                 FROM UserModulePermissions ump
                 JOIN SystemModules m ON ump.module_id = m.id
                 JOIN ModulePermissions p ON ump.permission_id = p.id
                 WHERE ump.user_id = ? AND ump.granted = true
                 ORDER BY m.display_order, p.permission_key`;
    
    db.all(sql, [req.params.userId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// GET vista completa de permisos para administración
app.get('/api/users/:userId/permissions/matrix', authenticateToken, requireRole(['Admin']), (req, res) => {
    const sql = `SELECT 
                    m.id as module_id,
                    m.module_name,
                    m.module_key,
                    m.icon,
                    p.id as permission_id,
                    p.permission_key,
                    p.permission_name,
                    CASE WHEN ump.id IS NOT NULL THEN 1 ELSE 0 END as granted
                 FROM SystemModules m
                 CROSS JOIN ModulePermissions p ON p.module_id = m.id
                 LEFT JOIN UserModulePermissions ump ON ump.user_id = ? 
                          AND ump.module_id = m.id 
                          AND ump.permission_id = p.id 
                          AND ump.granted = true
                 WHERE m.is_active = true
                 ORDER BY m.display_order, p.permission_key`;
    
    db.all(sql, [req.params.userId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // Agrupar por módulo
        const matrix = {};
        rows.forEach(row => {
            if (!matrix[row.module_key]) {
                matrix[row.module_key] = {
                    module_id: row.module_id,
                    module_name: row.module_name,
                    module_key: row.module_key,
                    icon: row.icon,
                    permissions: []
                };
            }
            
            matrix[row.module_key].permissions.push({
                permission_id: row.permission_id,
                permission_key: row.permission_key,
                permission_name: row.permission_name,
                granted: Boolean(row.granted)
            });
        });

        res.json({
            message: "success",
            data: Object.values(matrix)
        });
    });
});

// POST actualizar permisos de usuario
app.post('/api/users/:userId/permissions', authenticateToken, requireRole(['Admin']), (req, res) => {
    const { permissions } = req.body; // Array de { module_id, permission_id, granted }
    const userId = req.params.userId;
    const grantedBy = req.user.id;

    if (!permissions || !Array.isArray(permissions)) {
        return res.status(400).json({ error: "Se requiere un array de permisos" });
    }

    // Iniciar transacción
    db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        let completed = 0;
        let hasError = false;

        const processPermission = (permission, callback) => {
            const { module_id, permission_id, granted } = permission;
            
            if (granted) {
                // Otorgar permiso (INSERT OR REPLACE)
                const sql = `INSERT OR REPLACE INTO UserModulePermissions 
                           (user_id, module_id, permission_id, granted, granted_by, granted_at)
                           VALUES (?, ?, ?, true, ?, datetime('now'))`;
                           
                db.run(sql, [userId, module_id, permission_id, grantedBy], callback);
            } else {
                // Revocar permiso
                const sql = `DELETE FROM UserModulePermissions 
                           WHERE user_id = ? AND module_id = ? AND permission_id = ?`;
                           
                db.run(sql, [userId, module_id, permission_id], callback);
            }
        };

        permissions.forEach((permission, index) => {
            processPermission(permission, (err) => {
                if (err && !hasError) {
                    hasError = true;
                    db.run('ROLLBACK', () => {
                        res.status(500).json({ error: err.message });
                    });
                    return;
                }
                
                completed++;
                if (completed === permissions.length && !hasError) {
                    db.run('COMMIT', (err) => {
                        if (err) {
                            res.status(500).json({ error: err.message });
                            return;
                        }
                        
                        console.log(`🔐 Permisos actualizados para usuario ${userId} por admin ${grantedBy}`);
                        
                        res.json({
                            message: "success",
                            updated: permissions.length
                        });
                    });
                }
            });
        });
    });
});

// POST asignar permisos por rol (plantilla)
app.post('/api/users/:userId/permissions/template/:role', authenticateToken, requireRole(['Admin']), (req, res) => {
    const userId = req.params.userId;
    const role = req.params.role;
    const grantedBy = req.user.id;

    // Definir plantillas de permisos por rol
    let permissionTemplate = [];
    
    if (role === 'Admin') {
        // Admin: todos los permisos
        const sql = `SELECT m.id as module_id, p.id as permission_id
                     FROM SystemModules m
                     JOIN ModulePermissions p ON p.module_id = m.id
                     WHERE m.is_active = true`;
                     
        db.all(sql, [], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            permissionTemplate = rows.map(row => ({
                module_id: row.module_id,
                permission_id: row.permission_id,
                granted: true
            }));
            
            applyTemplate();
        });
    } else if (role === 'Técnico') {
        // Técnico: permisos limitados
        const sql = `SELECT m.id as module_id, p.id as permission_id
                     FROM SystemModules m
                     JOIN ModulePermissions p ON p.module_id = m.id
                     WHERE m.is_active = true
                     AND (
                         p.permission_key = 'view'
                         OR (m.module_key = 'tickets' AND p.permission_key IN ('create', 'edit'))
                         OR (m.module_key = 'inventario' AND p.permission_key = 'view')
                     )`;
                     
        db.all(sql, [], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            permissionTemplate = rows.map(row => ({
                module_id: row.module_id,
                permission_id: row.permission_id,
                granted: true
            }));
            
            applyTemplate();
        });
    } else {
        return res.status(400).json({ error: "Rol no reconocido" });
    }

    function applyTemplate() {
        // Limpiar permisos existentes
        db.run('DELETE FROM UserModulePermissions WHERE user_id = ?', [userId], (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            // Aplicar nueva plantilla
            const req_body = { permissions: permissionTemplate };
            req.body = req_body;
            
            // Reutilizar la lógica de actualización de permisos
            const permissions = permissionTemplate;
            
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                let completed = 0;
                let hasError = false;

                permissions.forEach((permission) => {
                    const sql = `INSERT INTO UserModulePermissions 
                               (user_id, module_id, permission_id, granted, granted_by, granted_at)
                               VALUES (?, ?, ?, true, ?, datetime('now'))`;
                               
                    db.run(sql, [userId, permission.module_id, permission.permission_id, grantedBy], (err) => {
                        if (err && !hasError) {
                            hasError = true;
                            db.run('ROLLBACK', () => {
                                res.status(500).json({ error: err.message });
                            });
                            return;
                        }
                        
                        completed++;
                        if (completed === permissions.length && !hasError) {
                            db.run('COMMIT', (err) => {
                                if (err) {
                                    res.status(500).json({ error: err.message });
                                    return;
                                }
                                
                                console.log(`🎭 Plantilla ${role} aplicada a usuario ${userId} por admin ${grantedBy}`);
                                
                                res.json({
                                    message: "success",
                                    template: role,
                                    applied: permissions.length
                                });
                            });
                        }
                    });
                });
            });
        });
    }
});

// --- API Routes for System Configuration ---

// GET all system configurations
app.get('/api/config', (req, res) => {
    const sql = `SELECT * FROM SystemConfig ORDER BY category, key`;
    db.all(sql, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// GET config by category
app.get('/api/config/:category', (req, res) => {
    const sql = `SELECT * FROM SystemConfig WHERE category = ? ORDER BY key`;
    db.all(sql, [req.params.category], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// POST/PUT upsert configuration
app.post('/api/config', (req, res) => {
    const { category, key, value, description } = req.body;
    
    if (!category || !key || value === undefined) {
        return res.status(400).json({ error: "category, key y value son requeridos" });
    }
    
    const sql = `INSERT OR REPLACE INTO SystemConfig (category, key, value, description) VALUES (?, ?, ?, ?)`;
    const params = [category, key, value, description || null];
    
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: { category, key, value, description }
        });
    });
});

// DELETE configuration
app.delete('/api/config/:category/:key', (req, res) => {
    const sql = 'DELETE FROM SystemConfig WHERE category = ? AND key = ?';
    db.run(sql, [req.params.category, req.params.key], function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "Configuración no encontrada" });
        }
        res.json({ message: "Configuración eliminada", changes: this.changes });
    });
});

// --- API Routes for Financial Management ---

// GET all quotes
app.get('/api/quotes', authenticateToken, (req, res) => {
    const sql = `
        SELECT 
            q.*,
            c.name as client_name,
            l.name as location_name
        FROM Quotes q
        LEFT JOIN Clients c ON q.client_id = c.id
        LEFT JOIN Locations l ON q.location_id = l.id
        ORDER BY q.created_at DESC
    `;
    db.all(sql, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// POST new quote
app.post('/api/quotes', authenticateToken, (req, res) => {
    const { client_id, location_id, title, description, total_amount, status, items } = req.body;
    
    if (!client_id || !title || !total_amount) {
        return res.status(400).json({ error: "client_id, title y total_amount son requeridos" });
    }
    
    const sql = `INSERT INTO Quotes (client_id, location_id, title, description, total_amount, status, items) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [client_id, location_id, title, description, total_amount, status || 'Borrador', JSON.stringify(items || [])];
    
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.status(201).json({
            message: "success",
            data: { id: this.lastID, ...req.body }
        });
    });
});

// GET quote by ID
app.get('/api/quotes/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    
    if (!id) {
        return res.status(400).json({ error: "ID de cotización requerido" });
    }
    
    const sql = `
        SELECT 
            q.*,
            c.name as client_name,
            c.rut as client_rut,
            l.name as location_name
        FROM Quotes q
        LEFT JOIN Clients c ON q.client_id = c.id
        LEFT JOIN Locations l ON q.location_id = l.id
        WHERE q.id = ?
        LIMIT 1
    `;
    
    db.get(sql, [id], (err, row) => {
        if (err) {
            console.error('❌ Error obteniendo cotización:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!row) {
            return res.status(404).json({ error: "Cotización no encontrada" });
        }
        
        // Parsear items si existen (JSON en MySQL)
        if (row.items) {
            try {
                if (typeof row.items === 'string') {
                    row.items = JSON.parse(row.items);
                }
            } catch (e) {
                console.warn('⚠️ Error parsing items JSON:', e);
                row.items = [];
            }
        } else {
            row.items = [];
        }
        
        console.log('✅ Cotización encontrada:', row.id, row.title);
        
        res.json({
            success: true,
            message: "success",
            data: row
        });
    });
});

// PUT update quote
app.put('/api/quotes/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    const { client_id, location_id, title, description, total_amount, status, items } = req.body;
    
    if (!id) {
        return res.status(400).json({ error: "ID de cotización requerido" });
    }
    
    if (!client_id || !title || !total_amount) {
        return res.status(400).json({ error: "client_id, title y total_amount son requeridos" });
    }
    
    console.log('🔄 Actualizando cotización:', id, { title, total_amount, status });
    
    const sql = `
        UPDATE Quotes 
        SET client_id = ?, location_id = ?, title = ?, description = ?, 
            total_amount = ?, status = ?, items = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    
    const params = [
        client_id, 
        location_id, 
        title, 
        description, 
        total_amount, 
        status || 'Borrador', 
        JSON.stringify(items || []), 
        id
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error actualizando cotización:', err);
            res.status(400).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: "Cotización no encontrada" });
        }
        
        console.log(`✅ Cotización ${id} actualizada exitosamente`);
        
        res.json({
            success: true,
            message: "success",
            data: { id: parseInt(id), changes: this.changes }
        });
    });
});

// DELETE quote
app.delete('/api/quotes/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    
    if (!id) {
        return res.status(400).json({ error: "ID de cotización requerido" });
    }
    
    console.log('🗑️ Eliminando cotización:', id);
    
    const sql = `DELETE FROM Quotes WHERE id = ?`;
    
    db.run(sql, [id], function(err) {
        if (err) {
            console.error('❌ Error eliminando cotización:', err);
            res.status(400).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: "Cotización no encontrada" });
        }
        
        console.log(`✅ Cotización ${id} eliminada exitosamente`);
        
        res.json({
            success: true,
            message: "success",
            data: { id: parseInt(id), changes: this.changes }
        });
    });
});

// GET all invoices
app.get('/api/invoices', authenticateToken, (req, res) => {
    const sql = `
        SELECT 
            i.*,
            c.name as client_name,
            l.name as location_name
        FROM Invoices i
        LEFT JOIN Clients c ON i.client_id = c.id
        LEFT JOIN Locations l ON i.location_id = l.id
        ORDER BY i.created_at DESC
    `;
    db.all(sql, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// GET invoice by ID
app.get('/api/invoices/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    
    if (!id) {
        return res.status(400).json({ error: "ID de factura requerido" });
    }
    
    const sql = `
        SELECT 
            i.*,
            c.name as client_name,
            c.rut as client_rut,
            l.name as location_name
        FROM Invoices i
        LEFT JOIN Clients c ON i.client_id = c.id
        LEFT JOIN Locations l ON i.location_id = l.id
        WHERE i.id = ?
    `;
    
    db.get(sql, [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!row) {
            return res.status(404).json({ error: "Factura no encontrada" });
        }
        
        // Parsear items si existen
        if (row.items && typeof row.items === 'string') {
            try {
                row.items = JSON.parse(row.items);
            } catch (e) {
                console.warn('⚠️ Error parsing items JSON:', e);
                row.items = [];
            }
        }
        
        res.json({
            success: true,
            message: "success",
            data: row
        });
    });
});

// POST new invoice
app.post('/api/invoices', authenticateToken, (req, res) => {
    const { client_id, location_id, invoice_number, title, description, total_amount, status, items } = req.body;
    
    if (!client_id || !invoice_number || !title || !total_amount) {
        return res.status(400).json({ error: "client_id, invoice_number, title y total_amount son requeridos" });
    }
    
    const sql = `INSERT INTO Invoices (client_id, location_id, invoice_number, title, description, total_amount, status, items) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [client_id, location_id, invoice_number, title, description, total_amount, status || 'Pendiente', JSON.stringify(items || [])];
    
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.status(201).json({
            message: "success",
            data: { id: this.lastID, ...req.body }
        });
    });
});

// PUT update invoice
app.put('/api/invoices/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    const { client_id, location_id, invoice_number, title, description, total_amount, status, items } = req.body;
    
    if (!id) {
        return res.status(400).json({ error: "ID de factura requerido" });
    }
    
    if (!client_id || !invoice_number || !title || !total_amount) {
        return res.status(400).json({ error: "client_id, invoice_number, title y total_amount son requeridos" });
    }
    
    console.log('🔄 Actualizando factura:', id, { title, total_amount, status });
    
    const sql = `
        UPDATE Invoices 
        SET client_id = ?, location_id = ?, invoice_number = ?, title = ?, description = ?, 
            total_amount = ?, status = ?, items = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    
    const params = [
        client_id, 
        location_id, 
        invoice_number,
        title, 
        description, 
        total_amount, 
        status || 'Pendiente', 
        JSON.stringify(items || []), 
        id
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error actualizando factura:', err);
            res.status(400).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: "Factura no encontrada" });
        }
        
        console.log(`✅ Factura ${id} actualizada exitosamente`);
        
        res.json({
            success: true,
            message: "success",
            data: { id: parseInt(id), changes: this.changes }
        });
    });
});

// DELETE invoice
app.delete('/api/invoices/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    
    if (!id) {
        return res.status(400).json({ error: "ID de factura requerido" });
    }
    
    console.log('🗑️ Eliminando factura:', id);
    
    const sql = `DELETE FROM Invoices WHERE id = ?`;
    
    db.run(sql, [id], function(err) {
        if (err) {
            console.error('❌ Error eliminando factura:', err);
            res.status(400).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: "Factura no encontrada" });
        }
        
        console.log(`✅ Factura ${id} eliminada exitosamente`);
        
        res.json({
            success: true,
            message: "success",
            data: { id: parseInt(id), changes: this.changes }
        });
    });
});

// --- API Routes for Expenses ---

// GET all expenses
app.get('/api/expenses', authenticateToken, (req, res) => {
    const sql = `
        SELECT 
            e.*
        FROM Expenses e
        ORDER BY e.created_at DESC
    `;
    db.all(sql, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// GET expense by ID
app.get('/api/expenses/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    
    if (!id) {
        return res.status(400).json({ error: "ID de gasto requerido" });
    }
    
    const sql = `
        SELECT 
            e.*
        FROM Expenses e
        WHERE e.id = ?
        LIMIT 1
    `;
    
    db.get(sql, [id], (err, row) => {
        if (err) {
            console.error('❌ Error obteniendo gasto:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!row) {
            return res.status(404).json({ error: "Gasto no encontrado" });
        }
        
        console.log('✅ Gasto encontrado:', row.id, row.description);
        
        res.json({
            success: true,
            message: "success",
            data: row
        });
    });
});

// POST new expense
app.post('/api/expenses', authenticateToken, (req, res) => {
    const { category, description, amount, date, supplier, receipt_number, status } = req.body;
    
    if (!category || !description || !amount || !date) {
        return res.status(400).json({ error: "category, description, amount y date son requeridos" });
    }
    
    const sql = `INSERT INTO Expenses (category, description, amount, date, supplier, receipt_number, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [category, description, amount, date, supplier, receipt_number, status || 'Pendiente'];
    
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.status(201).json({
            message: "success",
            data: { id: this.lastID, ...req.body }
        });
    });
});

// --- API Routes for Time Tracking ---

// GET all time entries
app.get('/api/time-entries', (req, res) => {
    const sql = `
        SELECT 
            te.*,
            u.username as user_name,
            t.title as ticket_title
        FROM TimeEntries te
        LEFT JOIN Users u ON te.user_id = u.id
        LEFT JOIN Tickets t ON te.ticket_id = t.id
        ORDER BY te.created_at DESC
    `;
    db.all(sql, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// POST clock in/out
app.post('/api/time-entries', (req, res) => {
    const { user_id, entry_type, ticket_id, notes } = req.body;
    
    if (!user_id || !entry_type) {
        return res.status(400).json({ error: "user_id y entry_type son requeridos" });
    }
    
    const sql = `INSERT INTO TimeEntries (user_id, entry_type, ticket_id, notes) VALUES (?, ?, ?, ?)`;
    const params = [user_id, entry_type, ticket_id, notes];
    
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.status(201).json({
            message: "success",
            data: { id: this.lastID, ...req.body }
        });
    });
});

// --- Server ---
app.listen(port, () => {
    console.log(`Gymtec ERP backend listening at http://localhost:${port}`);
}); 

// --- API Routes for Checklist Templates ---

// GET checklist template for equipment
app.get('/api/equipment/:equipmentId/checklist-template', (req, res) => {
    const { equipmentId } = req.params;
    
    const sql = `
        SELECT ct.*
        FROM ChecklistTemplates ct
        JOIN Equipment e ON (
            (ct.model_id = e.model_id) OR 
            (ct.equipment_type = (SELECT em.category FROM EquipmentModels em WHERE em.id = e.model_id))
        )
        WHERE e.id = ?
        AND ct.is_active = TRUE
        ORDER BY ct.model_id DESC, ct.created_at DESC
        LIMIT 1
    `;
    
    db.all(sql, [equipmentId], (err, rows) => {
        if (err) {
            console.error('❌ Error fetching checklist template:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (rows.length === 0) {
            res.json({ message: "No checklist template found for this equipment", data: null });
            return;
        }
        
        const template = rows[0];
        console.log('✅ Checklist template found:', template.name);
        
        // Parsear items JSON
        try {
            template.items = JSON.parse(template.items);
        } catch (e) {
            console.warn('⚠️ Error parsing template items JSON:', e);
            template.items = [];
        }
        
        res.json({ message: "success", data: template });
    });
});

// Función para crear checklist automáticamente desde template
async function createChecklistFromTemplate(ticketId, equipmentId) {
    return new Promise((resolve, reject) => {
        // Primero obtener el template
        const templateSql = `
            SELECT ct.*
            FROM ChecklistTemplates ct
            JOIN Equipment e ON (
                (ct.model_id = e.model_id) OR 
                (ct.equipment_type = (SELECT em.category FROM EquipmentModels em WHERE em.id = e.model_id))
            )
            WHERE e.id = ?
            AND ct.is_active = TRUE
            ORDER BY 
                CASE WHEN ct.model_id = e.model_id THEN 0 ELSE 1 END,
                ct.created_at DESC
            LIMIT 1
        `;
        
        db.get(templateSql, [equipmentId], (err, template) => {
            if (err) {
                console.error('❌ Error fetching template for auto-checklist:', err);
                reject(err);
                return;
            }
            
            if (!template) {
                console.log('ℹ️ No template found for equipment:', equipmentId);
                resolve([]);
                return;
            }
            
            console.log('🎯 Creating auto-checklist from template:', template.name);
            
            // Parsear items del template
            let templateItems;
            try {
                templateItems = JSON.parse(template.items);
            } catch (e) {
                console.warn('⚠️ Error parsing template items:', e);
                resolve([]);
                return;
            }
            
            // Crear tareas del checklist para el ticket
            const promises = templateItems.map((item, index) => {
                return new Promise((resolveItem, rejectItem) => {
                    const insertSql = `
                        INSERT INTO TicketChecklists 
                        (ticket_id, title, description, is_completed, order_index)
                        VALUES (?, ?, ?, FALSE, ?)
                    `;
                    
                    db.run(insertSql, [
                        ticketId,
                        item.title,
                        item.description || '',
                        index
                    ], function(err) {
                        if (err) {
                            console.error('❌ Error creating checklist item:', err);
                            rejectItem(err);
                            return;
                        }
                        
                        resolveItem({
                            id: this.lastID,
                            title: item.title,
                            description: item.description || '',
                            is_completed: false,
                            order_index: index
                        });
                    });
                });
            });
            
            Promise.all(promises)
                .then(createdItems => {
                    console.log(`✅ Created ${createdItems.length} checklist items from template "${template.name}"`);
                    resolve(createdItems);
                })
                .catch(reject);
        });
    });
} 

// === INTEGRACIÓN FINANZAS - INVENTARIO ===

// GET métricas integradas finanzas-inventario
app.get('/api/finance-inventory/metrics', (req, res) => {
    console.log('📊 Obteniendo métricas integradas finanzas-inventario...');
    
    const metrics = {};
    let completed = 0;
    const totalQueries = 5;
    
    // 1. Valor total del inventario
    db.get(`
        SELECT 
            SUM(sp.current_stock * COALESCE(poi.unit_cost, 0)) as total_inventory_value,
            COUNT(sp.id) as total_items,
            SUM(CASE WHEN sp.current_stock <= sp.minimum_stock THEN 1 ELSE 0 END) as low_stock_items
        FROM SpareParts sp
        LEFT JOIN (
            SELECT spare_part_id, AVG(unit_cost) as unit_cost
            FROM PurchaseOrderItems
            GROUP BY spare_part_id
        ) poi ON sp.id = poi.spare_part_id
    `, [], (err, inventoryData) => {
        if (err) {
            console.error('❌ Error en consulta de inventario:', err);
            metrics.inventory = { error: err.message };
        } else {
            metrics.inventory = {
                total_value: inventoryData.total_inventory_value || 0,
                total_items: inventoryData.total_items || 0,
                low_stock_items: inventoryData.low_stock_items || 0
            };
        }
        completed++;
        if (completed === totalQueries) sendResponse();
    });
    
    // 2. Gastos en repuestos por mes
    db.all(`
        SELECT 
            DATE_FORMAT(po.order_date, '%Y-%m') as month,
            SUM(po.total_amount) as monthly_spending,
            COUNT(po.id) as orders_count
        FROM PurchaseOrders po
        WHERE po.order_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(po.order_date, '%Y-%m')
        ORDER BY month DESC
        LIMIT 12
    `, [], (err, spendingData) => {
        if (err) {
            console.error('❌ Error en consulta de gastos:', err);
            metrics.spending = { error: err.message };
        } else {
            metrics.spending = spendingData;
        }
        completed++;
        if (completed === totalQueries) sendResponse();
    });
    
    // 3. Top proveedores por gasto
    db.all(`
        SELECT 
            po.supplier,
            SUM(po.total_amount) as total_spent,
            COUNT(po.id) as orders_count,
            AVG(po.total_amount) as avg_order_value
        FROM PurchaseOrders po
        WHERE po.order_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY po.supplier
        ORDER BY total_spent DESC
        LIMIT 10
    `, [], (err, suppliersData) => {
        if (err) {
            console.error('❌ Error en consulta de proveedores:', err);
            metrics.suppliers = { error: err.message };
        } else {
            metrics.suppliers = suppliersData;
        }
        completed++;
        if (completed === totalQueries) sendResponse();
    });
    
    // 4. Rentabilidad por tipo de servicio (cotizaciones vs gastos en repuestos)
    db.all(`
        SELECT 
            'Servicios' as category,
            SUM(CASE WHEN q.status = 'Aprobada' THEN q.total_amount ELSE 0 END) as revenue,
            COUNT(CASE WHEN q.status = 'Aprobada' THEN 1 END) as approved_quotes
        FROM Quotes q
        WHERE q.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        UNION ALL
        SELECT 
            'Inventario' as category,
            SUM(po.total_amount) as costs,
            COUNT(po.id) as purchase_orders
        FROM PurchaseOrders po
        WHERE po.order_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    `, [], (err, profitabilityData) => {
        if (err) {
            console.error('❌ Error en consulta de rentabilidad:', err);
            metrics.profitability = { error: err.message };
        } else {
            metrics.profitability = profitabilityData;
        }
        completed++;
        if (completed === totalQueries) sendResponse();
    });
    
    // 5. Órdenes de compra pendientes por valor
    db.all(`
        SELECT 
            po.id,
            po.order_number,
            po.supplier,
            po.total_amount,
            po.order_date,
            po.expected_delivery,
            DATEDIFF(NOW(), po.order_date) as days_since_order
        FROM PurchaseOrders po
        WHERE po.status IN ('Pendiente', 'Enviada')
        ORDER BY po.total_amount DESC
        LIMIT 10
    `, [], (err, pendingOrdersData) => {
        if (err) {
            console.error('❌ Error en consulta de órdenes pendientes:', err);
            metrics.pending_orders = { error: err.message };
        } else {
            metrics.pending_orders = pendingOrdersData;
        }
        completed++;
        if (completed === totalQueries) sendResponse();
    });
    
    function sendResponse() {
        res.json({
            message: "success",
            data: metrics
        });
    }
});

// POST generar orden de compra desde cotización aprobada
app.post('/api/finance-inventory/generate-purchase-order', (req, res) => {
    const { quote_id, supplier, expected_delivery_days, notes } = req.body;
    
    if (!quote_id || !supplier) {
        return res.status(400).json({ error: "quote_id y supplier son requeridos" });
    }
    
    console.log('🛒 Generando orden de compra desde cotización:', quote_id);
    
    // 1. Obtener datos de la cotización
    db.get(`
        SELECT q.*, c.name as client_name
        FROM Quotes q
        LEFT JOIN Clients c ON q.client_id = c.id
        WHERE q.id = ? AND q.status = 'Aprobada'
    `, [quote_id], (err, quote) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!quote) {
            return res.status(404).json({ error: "Cotización no encontrada o no aprobada" });
        }
        
        // 2. Parsear items de la cotización
        let quoteItems;
        try {
            quoteItems = JSON.parse(quote.items);
        } catch (e) {
            return res.status(400).json({ error: "Error parseando items de la cotización" });
        }
        
        // 3. Filtrar items que sean repuestos (contienen "repuesto", "pieza", etc.)
        const sparePartItems = quoteItems.filter(item => {
            const description = item.description.toLowerCase();
            return description.includes('repuesto') || 
                   description.includes('pieza') || 
                   description.includes('componente') ||
                   description.includes('parte') ||
                   description.includes('filtro') ||
                   description.includes('cable') ||
                   description.includes('tornillo');
        });
        
        if (sparePartItems.length === 0) {
            return res.status(400).json({ error: "No se encontraron repuestos en la cotización" });
        }
        
        // 4. Generar número de orden único
        const orderDate = new Date().toISOString().split('T')[0];
        const orderNumber = `PO-${Date.now()}`;
        const expectedDelivery = expected_delivery_days ? 
            new Date(Date.now() + expected_delivery_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : 
            null;
        
        // 5. Calcular total de repuestos
        const totalAmount = sparePartItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        
        // 6. Crear orden de compra
        const orderSql = `
            INSERT INTO PurchaseOrders 
            (order_number, supplier, order_date, expected_delivery, total_amount, notes, created_by, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendiente')
        `;
        
        const orderNotes = `Generada automáticamente desde cotización #${quote.id} (${quote.title}) - Cliente: ${quote.client_name}\n${notes || ''}`;
        
        db.run(orderSql, [orderNumber, supplier, orderDate, expectedDelivery, totalAmount, orderNotes, 1], function(err) {
            if (err) {
                return res.status(400).json({ error: err.message });
            }
            
            const orderId = this.lastID;
            
            // 7. Crear items de la orden (simplificado - en implementación real se buscarían los spare_part_id)
            // Por ahora crear como nota en la orden
            console.log(`✅ Orden de compra generada: ${orderNumber} (ID: ${orderId})`);
            console.log(`📦 Repuestos incluidos:`, sparePartItems.map(item => `${item.description} (${item.quantity})`));
            
            res.json({
                message: "success",
                data: {
                    order_id: orderId,
                    order_number: orderNumber,
                    quote_id: quote_id,
                    supplier: supplier,
                    total_amount: totalAmount,
                    items_count: sparePartItems.length,
                    spare_parts: sparePartItems
                }
            });
        });
    });
});

// GET análisis de costos por servicio/ticket
app.get('/api/finance-inventory/service-costs/:ticket_id', (req, res) => {
    const ticketId = req.params.ticket_id;
    
    console.log('💰 Analizando costos del ticket:', ticketId);
    
    const serviceAnalysis = {};
    let completed = 0;
    const totalQueries = 3;
    
    // 1. Datos básicos del ticket
    db.get(`
        SELECT 
            t.*,
            c.name as client_name,
            l.name as location_name,
            e.name as equipment_name,
            u.username as technician_name
        FROM Tickets t
        LEFT JOIN Equipment e ON t.equipment_id = e.id
        LEFT JOIN Locations l ON t.location_id = l.id
        LEFT JOIN Clients c ON t.client_id = c.id
        LEFT JOIN Users u ON t.assigned_technician_id = u.id
        WHERE t.id = ?
    `, [ticketId], (err, ticketData) => {
        if (err) {
            serviceAnalysis.ticket = { error: err.message };
        } else {
            serviceAnalysis.ticket = ticketData;
        }
        completed++;
        if (completed === totalQueries) sendResponse();
    });
    
    // 2. Repuestos utilizados
    db.all(`
        SELECT 
            tsp.*,
            sp.name as spare_part_name,
            sp.sku,
            (tsp.quantity_used * tsp.unit_cost) as total_cost
        FROM TicketSpareParts tsp
        LEFT JOIN SpareParts sp ON tsp.spare_part_id = sp.id
        WHERE tsp.ticket_id = ?
    `, [ticketId], (err, sparePartsData) => {
        if (err) {
            serviceAnalysis.spare_parts = { error: err.message };
        } else {
            const totalSparePartsCost = sparePartsData.reduce((sum, item) => sum + (item.total_cost || 0), 0);
            serviceAnalysis.spare_parts = {
                items: sparePartsData,
                total_cost: totalSparePartsCost,
                items_count: sparePartsData.length
            };
        }
        completed++;
        if (completed === totalQueries) sendResponse();
    });
    
    // 3. Tiempo trabajado y costos de mano de obra
    db.all(`
        SELECT 
            tte.*,
            u.username as technician_name,
            (tte.duration_seconds / 3600) as hours_worked
        FROM TicketTimeEntries tte
        LEFT JOIN Users u ON tte.technician_id = u.id
        WHERE tte.ticket_id = ?
    `, [ticketId], (err, timeData) => {
        if (err) {
            serviceAnalysis.time_entries = { error: err.message };
        } else {
            const totalHours = timeData.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
            const hourlyRate = 25000; // CLP por hora (configurable)
            const totalLaborCost = totalHours * hourlyRate;
            
            serviceAnalysis.time_entries = {
                entries: timeData,
                total_hours: totalHours,
                hourly_rate: hourlyRate,
                total_labor_cost: totalLaborCost
            };
        }
        completed++;
        if (completed === totalQueries) sendResponse();
    });
    
    function sendResponse() {
        // Calcular costo total del servicio
        const sparePartsCost = serviceAnalysis.spare_parts?.total_cost || 0;
        const laborCost = serviceAnalysis.time_entries?.total_labor_cost || 0;
        const totalServiceCost = sparePartsCost + laborCost;
        
        serviceAnalysis.summary = {
            spare_parts_cost: sparePartsCost,
            labor_cost: laborCost,
            total_cost: totalServiceCost,
            cost_breakdown: {
                materials_percentage: totalServiceCost > 0 ? Math.round((sparePartsCost / totalServiceCost) * 100) : 0,
                labor_percentage: totalServiceCost > 0 ? Math.round((laborCost / totalServiceCost) * 100) : 0
            }
        };
        
        res.json({
            message: "success",
            data: serviceAnalysis
        });
    }
});

// GET proveedores compartidos entre finanzas e inventario
app.get('/api/finance-inventory/suppliers', (req, res) => {
    console.log('🏪 Obteniendo proveedores compartidos...');
    
    db.all(`
        SELECT 
            supplier as name,
            COUNT(*) as orders_count,
            SUM(total_amount) as total_spent,
            AVG(total_amount) as avg_order_value,
            MIN(order_date) as first_order,
            MAX(order_date) as last_order,
            COUNT(CASE WHEN status = 'Pendiente' THEN 1 END) as pending_orders
        FROM PurchaseOrders
        GROUP BY supplier
        ORDER BY total_spent DESC
    `, [], (err, suppliers) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({
            message: "success",
            data: suppliers
        });
    });
});

// POST actualizar stock automáticamente al recibir orden
app.post('/api/finance-inventory/receive-order/:orderId', (req, res) => {
    const orderId = req.params.orderId;
    const { received_date, notes } = req.body;
    
    console.log('📦 Recibiendo orden de compra:', orderId);
    
    db.serialize(() => {
        db.run("BEGIN TRANSACTION", (err) => {
            if (err) {
                return res.status(500).json({ error: "Error iniciando transacción: " + err.message });
            }
            
            // 1. Actualizar estado de la orden
            db.run(`
                UPDATE PurchaseOrders 
                SET status = 'Recibida', received_date = ?, notes = CONCAT(COALESCE(notes, ''), '\n', ?)
                WHERE id = ?
            `, [received_date || new Date().toISOString().split('T')[0], notes || 'Orden recibida automáticamente', orderId], function(err) {
                if (err) {
                    return db.run("ROLLBACK", () => {
                        res.status(500).json({ error: "Error actualizando orden: " + err.message });
                    });
                }
                
                // 2. Obtener items de la orden
                db.all(`
                    SELECT poi.*, sp.current_stock
                    FROM PurchaseOrderItems poi
                    LEFT JOIN SpareParts sp ON poi.spare_part_id = sp.id
                    WHERE poi.purchase_order_id = ?
                `, [orderId], (err, items) => {
                    if (err) {
                        return db.run("ROLLBACK", () => {
                            res.status(500).json({ error: "Error obteniendo items: " + err.message });
                        });
                    }
                    
                    // 3. Actualizar stock de cada repuesto
                    let itemsProcessed = 0;
                    const errors = [];
                    
                    if (items.length === 0) {
                        // Si no hay items, solo confirmar la transacción
                        return db.run("COMMIT", (err) => {
                            if (err) {
                                return res.status(500).json({ error: "Error confirmando transacción: " + err.message });
                            }
                            res.json({
                                message: "success",
                                data: { order_id: orderId, items_updated: 0 }
                            });
                        });
                    }
                    
                    items.forEach(item => {
                        if (!item.spare_part_id) {
                            itemsProcessed++;
                            errors.push(`Item sin spare_part_id: ${item.id}`);
                            if (itemsProcessed === items.length) finishTransaction();
                            return;
                        }
                        
                        const newStock = (item.current_stock || 0) + item.quantity_ordered;
                        
                        // Actualizar stock
                        db.run(`
                            UPDATE SpareParts 
                            SET current_stock = ?
                            WHERE id = ?
                        `, [newStock, item.spare_part_id], function(err) {
                            if (err) {
                                errors.push(`Error actualizando repuesto ${item.spare_part_id}: ${err.message}`);
                            } else {
                                // Crear transacción de inventario
                                db.run(`
                                    INSERT INTO InventoryTransactions 
                                    (spare_part_id, transaction_type, quantity, quantity_before, quantity_after, reference_type, reference_id, notes, performed_by)
                                    VALUES (?, 'Entrada', ?, ?, ?, 'Purchase Order', ?, ?, ?)
                                `, [
                                    item.spare_part_id, 
                                    item.quantity_ordered, 
                                    item.current_stock || 0, 
                                    newStock, 
                                    orderId, 
                                    `Entrada por recepción de orden ${orderId}`,
                                    1 // TODO: usar usuario actual
                                ], (err) => {
                                    if (err) {
                                        errors.push(`Error creando transacción para repuesto ${item.spare_part_id}: ${err.message}`);
                                    }
                                });
                            }
                            
                            itemsProcessed++;
                            if (itemsProcessed === items.length) finishTransaction();
                        });
                    });
                    
                    function finishTransaction() {
                        if (errors.length > 0) {
                            console.error('❌ Errores procesando items:', errors);
                            return db.run("ROLLBACK", () => {
                                res.status(500).json({ 
                                    error: "Errores actualizando inventario", 
                                    details: errors 
                                });
                            });
                        }
                        
                        db.run("COMMIT", (err) => {
                            if (err) {
                                return res.status(500).json({ error: "Error confirmando transacción: " + err.message });
                            }
                            
                            console.log(`✅ Orden ${orderId} recibida, stock actualizado para ${items.length} repuestos`);
                            res.json({
                                message: "success",
                                data: { 
                                    order_id: orderId, 
                                    items_updated: items.length,
                                    stock_updates: items.map(item => ({
                                        spare_part_id: item.spare_part_id,
                                        quantity_added: item.quantity_ordered,
                                        new_stock: (item.current_stock || 0) + item.quantity_ordered
                                    }))
                                }
                            });
                        });
                    }
                });
            });
        });
    });
});