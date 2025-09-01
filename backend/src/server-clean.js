const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Base de datos - usando adaptador configurable
const dbAdapter = require('./db-adapter');
const db = dbAdapter;

// Servicios de Autenticación
const AuthService = require('./services/authService');

// Validadores
const { 
    validateClient, 
    validateClientUpdate, 
    validateLocation, 
    validateLocationUpdate, 
    validateEquipment, 
    validateEquipmentUpdate 
} = require('./validators');

// ===================================================================
// CONFIGURACIÓN BÁSICA DE EXPRESS
// ===================================================================

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware básico
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Archivos estáticos
app.use(express.static(path.join(__dirname, '../../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads/models/'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes (JPEG, JPG, PNG, GIF)'));
        }
    }
});

const uploadManuals = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const allowedMimes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const mimetype = allowedMimes.includes(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Solo se permiten documentos PDF, DOC y DOCX'));
        }
    }
});

// ===================================================================
// MIDDLEWARE DE AUTENTICACIÓN Y AUTORIZACIÓN
// ===================================================================

// Verificar token JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            error: 'Token de acceso requerido',
            code: 'MISSING_TOKEN'
        });
    }

    jwt.verify(token, AuthService.JWT_SECRET, (err, user) => {
        if (err) {
            console.log('❌ Token inválido:', err.message);
            return res.status(403).json({
                error: 'Token inválido o expirado',
                code: 'INVALID_TOKEN'
            });
        }
        req.user = user;
        next();
    });
}

// Middleware para verificar roles
function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Usuario no autenticado',
                code: 'NOT_AUTHENTICATED'
            });
        }

        const userRole = req.user.role;
        const hasPermission = roles.some(role => {
            if (role === 'Admin') {
                return userRole === 'Admin' || userRole === 'Administrador';
            }
            return userRole === role;
        });

        if (!hasPermission) {
            return res.status(403).json({
                error: 'Permisos insuficientes',
                code: 'INSUFFICIENT_PERMISSIONS',
                required: roles,
                current: userRole
            });
        }

        next();
    };
}

// ===================================================================
// RUTAS DE AUTENTICACIÓN
// ===================================================================

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

app.post('/api/auth/logout', authenticateToken, (req, res) => {
    console.log(`📤 Logout del usuario: ${req.user.username}`);
    
    res.json({
        message: 'Logout exitoso'
    });
});

app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({
        message: 'Token válido',
        user: req.user
    });
});

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

// ===================================================================
// RUTAS PRINCIPALES - CLIENTES
// ===================================================================

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

app.post('/api/clients', (req, res) => {
    const { name, legal_name, rut, address, phone, email, business_activity, contact_name } = req.body;
    
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

app.put("/api/clients/:id", (req, res) => {
    const { name, legal_name, rut, address, phone, email, business_activity, contact_name } = req.body;
    
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

app.delete("/api/clients/:id", (req, res) => {
    const clientId = req.params.id;
    console.log(`🗑️ Iniciando eliminación en cascada para cliente ID: ${clientId}`);
    
    db.serialize(() => {
        db.run("BEGIN TRANSACTION", (err) => {
            if (err) {
                console.error("❌ Error al iniciar transacción:", err);
                return res.status(500).json({"error": "Error al iniciar transacción: " + err.message});
            }
            
            console.log("📋 Paso 1: Eliminando fotos de equipos...");
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

// ===================================================================
// RUTAS PRINCIPALES - SEDES/UBICACIONES
// ===================================================================

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

app.get('/api/clients/:clientId/locations', (req, res) => {
    const { clientId } = req.params;
    
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

app.post('/api/locations', (req, res) => {
    const { name, address, client_id } = req.body;
    
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

app.put("/api/locations/:id", (req, res) => {
    const { name, address } = req.body;
    
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

app.delete("/api/locations/:id", (req, res) => {
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
            console.error('Error fetching equipment for location:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log(`✅ Equipment found for location ${locationId}:`, rows.length, 'items');
        res.json(rows);
    });
});

// ===================================================================
// IMPORTAR MÓDULOS DE FASES AVANZADAS
// ===================================================================

// FASE 1 ENHANCEMENTS - Sistema de Contratos y Workflow
try {
    const contractsSlaRoutes = require('./routes/contracts-sla');
    const checklistRoutes = require('./routes/checklist');
    const workflowRoutes = require('./routes/workflow');
    
    app.use('/api', contractsSlaRoutes);
    app.use('/api', checklistRoutes);
    app.use('/api', workflowRoutes);
    
    console.log('✅ Fase 1 Routes loaded: Contratos SLA, Checklist, Workflow');
} catch (error) {
    console.warn('⚠️  Warning: Some Fase 1 routes could not be loaded:', error.message);
}

// FASE 2 ENHANCEMENTS - Sistema de Notificaciones Inteligentes
try {
    const notificationsRoutes = require('./routes/notifications');
    
    app.use('/api/notifications', notificationsRoutes);
    
    console.log('✅ Fase 2 Routes loaded: Sistema de Notificaciones Inteligentes');
} catch (error) {
    console.warn('⚠️  Warning: Some Fase 2 routes could not be loaded:', error.message);
}

// FASE 3 ENHANCEMENTS - Sistema de Inventario Inteligente y Reportes
try {
    const inventoryRoutes = require('./routes/inventory');
    
    app.use('/api/inventory', inventoryRoutes);
    
    console.log('✅ Fase 3 Routes loaded: Sistema de Inventario Inteligente y Reportes');
} catch (error) {
    console.warn('⚠️  Warning: Some Fase 3 routes could not be loaded:', error.message);
}

// ===================================================================
// FUNCIONES UTILITARIAS
// ===================================================================

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

async function createChecklistFromTemplate(ticketId, equipmentId) {
    return new Promise((resolve, reject) => {
        const equipmentSql = `
            SELECT e.type, em.category 
            FROM Equipment e 
            LEFT JOIN EquipmentModels em ON e.model_id = em.id 
            WHERE e.id = ?
        `;
        
        db.get(equipmentSql, [equipmentId], (err, equipment) => {
            if (err) {
                reject(err);
                return;
            }
            
            if (!equipment) {
                resolve([]);
                return;
            }
            
            const templates = {
                'Cardiovascular': [
                    'Verificar funcionamiento de pantalla',
                    'Revisar calibración de velocidad',
                    'Inspeccionar correa de transmisión',
                    'Verificar sistema de inclinación',
                    'Probar botones de emergencia',
                    'Limpiar y lubricar componentes móviles'
                ],
                'Fuerza': [
                    'Verificar cables y poleas',
                    'Inspeccionar pesos y contrapesos',
                    'Revisar sistema de seguridad',
                    'Lubricar articulaciones',
                    'Verificar ajustes de asiento',
                    'Probar funcionamiento suave'
                ],
                'Funcional': [
                    'Inspeccionar estructura general',
                    'Verificar estabilidad',
                    'Revisar superficie antideslizante',
                    'Inspeccionar conectores',
                    'Verificar sistema de agarre'
                ],
                'default': [
                    'Inspección visual general',
                    'Verificar funcionamiento básico',
                    'Revisar seguridad del equipo',
                    'Limpiar equipo',
                    'Documentar hallazgos'
                ]
            };
            
            const category = equipment.category || equipment.type || 'default';
            const tasks = templates[category] || templates['default'];
            
            let insertedTasks = [];
            let completed = 0;
            
            if (tasks.length === 0) {
                resolve([]);
                return;
            }
            
            tasks.forEach((task, index) => {
                const sql = `INSERT INTO ticketchecklists (ticket_id, title, order_index) VALUES (?, ?, ?)`;
                db.run(sql, [ticketId, task, index], function(err) {
                    if (err) {
                        console.error('Error insertando tarea de checklist:', err);
                    } else {
                        insertedTasks.push({
                            id: this.lastID,
                            ticket_id: ticketId,
                            title: task,
                            order_index: index,
                            is_completed: false,
                            created_at: new Date().toISOString()
                        });
                    }
                    
                    completed++;
                    if (completed === tasks.length) {
                        resolve(insertedTasks);
                    }
                });
            });
        });
    });
}

// ===================================================================
// RUTAS DE TICKETS - SISTEMA DE TICKETS DE MANTENIMIENTO
// ===================================================================

// GET all tickets
app.get('/api/tickets', authenticateToken, (req, res) => {
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
        console.log(`✅ Tickets encontrados: ${rows.length}`);
        res.json({
            message: "success",
            data: rows
        });
    });
});

// GET a single ticket by id
app.get('/api/tickets/:id', authenticateToken, (req, res) => {
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
        LEFT JOIN Locations l ON t.location_id = l.id
        WHERE t.id = ?
    `;
    
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            console.error('❌ Error obteniendo ticket:', err.message);
            res.status(500).json({ "error": err.message });
            return;
        }
        if (!row) {
            return res.status(404).json({ error: "Ticket no encontrado" });
        }
        res.json({
            message: "success",
            data: row
        });
    });
});

// GET detailed ticket information (for ticket-detail page)
app.get('/api/tickets/:id/detail', authenticateToken, (req, res) => {
    const ticketId = req.params.id;
    console.log(`🔍 Obteniendo detalle completo del ticket ID: ${ticketId}`);
    
    // Query principal del ticket con información completa
    const ticketSql = `
        SELECT 
            t.*,
            c.name as client_name,
            c.legal_name as client_legal_name,
            c.rut as client_rut,
            c.address as client_address,
            c.phone as client_phone,
            c.email as client_email,
            l.name as location_name,
            l.address as location_address,
            e.name as equipment_name,
            e.custom_id as equipment_custom_id,
            e.serial_number as equipment_serial,
            e.acquisition_date as equipment_installation,
            em.name as equipment_model_name,
            em.category as equipment_category,
            em.brand as equipment_brand,
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
        if (err) {
            console.error('❌ Error obteniendo ticket:', err.message);
            return res.status(500).json({ 
                error: 'Error interno del servidor al obtener ticket',
                code: 'TICKET_FETCH_ERROR'
            });
        }
        
        if (!ticket) {
            console.log(`❌ Ticket ${ticketId} no encontrado`);
            return res.status(404).json({ 
                error: "Ticket no encontrado",
                code: 'TICKET_NOT_FOUND'
            });
        }
        
        console.log(`✅ Ticket ${ticketId} encontrado: ${ticket.title}`);
        
        // Obtener fotos del ticket (con manejo robusto de errores)
        const photosSql = `SELECT * FROM TicketPhotos WHERE ticket_id = ? ORDER BY created_at DESC`;
        
        db.all(photosSql, [ticketId], (photoErr, photos) => {
            if (photoErr) {
                console.log('⚠️ Error obteniendo fotos (continuando sin fotos):', photoErr.message);
                photos = [];
            }
            
            console.log(`📸 Encontradas ${photos ? photos.length : 0} fotos para ticket ${ticketId}`);
            
            // Verificar si tabla TicketActivities existe antes de consultarla
            const checkTableSql = `SHOW TABLES LIKE 'TicketActivities'`;
            
            db.all(checkTableSql, [], (checkErr, tableExists) => {
                let activities = [];
                
                if (checkErr || !tableExists || tableExists.length === 0) {
                    console.log('⚠️ Tabla TicketActivities no existe, continuando sin actividades...');
                    
                    // Continuar directamente con la respuesta
                    const detailedTicket = {
                        ...ticket,
                        photos: photos || [],
                        activities: [],
                        metadata: {
                            photos_count: photos ? photos.length : 0,
                            activities_count: 0,
                            last_updated: ticket.updated_at,
                            created_date: ticket.created_at
                        }
                    };
                    
                    console.log(`✅ Detalle completo del ticket ${ticketId} preparado`);
                    
                    return res.json({
                        success: true,
                        message: "success", 
                        data: detailedTicket
                    });
                } else {
                    // La tabla existe, consultar actividades
                    const activitiesSql = `SELECT * FROM TicketActivities WHERE ticket_id = ? ORDER BY created_at DESC`;
                    
                    db.all(activitiesSql, [ticketId], (actErr, activities) => {
                        if (actErr) {
                            console.log('⚠️ Error obteniendo actividades (continuando sin actividades):', actErr.message);
                            activities = [];
                        }
                        
                        console.log(`📋 Encontradas ${activities ? activities.length : 0} actividades para ticket ${ticketId}`);
                        
                        // Estructurar respuesta completa
                        const detailedTicket = {
                            ...ticket,
                            photos: photos || [],
                            activities: activities || [],
                            metadata: {
                                photos_count: photos ? photos.length : 0,
                                activities_count: activities ? activities.length : 0,
                                last_updated: ticket.updated_at,
                                created_date: ticket.created_at
                            }
                        };
                        
                        console.log(`✅ Detalle completo del ticket ${ticketId} preparado`);
                        
                        return res.json({
                            success: true,
                            message: "success", 
                            data: detailedTicket
                        });
                    });
                }
            });
        });
    });
});

// POST new ticket
app.post('/api/tickets', authenticateToken, (req, res) => {
    const { client_id, location_id, equipment_id, title, description, priority, due_date } = req.body;

    // Basic validation
    if (!title || !client_id || !priority) {
        return res.status(400).json({ error: "Título, Cliente y Prioridad son campos obligatorios." });
    }

    const sql = `INSERT INTO Tickets (client_id, location_id, equipment_id, title, description, priority, due_date, status, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
    const params = [client_id, location_id || null, equipment_id || null, title, description, priority, due_date || null, 'Abierto'];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error creando ticket:', err.message);
            res.status(500).json({ "error": err.message });
            return;
        }
        console.log(`✅ Ticket creado con ID: ${this.lastID}`);
        res.status(201).json({
            message: "success",
            data: { id: this.lastID, ...req.body, status: 'Abierto' }
        });
    });
});

// PUT (update) a ticket
app.put('/api/tickets/:id', authenticateToken, (req, res) => {
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
            console.error('❌ Error actualizando ticket:', err.message);
            res.status(500).json({ "error": err.message });
            return;
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "Ticket no encontrado." });
        }
        console.log(`✅ Ticket ${req.params.id} actualizado`);
        res.json({
            message: "success",
            changes: this.changes
        });
    });
});

// DELETE a ticket
app.delete('/api/tickets/:id', authenticateToken, (req, res) => {
    const sql = 'DELETE FROM Tickets WHERE id = ?';
    db.run(sql, [req.params.id], function(err) {
        if (err) {
            console.error('❌ Error eliminando ticket:', err.message);
            res.status(500).json({ "error": err.message });
            return;
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "Ticket no encontrado." });
        }
        console.log(`✅ Ticket ${req.params.id} eliminado`);
        res.json({ "message": "deleted", changes: this.changes });
    });
});

// ===================================================================
// RUTAS DE NOTAS DE TICKETS
// ===================================================================

// GET all notes for a specific ticket
app.get('/api/tickets/:ticketId/notes', authenticateToken, (req, res) => {
    const { ticketId } = req.params;
    const sql = `
        SELECT * FROM TicketNotes 
        WHERE ticket_id = ? 
        ORDER BY created_at DESC
    `;
    db.all(sql, [ticketId], (err, rows) => {
        if (err) {
            console.error('❌ Error obteniendo notas de ticket:', err.message);
            res.status(500).json({ error: 'Error al obtener notas del ticket' });
            return;
        }
        res.json({
            message: "success",
            data: rows || []
        });
    });
});

// POST new note for ticket
app.post('/api/tickets/:ticketId/notes', authenticateToken, (req, res) => {
    const { ticketId } = req.params;
    const { note, note_type, author, is_internal } = req.body;
    
    if (!note || note.trim() === '') {
        return res.status(400).json({ 
            error: "La nota no puede estar vacía",
            code: 'NOTE_REQUIRED'
        });
    }
    
    const sql = `INSERT INTO TicketNotes 
                 (ticket_id, note, note_type, author, is_internal, created_at) 
                 VALUES (?, ?, ?, ?, ?, NOW())`;
    const params = [
        parseInt(ticketId), 
        note.trim(), 
        note_type || 'General', 
        author || (req.user ? req.user.username : 'Sistema'), 
        is_internal || false
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error agregando nota de ticket:', err.message);
            res.status(500).json({ 
                error: 'Error al agregar nota al ticket',
                code: 'NOTE_INSERT_ERROR'
            });
            return;
        }
        
        console.log(`✅ Nota agregada al ticket ${ticketId}, ID: ${this.lastID}`);
        
        // Obtener la nota recién creada
        db.get('SELECT * FROM TicketNotes WHERE id = ?', [this.lastID], (err, newNote) => {
            if (err) {
                console.error('❌ Error obteniendo nota creada:', err.message);
                return res.status(500).json({ 
                    error: 'Error al obtener nota creada',
                    code: 'NOTE_RETRIEVE_ERROR'
                });
            }
            
            res.status(201).json({
                message: "Nota agregada exitosamente",
                data: newNote
            });
        });
    });
});

// DELETE note from ticket
app.delete('/api/tickets/notes/:noteId', authenticateToken, (req, res) => {
    const { noteId } = req.params;
    
    const sql = 'DELETE FROM TicketNotes WHERE id = ?';
    db.run(sql, [noteId], function(err) {
        if (err) {
            console.error('❌ Error eliminando nota de ticket:', err.message);
            res.status(500).json({ 
                error: 'Error al eliminar nota del ticket',
                code: 'NOTE_DELETE_ERROR'
            });
            return;
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ 
                error: "Nota no encontrada",
                code: 'NOTE_NOT_FOUND'
            });
        }
        
        console.log(`✅ Nota ${noteId} eliminada`);
        res.json({ 
            message: "Nota eliminada exitosamente", 
            changes: this.changes 
        });
    });
});

// ===================================================================
// RUTAS DE FOTOS DE TICKETS
// ===================================================================

// GET all photos for a specific ticket
app.get('/api/tickets/:ticketId/photos', authenticateToken, (req, res) => {
    const { ticketId } = req.params;
    const sql = `
        SELECT * FROM TicketPhotos 
        WHERE ticket_id = ? 
        ORDER BY created_at DESC
    `;
    db.all(sql, [ticketId], (err, rows) => {
        if (err) {
            console.error('❌ Error obteniendo fotos de ticket:', err.message);
            res.status(500).json({ 
                error: 'Error al obtener fotos del ticket',
                code: 'PHOTOS_FETCH_ERROR'
            });
            return;
        }
        res.json({
            message: "success",
            data: rows || []
        });
    });
});

// POST new photo for ticket
app.post('/api/tickets/:ticketId/photos', authenticateToken, (req, res) => {
    const { ticketId } = req.params;
    const { photo_data, file_name, mime_type, file_size, description, photo_type } = req.body;
    
    if (!photo_data || !mime_type) {
        return res.status(400).json({ 
            error: "photo_data y mime_type son requeridos",
            code: 'PHOTO_DATA_REQUIRED'
        });
    }
    
    // Validar tamaño del archivo (límite 10MB en base64)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (photo_data.length > maxSize) {
        return res.status(400).json({
            error: "La imagen es demasiado grande (máximo 10MB)",
            code: 'FILE_TOO_LARGE'
        });
    }
    
    const sql = `INSERT INTO TicketPhotos 
                 (ticket_id, photo_data, file_name, mime_type, file_size, description, photo_type, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`;
    const params = [
        parseInt(ticketId), 
        photo_data, 
        file_name || 'foto.jpg', 
        mime_type, 
        file_size || 0, 
        description || null, 
        photo_type || 'Otros'
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error agregando foto de ticket:', err.message);
            res.status(500).json({ 
                error: 'Error al agregar foto al ticket',
                code: 'PHOTO_INSERT_ERROR'
            });
            return;
        }
        
        console.log(`✅ Foto agregada al ticket ${ticketId}, ID: ${this.lastID}`);
        
        // Obtener la foto recién creada (sin el photo_data para evitar respuesta grande)
        db.get('SELECT id, ticket_id, file_name, mime_type, file_size, description, photo_type, created_at FROM TicketPhotos WHERE id = ?', [this.lastID], (err, newPhoto) => {
            if (err) {
                console.error('❌ Error obteniendo foto creada:', err.message);
                return res.status(500).json({ 
                    error: 'Error al obtener foto creada',
                    code: 'PHOTO_RETRIEVE_ERROR'
                });
            }
            
            res.status(201).json({
                message: "Foto agregada exitosamente",
                data: newPhoto
            });
        });
    });
});

// DELETE a ticket photo
app.delete('/api/tickets/photos/:photoId', authenticateToken, (req, res) => {
    const { photoId } = req.params;
    
    const sql = 'DELETE FROM TicketPhotos WHERE id = ?';
    db.run(sql, [photoId], function(err) {
        if (err) {
            console.error('❌ Error eliminando foto de ticket:', err.message);
            res.status(500).json({ 
                error: 'Error al eliminar foto del ticket',
                code: 'PHOTO_DELETE_ERROR'
            });
            return;
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ 
                error: "Foto no encontrada",
                code: 'PHOTO_NOT_FOUND'
            });
        }
        
        console.log(`✅ Foto ${photoId} eliminada`);
        res.json({ 
            message: "Foto eliminada exitosamente", 
            changes: this.changes 
        });
    });
});

// ===================================================================
// RUTAS DEL DASHBOARD - KPIs Y ACTIVIDAD
// ===================================================================

// Endpoint para obtener KPIs del dashboard
app.get('/api/dashboard/kpis', authenticateToken, (req, res) => {
    console.log('📊 Solicitando KPIs del dashboard...');
    
    // Realizar múltiples consultas para obtener KPIs
    const queries = [
        // Total de clientes
        new Promise((resolve, reject) => {
            db.all('SELECT COUNT(*) as total FROM Clients', [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'total_clients', value: rows[0].total });
            });
        }),
        
        // Total de equipos
        new Promise((resolve, reject) => {
            db.all('SELECT COUNT(*) as total FROM Equipment', [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'total_equipment', value: rows[0].total });
            });
        }),
        
        // Tickets abiertos
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(*) as total FROM Tickets WHERE status IN ('Abierto', 'En Progreso')`, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'open_tickets', value: rows[0].total });
            });
        }),
        
        // Tickets completados este mes
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total 
                FROM Tickets 
                WHERE status = 'Completado' 
                AND DATE(updated_at) >= DATE_SUB(CURDATE(), INTERVAL DAY(CURDATE())-1 DAY)
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'completed_tickets_month', value: rows[0].total });
            });
        }),
        
        // Tiempo promedio de resolución (en días)
        new Promise((resolve, reject) => {
            db.all(`
                SELECT AVG(DATEDIFF(updated_at, created_at)) as avg_resolution_time
                FROM Tickets 
                WHERE status = 'Completado'
                AND updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ 
                    metric: 'avg_resolution_time', 
                    value: rows[0].avg_resolution_time ? Math.round(rows[0].avg_resolution_time * 10) / 10 : 0 
                });
            });
        }),
        
        // Ubicaciones activas
        new Promise((resolve, reject) => {
            db.all('SELECT COUNT(*) as total FROM Locations', [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'total_locations', value: rows[0].total });
            });
        })
    ];
    
    Promise.all(queries)
        .then(results => {
            const kpis = {};
            results.forEach(result => {
                kpis[result.metric] = result.value;
            });
            
            console.log('✅ KPIs calculados:', kpis);
            res.json({
                message: 'success',
                data: kpis,
                timestamp: new Date().toISOString()
            });
        })
        .catch(error => {
            console.error('❌ Error calculando KPIs:', error);
            res.status(500).json({ 
                error: 'Error obteniendo KPIs',
                details: error.message 
            });
        });
});

// Endpoint para obtener actividad reciente
app.get('/api/dashboard/activity', authenticateToken, (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    console.log(`📋 Solicitando actividad reciente (límite: ${limit})...`);
    
    const sql = `
        SELECT 
            'ticket' as type,
            t.id as reference_id,
            CONCAT('Ticket #', t.id, ': ', t.title) as description,
            t.status,
            t.priority,
            t.updated_at as timestamp,
            c.name as client_name,
            l.name as location_name
        FROM Tickets t
        LEFT JOIN Equipment e ON t.equipment_id = e.id
        LEFT JOIN Locations l ON e.location_id = l.id
        LEFT JOIN Clients c ON l.client_id = c.id
        WHERE t.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        
        UNION ALL
        
        SELECT 
            'equipment' as type,
            e.id as reference_id,
            CONCAT('Equipo registrado: ', e.name) as description,
            'activo' as status,
            'Normal' as priority,
            e.created_at as timestamp,
            c.name as client_name,
            l.name as location_name
        FROM Equipment e
        LEFT JOIN Locations l ON e.location_id = l.id
        LEFT JOIN Clients c ON l.client_id = c.id
        WHERE e.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        
        ORDER BY timestamp DESC
        LIMIT ?
    `;
    
    db.all(sql, [limit], (err, rows) => {
        if (err) {
            console.error('❌ Error obteniendo actividad:', err);
            res.status(500).json({ 
                error: 'Error obteniendo actividad',
                details: err.message 
            });
            return;
        }
        
        console.log(`✅ Actividad obtenida: ${rows.length} registros`);
        res.json({
            message: 'success',
            data: rows,
            count: rows.length,
            timestamp: new Date().toISOString()
        });
    });
});

// ===================================================================
// MANEJADORES GLOBALES DE ERRORES Y FINALIZACIÓN
// ===================================================================

// ===================================================================
// ENDPOINTS DE MODELOS
// ===================================================================

// GET /api/models - Obtener todos los modelos
app.get('/api/models', async (req, res) => {
    try {
        console.log('📋 Obteniendo lista de modelos...');
        
        const query = `
            SELECT DISTINCT modelo 
            FROM equipment 
            WHERE modelo IS NOT NULL 
            AND modelo != '' 
            ORDER BY modelo ASC
        `;
        
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('❌ Error obteniendo modelos:', err);
                return res.status(500).json({
                    error: 'Error al obtener modelos',
                    details: err.message
                });
            }
            
            const models = rows.map(row => row.modelo);
            console.log(`✅ ${models.length} modelos encontrados`);
            
            res.json({
                success: true,
                models: models,
                count: models.length
            });
        });
        
    } catch (error) {
        console.error('💥 Error en endpoint de modelos:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// POST /api/models - Crear un nuevo modelo
app.post('/api/models', authenticateToken, async (req, res) => {
    try {
        const { modelo, marca, categoria } = req.body;
        
        if (!modelo) {
            return res.status(400).json({
                error: 'El nombre del modelo es requerido'
            });
        }
        
        console.log('📝 Creando nuevo modelo:', modelo);
        
        // Verificar si el modelo ya existe
        const checkQuery = `
            SELECT COUNT(*) as count 
            FROM equipment 
            WHERE modelo = ?
        `;
        
        db.get(checkQuery, [modelo], (err, row) => {
            if (err) {
                console.error('❌ Error verificando modelo:', err);
                return res.status(500).json({
                    error: 'Error al verificar modelo',
                    details: err.message
                });
            }
            
            if (row.count > 0) {
                return res.status(409).json({
                    error: 'El modelo ya existe'
                });
            }
            
            // Crear entrada básica para el modelo
            const insertQuery = `
                INSERT INTO equipment (modelo, marca, categoria, estado, ubicacion)
                VALUES (?, ?, ?, 'Disponible', 'Almacén')
            `;
            
            db.run(insertQuery, [modelo, marca || 'Sin especificar', categoria || 'General'], function(err) {
                if (err) {
                    console.error('❌ Error creando modelo:', err);
                    return res.status(500).json({
                        error: 'Error al crear modelo',
                        details: err.message
                    });
                }
                
                console.log(`✅ Modelo creado con ID: ${this.lastID}`);
                
                res.status(201).json({
                    success: true,
                    message: 'Modelo creado exitosamente',
                    modelId: this.lastID,
                    modelo: modelo
                });
            });
        });
        
    } catch (error) {
        console.error('💥 Error en creación de modelo:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// ===================================================================
// RUTAS DE GASTOS - SISTEMA FINANCIERO
// ===================================================================

// GET /api/expenses - Obtener todos los gastos
app.get('/api/expenses', authenticateToken, (req, res) => {
    console.log('💸 Obteniendo lista de gastos...');
    
    const { status, category, date_from, date_to, limit = 50, offset = 0 } = req.query;
    
    let sql = `
        SELECT 
            e.*,
            ec.name as category_name,
            u_created.username as created_by_name,
            u_approved.username as approved_by_name
        FROM Expenses e
        LEFT JOIN ExpenseCategories ec ON e.category_id = ec.id
        LEFT JOIN Users u_created ON e.created_by = u_created.id
        LEFT JOIN Users u_approved ON e.approved_by = u_approved.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
        sql += ` AND e.status = ?`;
        params.push(status);
    }
    
    if (category) {
        sql += ` AND (e.category = ? OR ec.name = ?)`;
        params.push(category, category);
    }
    
    if (date_from) {
        sql += ` AND e.date >= ?`;
        params.push(date_from);
    }
    
    if (date_to) {
        sql += ` AND e.date <= ?`;
        params.push(date_to);
    }
    
    sql += ` ORDER BY e.date DESC, e.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('❌ Error obteniendo gastos:', err);
            res.status(500).json({ 
                error: 'Error obteniendo gastos',
                details: err.message 
            });
            return;
        }
        
        console.log(`✅ ${rows.length} gastos obtenidos`);
        res.json({
            message: 'success',
            data: rows,
            total: rows.length,
            offset: parseInt(offset),
            limit: parseInt(limit)
        });
    });
});

// POST /api/expenses - Crear nuevo gasto
app.post('/api/expenses', authenticateToken, (req, res) => {
    const {
        category,
        category_id,
        description,
        amount,
        date,
        supplier,
        receipt_number,
        payment_method,
        reference_type,
        reference_id,
        notes,
        receipt_file
    } = req.body;
    
    // Validaciones básicas
    if (!description || !amount || !date) {
        return res.status(400).json({
            error: 'Descripción, monto y fecha son requeridos'
        });
    }
    
    if (amount <= 0) {
        return res.status(400).json({
            error: 'El monto debe ser mayor a 0'
        });
    }
    
    console.log(`💸 Creando nuevo gasto: ${description} - $${amount}`);
    
    const sql = `
        INSERT INTO Expenses (
            category_id, category, description, amount, date, supplier,
            receipt_number, payment_method, reference_type, reference_id,
            notes, receipt_file, created_by, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente')
    `;
    
    const params = [
        category_id || null,
        category || 'Otros',
        description,
        amount,
        date,
        supplier || null,
        receipt_number || null,
        payment_method || null,
        reference_type || 'General',
        reference_id || null,
        notes || null,
        receipt_file || null,
        req.user.id
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error creando gasto:', err);
            res.status(500).json({
                error: 'Error al crear gasto',
                details: err.message
            });
            return;
        }
        
        console.log(`✅ Gasto creado con ID: ${this.lastID}`);
        
        // Obtener el gasto completo creado
        const getSql = `
            SELECT 
                e.*,
                ec.name as category_name,
                u.username as created_by_name
            FROM Expenses e
            LEFT JOIN ExpenseCategories ec ON e.category_id = ec.id
            LEFT JOIN Users u ON e.created_by = u.id
            WHERE e.id = ?
        `;
        
        db.get(getSql, [this.lastID], (err, row) => {
            if (err) {
                console.error('❌ Error obteniendo gasto creado:', err);
                res.status(201).json({
                    message: 'Gasto creado exitosamente',
                    id: this.lastID
                });
                return;
            }
            
            res.status(201).json({
                message: 'Gasto creado exitosamente',
                data: row
            });
        });
    });
});

// PUT /api/expenses/:id - Actualizar gasto
app.put('/api/expenses/:id', authenticateToken, (req, res) => {
    const expenseId = req.params.id;
    const {
        category,
        category_id,
        description,
        amount,
        date,
        supplier,
        receipt_number,
        payment_method,
        reference_type,
        reference_id,
        notes,
        receipt_file
    } = req.body;
    
    console.log(`💸 Actualizando gasto ID: ${expenseId}`);
    
    // Primero verificar que el gasto existe y obtener su estado actual
    const checkSql = `SELECT status, created_by FROM Expenses WHERE id = ?`;
    
    db.get(checkSql, [expenseId], (err, expense) => {
        if (err) {
            console.error('❌ Error verificando gasto:', err);
            return res.status(500).json({
                error: 'Error verificando gasto',
                details: err.message
            });
        }
        
        if (!expense) {
            return res.status(404).json({
                error: 'Gasto no encontrado'
            });
        }
        
        // Solo el creador o admin puede editar gastos pendientes
        if (expense.status !== 'Pendiente' && req.user.role !== 'Admin') {
            return res.status(403).json({
                error: 'Solo se pueden editar gastos pendientes'
            });
        }
        
        if (expense.created_by !== req.user.id && req.user.role !== 'Admin') {
            return res.status(403).json({
                error: 'No tienes permisos para editar este gasto'
            });
        }
        
        const sql = `
            UPDATE Expenses SET
                category_id = COALESCE(?, category_id),
                category = COALESCE(?, category),
                description = COALESCE(?, description),
                amount = COALESCE(?, amount),
                date = COALESCE(?, date),
                supplier = COALESCE(?, supplier),
                receipt_number = COALESCE(?, receipt_number),
                payment_method = COALESCE(?, payment_method),
                reference_type = COALESCE(?, reference_type),
                reference_id = COALESCE(?, reference_id),
                notes = COALESCE(?, notes),
                receipt_file = COALESCE(?, receipt_file),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        const params = [
            category_id,
            category,
            description,
            amount,
            date,
            supplier,
            receipt_number,
            payment_method,
            reference_type,
            reference_id,
            notes,
            receipt_file,
            expenseId
        ];
        
        db.run(sql, params, function(err) {
            if (err) {
                console.error('❌ Error actualizando gasto:', err);
                return res.status(500).json({
                    error: 'Error al actualizar gasto',
                    details: err.message
                });
            }
            
            console.log(`✅ Gasto ${expenseId} actualizado`);
            
            // Obtener el gasto actualizado
            const getSql = `
                SELECT 
                    e.*,
                    ec.name as category_name,
                    u_created.username as created_by_name,
                    u_approved.username as approved_by_name
                FROM Expenses e
                LEFT JOIN ExpenseCategories ec ON e.category_id = ec.id
                LEFT JOIN Users u_created ON e.created_by = u_created.id
                LEFT JOIN Users u_approved ON e.approved_by = u_approved.id
                WHERE e.id = ?
            `;
            
            db.get(getSql, [expenseId], (err, row) => {
                if (err) {
                    console.error('❌ Error obteniendo gasto actualizado:', err);
                    return res.json({
                        message: 'Gasto actualizado exitosamente',
                        changes: this.changes
                    });
                }
                
                res.json({
                    message: 'Gasto actualizado exitosamente',
                    data: row,
                    changes: this.changes
                });
            });
        });
    });
});

// PUT /api/expenses/:id/approve - Aprobar gasto
app.put('/api/expenses/:id/approve', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const expenseId = req.params.id;
    const { notes } = req.body;
    
    console.log(`✅ Aprobando gasto ID: ${expenseId} por usuario: ${req.user.username}`);
    
    const sql = `
        UPDATE Expenses SET
            status = 'Aprobado',
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP,
            notes = COALESCE(?, notes),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'Pendiente'
    `;
    
    db.run(sql, [req.user.id, notes, expenseId], function(err) {
        if (err) {
            console.error('❌ Error aprobando gasto:', err);
            return res.status(500).json({
                error: 'Error al aprobar gasto',
                details: err.message
            });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({
                error: 'Gasto no encontrado o ya fue procesado'
            });
        }
        
        console.log(`✅ Gasto ${expenseId} aprobado exitosamente`);
        
        res.json({
            message: 'Gasto aprobado exitosamente',
            expense_id: expenseId,
            approved_by: req.user.username,
            approved_at: new Date().toISOString()
        });
    });
});

// PUT /api/expenses/:id/reject - Rechazar gasto
app.put('/api/expenses/:id/reject', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const expenseId = req.params.id;
    const { notes } = req.body;
    
    if (!notes) {
        return res.status(400).json({
            error: 'Se requiere una nota explicando el motivo del rechazo'
        });
    }
    
    console.log(`❌ Rechazando gasto ID: ${expenseId} por usuario: ${req.user.username}`);
    
    const sql = `
        UPDATE Expenses SET
            status = 'Rechazado',
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP,
            notes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'Pendiente'
    `;
    
    db.run(sql, [req.user.id, notes, expenseId], function(err) {
        if (err) {
            console.error('❌ Error rechazando gasto:', err);
            return res.status(500).json({
                error: 'Error al rechazar gasto',
                details: err.message
            });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({
                error: 'Gasto no encontrado o ya fue procesado'
            });
        }
        
        console.log(`❌ Gasto ${expenseId} rechazado exitosamente`);
        
        res.json({
            message: 'Gasto rechazado exitosamente',
            expense_id: expenseId,
            rejected_by: req.user.username,
            rejected_at: new Date().toISOString(),
            reason: notes
        });
    });
});

// PUT /api/expenses/:id/pay - Marcar gasto como pagado
app.put('/api/expenses/:id/pay', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const expenseId = req.params.id;
    const { payment_method, payment_notes } = req.body;
    
    console.log(`💳 Marcando gasto ID: ${expenseId} como pagado`);
    
    const sql = `
        UPDATE Expenses SET
            status = 'Pagado',
            payment_method = COALESCE(?, payment_method),
            paid_at = CURRENT_TIMESTAMP,
            notes = CASE 
                WHEN ? IS NOT NULL THEN CONCAT(COALESCE(notes, ''), '\n--- PAGO ---\n', ?)
                ELSE notes
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'Aprobado'
    `;
    
    db.run(sql, [payment_method, payment_notes, payment_notes, expenseId], function(err) {
        if (err) {
            console.error('❌ Error marcando gasto como pagado:', err);
            return res.status(500).json({
                error: 'Error al marcar gasto como pagado',
                details: err.message
            });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({
                error: 'Gasto no encontrado o no está aprobado'
            });
        }
        
        console.log(`💳 Gasto ${expenseId} marcado como pagado`);
        
        res.json({
            message: 'Gasto marcado como pagado exitosamente',
            expense_id: expenseId,
            paid_at: new Date().toISOString(),
            payment_method: payment_method
        });
    });
});

// DELETE /api/expenses/:id - Eliminar gasto
app.delete('/api/expenses/:id', authenticateToken, (req, res) => {
    const expenseId = req.params.id;
    
    console.log(`🗑️ Eliminando gasto ID: ${expenseId}`);
    
    // Verificar permisos: solo el creador o admin pueden eliminar gastos pendientes
    const checkSql = `SELECT status, created_by FROM Expenses WHERE id = ?`;
    
    db.get(checkSql, [expenseId], (err, expense) => {
        if (err) {
            console.error('❌ Error verificando gasto:', err);
            return res.status(500).json({
                error: 'Error verificando gasto',
                details: err.message
            });
        }
        
        if (!expense) {
            return res.status(404).json({
                error: 'Gasto no encontrado'
            });
        }
        
        // Solo se pueden eliminar gastos pendientes o rechazados
        if (!['Pendiente', 'Rechazado'].includes(expense.status)) {
            return res.status(403).json({
                error: 'Solo se pueden eliminar gastos pendientes o rechazados'
            });
        }
        
        // Solo el creador o admin pueden eliminar
        if (expense.created_by !== req.user.id && req.user.role !== 'Admin') {
            return res.status(403).json({
                error: 'No tienes permisos para eliminar este gasto'
            });
        }
        
        const deleteSql = `DELETE FROM Expenses WHERE id = ?`;
        
        db.run(deleteSql, [expenseId], function(err) {
            if (err) {
                console.error('❌ Error eliminando gasto:', err);
                return res.status(500).json({
                    error: 'Error al eliminar gasto',
                    details: err.message
                });
            }
            
            console.log(`✅ Gasto ${expenseId} eliminado exitosamente`);
            
            res.json({
                message: 'Gasto eliminado exitosamente',
                expense_id: expenseId,
                deleted_by: req.user.username
            });
        });
    });
});

// GET /api/expense-categories - Obtener categorías de gastos
app.get('/api/expense-categories', authenticateToken, (req, res) => {
    console.log('📁 Obteniendo categorías de gastos...');
    
    const sql = `
        SELECT * FROM ExpenseCategories 
        WHERE is_active = 1 
        ORDER BY name ASC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Error obteniendo categorías:', err);
            res.status(500).json({
                error: 'Error obteniendo categorías',
                details: err.message
            });
            return;
        }
        
        console.log(`✅ ${rows.length} categorías obtenidas`);
        res.json({
            message: 'success',
            data: rows,
            total: rows.length
        });
    });
});

// POST /api/expense-categories - Crear nueva categoría
app.post('/api/expense-categories', authenticateToken, requireRole(['Admin']), (req, res) => {
    const { name, description } = req.body;
    
    if (!name) {
        return res.status(400).json({
            error: 'El nombre de la categoría es requerido'
        });
    }
    
    console.log(`📁 Creando nueva categoría: ${name}`);
    
    const sql = `
        INSERT INTO ExpenseCategories (name, description)
        VALUES (?, ?)
    `;
    
    db.run(sql, [name, description || null], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint')) {
                return res.status(409).json({
                    error: 'Ya existe una categoría con ese nombre'
                });
            }
            
            console.error('❌ Error creando categoría:', err);
            return res.status(500).json({
                error: 'Error al crear categoría',
                details: err.message
            });
        }
        
        console.log(`✅ Categoría creada con ID: ${this.lastID}`);
        
        res.status(201).json({
            message: 'Categoría creada exitosamente',
            data: {
                id: this.lastID,
                name,
                description,
                is_active: true,
                created_at: new Date().toISOString()
            }
        });
    });
});

// GET /api/expenses/stats - Obtener estadísticas de gastos
app.get('/api/expenses/stats', authenticateToken, (req, res) => {
    console.log('📊 Calculando estadísticas de gastos...');
    
    const { period = 'month' } = req.query;
    
    let dateFilter = '';
    switch (period) {
        case 'week':
            dateFilter = `AND e.date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`;
            break;
        case 'month':
            dateFilter = `AND e.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;
            break;
        case 'quarter':
            dateFilter = `AND e.date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)`;
            break;
        case 'year':
            dateFilter = `AND e.date >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)`;
            break;
        default:
            dateFilter = `AND e.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;
    }
    
    const queries = [
        // Total gastos por estado
        new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    status,
                    COUNT(*) as count,
                    SUM(amount) as total_amount
                FROM Expenses e
                WHERE 1=1 ${dateFilter}
                GROUP BY status
            `;
            
            db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ type: 'by_status', data: rows });
            });
        }),
        
        // Total gastos por categoría
        new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    COALESCE(e.category, 'Sin categoría') as category,
                    COUNT(*) as count,
                    SUM(amount) as total_amount
                FROM Expenses e
                WHERE 1=1 ${dateFilter}
                GROUP BY e.category
                ORDER BY total_amount DESC
                LIMIT 10
            `;
            
            db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ type: 'by_category', data: rows });
            });
        }),
        
        // Totales generales
        new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    COUNT(*) as total_count,
                    SUM(amount) as total_amount,
                    AVG(amount) as avg_amount,
                    SUM(CASE WHEN status = 'Pendiente' THEN amount ELSE 0 END) as pending_amount,
                    SUM(CASE WHEN status = 'Aprobado' THEN amount ELSE 0 END) as approved_amount,
                    SUM(CASE WHEN status = 'Pagado' THEN amount ELSE 0 END) as paid_amount
                FROM Expenses e
                WHERE 1=1 ${dateFilter}
            `;
            
            db.get(sql, [], (err, row) => {
                if (err) reject(err);
                else resolve({ type: 'totals', data: row });
            });
        })
    ];
    
    Promise.all(queries)
        .then(results => {
            const stats = {
                period,
                date_range: {
                    from: new Date(Date.now() - (period === 'week' ? 7 : period === 'month' ? 30 : period === 'quarter' ? 90 : 365) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    to: new Date().toISOString().split('T')[0]
                }
            };
            
            results.forEach(result => {
                stats[result.type] = result.data;
            });
            
            console.log('✅ Estadísticas de gastos calculadas');
            res.json({
                message: 'success',
                data: stats,
                timestamp: new Date().toISOString()
            });
        })
        .catch(error => {
            console.error('❌ Error calculando estadísticas:', error);
            res.status(500).json({
                error: 'Error calculando estadísticas',
                details: error.message
            });
        });
});

app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint no encontrado',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

app.use((err, req, res, next) => {
    console.error('💥 Error no manejado:', err);
    
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Token inválido',
            code: 'INVALID_TOKEN'
        });
    }
    
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Token expirado',
            code: 'TOKEN_EXPIRED'
        });
    }
    
    if (err.type === 'validation') {
        return res.status(400).json({
            error: 'Error de validación',
            details: err.details
        });
    }
    
    res.status(500).json({
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno',
        timestamp: new Date().toISOString()
    });
});

// ===================================================================
// INICIALIZACIÓN DEL SERVIDOR
// ===================================================================

function startServer() {
    app.listen(PORT, '0.0.0.0', (err) => {
        if (err) {
            console.error('💥 Error iniciando servidor:', err);
            process.exit(1);
        }
        
        console.log('\n🚀 ========================================');
        console.log('🚀 GYMTEC ERP - SERVIDOR INICIADO');
        console.log('🚀 ========================================');
        console.log(`🌍 Servidor corriendo en: http://localhost:${PORT}`);
        console.log(`🌍 Accessible via: http://0.0.0.0:${PORT}`);
        console.log(`🔧 Modo: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📂 Base de datos: MySQL`);
        console.log('📋 Rutas disponibles:');
        console.log('   🔐 /api/auth/* (Autenticación)');
        console.log('   👥 /api/clients/* (Gestión de Clientes)');
        console.log('   🏢 /api/locations/* (Gestión de Sedes)');
        console.log('   🔧 /api/equipment/* (Gestión de Equipos)');
        console.log('   🎫 /api/tickets/* (Sistema de Tickets)');
        console.log('   📦 /api/inventory/* (Gestión de Inventario)');
        console.log('   🛒 /api/purchase-orders/* (Órdenes de Compra)');
        console.log('   📊 /api/dashboard/* (Dashboard y KPIs)');
        console.log('   👤 /api/users/* (Gestión de Usuarios)');
        console.log('   💰 /api/quotes/* (Cotizaciones)');
        console.log('   🧾 /api/invoices/* (Facturación)');
        console.log('   💸 /api/expenses/* (Gastos)');
        console.log('   ⏱️  /api/time-entries/* (Control de Tiempo)');
        console.log('   🔔 /api/notifications/* (Notificaciones - Fase 2)');
        console.log('   📈 /api/inventory/* (Inventario Inteligente - Fase 3)');
        console.log('🚀 ========================================\n');
        
        try {
            console.log('🔄 Inicializando servicios de background...');
            console.log('✅ Servicios de background iniciados correctamente');
        } catch (error) {
            console.warn('⚠️  Warning: Algunos servicios de background no pudieron iniciarse:', error.message);
        }
    });
}

process.on('SIGINT', () => {
    console.log('\n🛑 Recibida señal SIGINT, cerrando servidor...');
    db.close((err) => {
        if (err) {
            console.error('❌ Error cerrando base de datos:', err.message);
        } else {
            console.log('✅ Base de datos cerrada correctamente');
        }
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Recibida señal SIGTERM, cerrando servidor...');
    db.close((err) => {
        if (err) {
            console.error('❌ Error cerrando base de datos:', err.message);
        } else {
            console.log('✅ Base de datos cerrada correctamente');
        }
        process.exit(0);
    });
});

startServer();
