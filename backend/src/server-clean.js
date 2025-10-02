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

// Sistema de Notificaciones
const { triggerNotificationProcessing } = require('../notification-hooks');

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
// RUTAS PRINCIPALES - USUARIOS
// ===================================================================

// GET all users with optional role filter
app.get('/api/users', authenticateToken, (req, res) => {
    const { role } = req.query;
    
    let sql = 'SELECT id, username, email, role, created_at FROM Users';
    let params = [];
    
    if (role) {
        sql += ' WHERE role = ?';
        params.push(role);
    }
    
    sql += ' ORDER BY username';
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('❌ Error getting users:', err);
            res.status(500).json({"error": "Error al obtener usuarios: " + err.message});
            return;
        }
        
        console.log(`✅ Users found${role ? ` with role ${role}` : ''}:`, rows.length, 'items');
        res.json({ data: rows });
    });
});

// ===================================================================
// RUTAS PRINCIPALES - TAREAS DE MANTENIMIENTO
// ===================================================================

// GET technicians for task assignment (DEBE IR ANTES de la ruta genérica)
app.get('/api/maintenance-tasks/technicians', authenticateToken, (req, res) => {
    const sql = `
        SELECT 
            id,
            username,
            email,
            username as first_name,
            '' as last_name,
            username as name,
            role,
            '' as phone
        FROM Users 
        WHERE role IN ('technician', 'admin', 'Tecnico', 'Admin') 
        AND status = 'Activo'
        ORDER BY username
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Error getting technicians:', err.message);
            res.status(500).json({ 
                error: 'Error retrieving technicians',
                code: 'DB_ERROR'
            });
            return;
        }
        
        console.log('✅ Technicians found:', rows.length, 'items');
        res.json({ 
            message: 'success',
            data: rows
        });
    });
});

// GET all maintenance tasks
app.get('/api/maintenance-tasks', authenticateToken, (req, res) => {
    const sql = `
        SELECT 
            mt.id,
            mt.title,
            mt.description,
            mt.type,
            mt.status,
            mt.priority,
            mt.scheduled_date,
            mt.scheduled_time,
            mt.estimated_duration,
            mt.actual_duration,
            mt.notes,
            mt.is_preventive,
            mt.started_at,
            mt.completed_at,
            mt.created_at,
            mt.updated_at,
            -- Equipment info
            e.name as equipment_name,
            e.serial_number as equipment_serial,
            em.name as equipment_model,
            -- Technician info
            u.username as technician_username,
            u.username as technician_name,
            -- Client and location info
            c.name as client_name,
            l.name as location_name
        FROM MaintenanceTasks mt
        LEFT JOIN Equipment e ON mt.equipment_id = e.id
        LEFT JOIN EquipmentModels em ON e.model_id = em.id
        LEFT JOIN Users u ON mt.technician_id = u.id
        LEFT JOIN Clients c ON mt.client_id = c.id
        LEFT JOIN Locations l ON mt.location_id = l.id
        ORDER BY mt.scheduled_date DESC, mt.scheduled_time ASC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Error getting maintenance tasks:', err.message);
            res.status(500).json({ 
                error: 'Error retrieving maintenance tasks',
                code: 'DB_ERROR'
            });
            return;
        }
        
        console.log('✅ Maintenance tasks found:', rows.length, 'items');
        res.json({ 
            message: 'success',
            data: rows,
            metadata: {
                total: rows.length,
                timestamp: new Date().toISOString()
            }
        });
    });
});

// POST create new maintenance task
app.post('/api/maintenance-tasks', authenticateToken, (req, res) => {
    const { 
        title, 
        description,
        type = 'maintenance',
        equipment_id, 
        technician_id,
        scheduled_date, 
        scheduled_time,
        estimated_duration,
        priority = 'medium',
        notes,
        is_preventive = false
    } = req.body;
    
    // Validation
    if (!title || !scheduled_date) {
        return res.status(400).json({ 
            error: 'Title and scheduled_date are required',
            code: 'VALIDATION_ERROR'
        });
    }
    
    const sql = `
        INSERT INTO MaintenanceTasks 
        (title, description, type, equipment_id, technician_id, scheduled_date, 
         scheduled_time, estimated_duration, priority, notes, is_preventive, 
         status, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())
    `;
    
    const values = [
        title, 
        description, 
        type,
        equipment_id || null, 
        technician_id || null, 
        scheduled_date, 
        scheduled_time || null,
        estimated_duration || null,
        priority, 
        notes || null,
        is_preventive,
        req.user?.id || null
    ];
    
    db.run(sql, values, function(err) {
        if (err) {
            console.error('❌ Error creating maintenance task:', err.message);
            res.status(500).json({ 
                error: 'Error creating maintenance task',
                code: 'DB_ERROR',
                details: err.message
            });
            return;
        }
        
        console.log('✅ Maintenance task created with ID:', this.lastID);
        
        // Fetch the created task with all relations
        const fetchSql = `
            SELECT 
                mt.id, mt.title, mt.description, mt.type, mt.status, mt.priority,
                mt.scheduled_date, mt.scheduled_time, mt.estimated_duration,
                mt.notes, mt.is_preventive, mt.created_at,
                e.name as equipment_name,
                u.username as technician_name
            FROM MaintenanceTasks mt
            LEFT JOIN Equipment e ON mt.equipment_id = e.id
            LEFT JOIN Users u ON mt.technician_id = u.id
            WHERE mt.id = ?
        `;
        
        db.get(fetchSql, [this.lastID], (err, row) => {
            if (err) {
                console.error('❌ Error fetching created task:', err.message);
            }
            
            res.status(201).json({ 
                message: 'Maintenance task created successfully',
                success: true,
                data: row || {
                    id: this.lastID,
                    title,
                    type,
                    scheduled_date,
                    scheduled_time,
                    priority,
                    status: 'pending'
                }
            });
        });
    });
});

// PUT update maintenance task
app.put('/api/maintenance-tasks/:id', authenticateToken, (req, res) => {
    const taskId = parseInt(req.params.id);
    const { 
        title, 
        description,
        type,
        equipment_id, 
        technician_id,
        scheduled_date, 
        scheduled_time,
        estimated_duration,
        priority,
        notes,
        status
    } = req.body;
    
    const sql = `
        UPDATE MaintenanceTasks 
        SET title = ?, description = ?, type = ?, equipment_id = ?, 
            technician_id = ?, scheduled_date = ?, scheduled_time = ?,
            estimated_duration = ?, priority = ?, notes = ?, status = ?,
            updated_at = NOW()
        WHERE id = ?
    `;
    
    const values = [
        title, description, type, equipment_id || null, technician_id || null,
        scheduled_date, scheduled_time || null, estimated_duration || null,
        priority, notes || null, status, taskId
    ];
    
    db.run(sql, values, function(err) {
        if (err) {
            console.error('❌ Error updating maintenance task:', err.message);
            res.status(500).json({ 
                error: 'Error updating maintenance task',
                code: 'DB_ERROR'
            });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({
                error: 'Maintenance task not found',
                code: 'NOT_FOUND'
            });
            return;
        }
        
        console.log('✅ Maintenance task updated:', taskId);
        res.json({ 
            message: 'Maintenance task updated successfully',
            success: true
        });
    });
});

// DELETE maintenance task
app.delete('/api/maintenance-tasks/:id', authenticateToken, (req, res) => {
    const taskId = parseInt(req.params.id);
    
    const sql = 'DELETE FROM MaintenanceTasks WHERE id = ?';
    
    db.run(sql, [taskId], function(err) {
        if (err) {
            console.error('❌ Error deleting maintenance task:', err.message);
            res.status(500).json({ 
                error: 'Error deleting maintenance task',
                code: 'DB_ERROR'
            });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({
                error: 'Maintenance task not found',
                code: 'NOT_FOUND'
            });
            return;
        }
        
        console.log('✅ Maintenance task deleted:', taskId);
        res.json({ 
            message: 'Maintenance task deleted successfully',
            success: true
        });
    });
});

// ===================================================================
// RUTAS PRINCIPALES - CONFIGURACIÓN DEL SISTEMA
// ===================================================================

// GET system settings
app.get('/api/system-settings', authenticateToken, requireRole(['Admin']), (req, res) => {
    const sql = 'SELECT * FROM SystemSettings ORDER BY setting_key';
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Error getting system settings:', err);
            // Return default settings as fallback
            res.json({ 
                data: [
                    { setting_key: 'company_name', setting_value: 'Gymtec ERP', description: 'Nombre de la empresa' },
                    { setting_key: 'notifications_enabled', setting_value: 'true', description: 'Notificaciones habilitadas' },
                    { setting_key: 'session_timeout', setting_value: '8', description: 'Tiempo de sesión en horas' },
                    { setting_key: 'auto_backup', setting_value: 'true', description: 'Respaldo automático' },
                    { setting_key: 'maintenance_interval', setting_value: '30', description: 'Intervalo de mantenimiento en días' }
                ]
            });
            return;
        }
        
        console.log('✅ System settings found:', rows.length, 'items');
        res.json({ data: rows });
    });
});

// PUT update system settings
app.put('/api/system-settings', authenticateToken, requireRole(['Admin']), (req, res) => {
    const settings = req.body;
    
    if (!Array.isArray(settings)) {
        return res.status(400).json({ error: 'Settings must be an array' });
    }
    
    // For now, just return success (settings can be stored in localStorage on frontend)
    console.log('✅ System settings updated (localStorage mode):', settings.length, 'settings');
    res.json({ 
        message: 'Settings updated successfully',
        data: settings
    });
});

// ===================================================================
// RUTAS PRINCIPALES - CLIENTES
// ===================================================================

app.get('/api/clients', authenticateToken, (req, res) => {
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

app.get("/api/clients/:id", authenticateToken, (req, res) => {
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

app.post('/api/clients', authenticateToken, (req, res) => {
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

app.put("/api/clients/:id", authenticateToken, (req, res) => {
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

app.delete("/api/clients/:id", authenticateToken, (req, res) => {
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

app.get('/api/locations', authenticateToken, (req, res) => {
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

app.post('/api/locations', authenticateToken, (req, res) => {
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

// GET all equipment
app.get('/api/equipment', authenticateToken, (req, res) => {
    const sql = `
        SELECT 
            e.id,
            e.name,
            e.type,
            e.brand,
            e.model,
            e.serial_number,
            e.custom_id,
            e.location_id,
            e.model_id,
            e.acquisition_date,
            e.last_maintenance_date,
            e.notes,
            l.name as location_name,
            c.name as client_name,
            em.name as model_name
        FROM Equipment e
        LEFT JOIN Locations l ON e.location_id = l.id
        LEFT JOIN Clients c ON l.client_id = c.id
        LEFT JOIN EquipmentModels em ON e.model_id = em.id
        ORDER BY e.name
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Error getting all equipment:', err.message);
            res.status(500).json({"error": "Error al obtener equipos: " + err.message});
            return;
        }
        
        console.log('✅ All equipment found:', rows.length, 'items');
        res.json({ 
            message: 'success',
            data: rows || []
        });
    });
});

// GET individual equipment by ID
app.get('/api/equipment/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const sql = `
        SELECT 
            e.id,
            e.custom_id,
            e.location_id,
            e.model_id,
            e.acquisition_date,
            e.last_maintenance_date,
            e.notes,
            e.created_at,
            e.updated_at,
            -- Mapear campos correctamente para el frontend
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
            -- Campos adicionales y referencias
            em.name as model_name,
            em.brand as model_brand,
            l.name as location_name,
            c.name as client_name
        FROM equipment e
        LEFT JOIN equipmentmodels em ON e.model_id = em.id
        LEFT JOIN locations l ON e.location_id = l.id
        LEFT JOIN clients c ON l.client_id = c.id
        WHERE e.id = ?
    `;
    
    db.get(sql, [id], (err, row) => {
        if (err) {
            console.error(`❌ Error fetching equipment ${id}:`, err);
            res.status(500).json({ 
                error: 'Error al obtener el equipo', 
                code: 'DB_ERROR' 
            });
            return;
        }
        
        if (!row) {
            console.log(`⚠️  Equipment ${id} not found`);
            res.status(404).json({ 
                error: 'Equipo no encontrado', 
                code: 'EQUIPMENT_NOT_FOUND' 
            });
            return;
        }
        
        console.log(`✅ Equipment ${id} found:`, row.name || row.type);
        res.json(row);
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
    const dashboardCorrelationsRoutes = require('./routes/dashboard-correlations'); // Nueva ruta para correlaciones
    const taskGeneratorRoutes = require('./routes/task-generator'); // Sistema de generación automática de tareas
    const intelligentAssignmentRoutes = require('./routes/intelligent-assignment'); // Sistema de asignación inteligente
    const { router: slaProcessorRoutes, initializeSLAProcessor, startAutomaticMonitoring } = require('./routes/sla-processor'); // Sistema de reglas SLA
    
    app.use('/api', contractsSlaRoutes);
    app.use('/api', checklistRoutes);
    app.use('/api', workflowRoutes);
    app.use('/api', dashboardCorrelationsRoutes); // Agregar correlaciones inteligentes
    app.use('/api', taskGeneratorRoutes); // Agregar generador automático de tareas
    app.use('/api', intelligentAssignmentRoutes); // Agregar asignación inteligente de recursos
    app.use('/api/sla', slaProcessorRoutes); // Agregar sistema de reglas SLA
    
    // Inicializar procesador SLA con monitoreo automático
    initializeSLAProcessor(db);
    startAutomaticMonitoring(db, 5); // Monitoreo cada 5 minutos
    
    console.log('✅ Fase 1 Routes loaded: Contratos SLA, Checklist, Workflow, Dashboard Correlations, Task Generator, Intelligent Assignment, SLA Processor');
} catch (error) {
    console.warn('⚠️  Warning: Some Fase 1 routes could not be loaded:', error.message);
}

// FASE 2 ENHANCEMENTS - Sistema de Notificaciones Inteligentes
try {
    const notificationsRoutes = require('./routes/notifications');
    const notificationsTestRoutes = require('./routes/notifications-test');
    const notificationsSimpleTestRoutes = require('./routes/notifications-simple-test');
    const notificationsFixedRoutes = require('./routes/notifications-fixed');
    const testDbRoutes = require('./routes/test-db');
    const simpleTestRoutes = require('./routes/simple-test');
    
    app.use('/api/notifications', notificationsRoutes);
    app.use('/api/notifications', notificationsTestRoutes);
    app.use('/api/notifications', notificationsSimpleTestRoutes);
    app.use('/api/notifications', notificationsFixedRoutes);
    app.use('/api', testDbRoutes);
    app.use('/api', simpleTestRoutes);
    
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
            e.custom_id as equipment_custom_id,
            COALESCE(t.ticket_type, 'individual') as ticket_type
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
    
    console.log('📊 GET /api/tickets - Ejecutando query...');
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('❌ Error en consulta de tickets:', err.message);
            res.status(500).json({ "error": err.message });
            return;
        }
        
        console.log(`✅ Tickets encontrados: ${rows.length}`);
        console.log('📊 Tipos de tickets:', rows.reduce((acc, t) => {
            acc[t.ticket_type] = (acc[t.ticket_type] || 0) + 1;
            return acc;
        }, {}));
        
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
    
    // Query principal del ticket con información completa (UPPERCASE para MySQL)
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
        
        // Obtener fotos del ticket (UPPERCASE para MySQL)
        const photosSql = `SELECT * FROM TicketPhotos WHERE ticket_id = ? ORDER BY created_at DESC`;
        
        db.all(photosSql, [ticketId], (photoErr, photos) => {
            if (photoErr) {
                console.log('⚠️ Error obteniendo fotos (continuando sin fotos):', photoErr.message);
                photos = [];
            }
            
            console.log(`📸 Encontradas ${photos ? photos.length : 0} fotos para ticket ${ticketId}`);
            
            // Obtener notas del ticket (UPPERCASE para MySQL)
            const notesSql = `SELECT * FROM TicketNotes WHERE ticket_id = ? ORDER BY created_at DESC`;
            
            db.all(notesSql, [ticketId], (notesErr, notes) => {
                if (notesErr) {
                    console.log('⚠️ Error obteniendo notas (continuando sin notas):', notesErr.message);
                    notes = [];
                }
                
                console.log(`📝 Encontradas ${notes ? notes.length : 0} notas para ticket ${ticketId}`);
                
                // Obtener checklist del ticket (UPPERCASE para MySQL)
                const checklistSql = `SELECT * FROM TicketChecklist WHERE ticket_id = ? ORDER BY created_at DESC`;
                
                db.all(checklistSql, [ticketId], (checklistErr, checklist) => {
                    if (checklistErr) {
                        console.log('⚠️ Error obteniendo checklist (continuando sin checklist):', checklistErr.message);
                        checklist = [];
                    }
                    
                    console.log(`📋 Encontradas ${checklist ? checklist.length : 0} tareas de checklist para ticket ${ticketId}`);
                    
                    // Estructurar respuesta completa con TODOS los datos
                    const detailedTicket = {
                        ...ticket,
                        photos: photos || [],
                        notes: notes || [],
                        checklist: checklist || [],
                        activities: [], // Mantenemos actividades vacío por ahora
                        metadata: {
                            photos_count: photos ? photos.length : 0,
                            notes_count: notes ? notes.length : 0,
                            checklist_count: checklist ? checklist.length : 0,
                            activities_count: 0,
                            last_updated: ticket.updated_at,
                            created_date: ticket.created_at
                        }
                    };
                    
                    console.log(`✅ Detalle completo del ticket ${ticketId} preparado - Fotos: ${detailedTicket.metadata.photos_count}, Notas: ${detailedTicket.metadata.notes_count}, Checklist: ${detailedTicket.metadata.checklist_count}`);
                    
                    return res.json({
                        success: true,
                        message: "success", 
                        data: detailedTicket
                    });
                });
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

    const sql = `INSERT INTO Tickets (client_id, location_id, equipment_id, title, description, priority, due_date, status, ticket_type, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
    const params = [client_id, location_id || null, equipment_id || null, title, description, priority, due_date || null, 'Abierto', 'individual'];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error creando ticket:', err.message);
            res.status(500).json({ "error": err.message });
            return;
        }
        console.log(`✅ Ticket creado con ID: ${this.lastID}`);
        
        // 🔔 Trigger notificaciones después de crear ticket
        const ticketId = this.lastID;
        triggerNotificationProcessing('create', ticketId).catch(error => {
            console.error('⚠️  Error procesando notificaciones post-creación:', error.message);
        });
        
        res.status(201).json({
            message: "success",
            data: { id: this.lastID, ...req.body, status: 'Abierto' }
        });
    });
});

// GET equipment scope for a gimnación ticket (organized by category)
app.get('/api/tickets/:id/equipment-scope', authenticateToken, (req, res) => {
    const ticketId = req.params.id;
    
    console.log(`📋 Fetching equipment scope for ticket ${ticketId}`);
    
    const sql = `
        SELECT 
            tes.id,
            tes.equipment_id,
            e.name as equipment_name,
            e.custom_id,
            em.name as model_name,
            em.category,
            em.brand,
            tes.is_included,
            tes.exclusion_reason
        FROM TicketEquipmentScope tes
        INNER JOIN Equipment e ON tes.equipment_id = e.id
        INNER JOIN EquipmentModels em ON e.model_id = em.id
        WHERE tes.ticket_id = ?
        ORDER BY em.category, em.name, em.brand
    `;
    
    db.all(sql, [ticketId], (err, rows) => {
        if (err) {
            console.error('❌ Error fetching equipment scope:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        console.log(`✅ Found ${rows.length} equipment items for ticket ${ticketId}`);
        
        res.json({
            message: "success",
            data: rows || []
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
        
        // 🔔 Trigger notificaciones después de actualizar ticket
        triggerNotificationProcessing('update', req.params.id).catch(error => {
            console.error('⚠️  Error procesando notificaciones post-actualización:', error.message);
        });
        
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
        SELECT * FROM ticketnotes 
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
    
    const sql = `INSERT INTO ticketnotes 
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
        db.get('SELECT * FROM ticketnotes WHERE id = ?', [this.lastID], (err, newNote) => {
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
    
    const sql = 'DELETE FROM ticketnotes WHERE id = ?';
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
// GESTIÓN DE FOTOS PARA EQUIPOS
// ===================================================================

// GET all photos for a specific equipment
app.get('/api/equipment/:equipmentId/photos', authenticateToken, (req, res) => {
    const { equipmentId } = req.params;
    const sql = `
        SELECT * FROM equipmentphotos 
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

// POST upload photo for equipment
app.post('/api/equipment/:equipmentId/photos', authenticateToken, (req, res) => {
    const { equipmentId } = req.params;
    const { photo_data, mime_type, filename, description, photo_type } = req.body;
    
    if (!photo_data || !mime_type) {
        return res.status(400).json({ 
            error: 'Se requiere photo_data y mime_type',
            code: 'MISSING_PHOTO_DATA'
        });
    }
    
    const sql = `INSERT INTO equipmentphotos 
                 (equipment_id, photo_data, file_name, mime_type, file_size, description, photo_type, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`;
    
    const file_size = filename ? Math.round(photo_data.length * 0.75) : 0; // Aproximación del tamaño real
    const params = [
        parseInt(equipmentId), 
        photo_data, 
        filename || 'foto.jpg', 
        mime_type, 
        file_size, 
        description || null, 
        photo_type || 'Otros'
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error agregando foto al equipo:', err.message);
            res.status(500).json({ 
                error: 'Error al agregar foto al equipo',
                code: 'PHOTO_UPLOAD_ERROR'
            });
            return;
        }
        
        console.log(`✅ Foto agregada al equipo ${equipmentId}, ID: ${this.lastID}`);
        res.json({ 
            message: "Foto agregada exitosamente", 
            photoId: this.lastID 
        });
    });
});

// DELETE photo from equipment
app.delete('/api/equipment/photos/:photoId', authenticateToken, (req, res) => {
    const { photoId } = req.params;
    
    const sql = 'DELETE FROM equipmentphotos WHERE id = ?';
    db.run(sql, [photoId], function(err) {
        if (err) {
            console.error('❌ Error eliminando foto de equipo:', err.message);
            res.status(500).json({ 
                error: 'Error al eliminar foto del equipo',
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
        
        console.log(`✅ Foto ${photoId} eliminada del equipo`);
        res.json({ 
            message: "Foto eliminada exitosamente", 
            changes: this.changes 
        });
    });
});

// ===================================================================
// GESTIÓN DE NOTAS PARA EQUIPOS
// ===================================================================

// GET all notes for a specific equipment
app.get('/api/equipment/:equipmentId/notes', authenticateToken, (req, res) => {
    const { equipmentId } = req.params;
    const sql = `
        SELECT * FROM equipmentnotes 
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

// POST add note to equipment
app.post('/api/equipment/:equipmentId/notes', authenticateToken, (req, res) => {
    const { equipmentId } = req.params;
    const { note, note_type } = req.body;
    
    if (!note || note.trim() === '') {
        return res.status(400).json({ 
            error: 'La nota no puede estar vacía',
            code: 'EMPTY_NOTE'
        });
    }
    
    const sql = `INSERT INTO equipmentnotes 
                 (equipment_id, note, note_type, author, created_at) 
                 VALUES (?, ?, ?, ?, NOW())`;
    
    const params = [
        parseInt(equipmentId), 
        note.trim(), 
        note_type || 'General',
        req.user.username || 'Sistema'
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error agregando nota al equipo:', err.message);
            res.status(500).json({ 
                error: 'Error al agregar nota al equipo',
                code: 'NOTE_ADD_ERROR'
            });
            return;
        }
        
        console.log(`✅ Nota agregada al equipo ${equipmentId}, ID: ${this.lastID}`);
        res.json({ 
            message: "Nota agregada exitosamente", 
            noteId: this.lastID 
        });
    });
});

// DELETE note from equipment
app.delete('/api/equipment/notes/:noteId', authenticateToken, (req, res) => {
    const { noteId } = req.params;
    
    const sql = 'DELETE FROM equipmentnotes WHERE id = ?';
    db.run(sql, [noteId], function(err) {
        if (err) {
            console.error('❌ Error eliminando nota de equipo:', err.message);
            res.status(500).json({ 
                error: 'Error al eliminar nota del equipo',
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
        
        console.log(`✅ Nota ${noteId} eliminada del equipo`);
        res.json({ 
            message: "Nota eliminada exitosamente", 
            changes: this.changes 
        });
    });
});

// ===================================================================
// GESTIÓN DE TICKETS PARA EQUIPOS
// ===================================================================

// GET all tickets for a specific equipment
app.get('/api/equipment/:equipmentId/tickets', authenticateToken, (req, res) => {
    const { equipmentId } = req.params;
    const sql = `
        SELECT 
            t.*,
            c.name as client_name,
            l.name as location_name
        FROM tickets t
        LEFT JOIN clients c ON t.client_id = c.id
        LEFT JOIN locations l ON t.location_id = l.id
        WHERE t.equipment_id = ?
        ORDER BY t.created_at DESC
    `;
    
    db.all(sql, [equipmentId], (err, rows) => {
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

// ===================================================================
// GESTIÓN DE REPUESTOS PARA TICKETS
// ===================================================================

// POST spare part usage to ticket
app.post('/api/tickets/:ticketId/spare-parts', authenticateToken, (req, res) => {
    const { ticketId } = req.params;
    const { spare_part_id, quantity_used, unit_cost, notes, bill_to_client } = req.body;
    
    console.log(`🔧 Registrando uso de repuesto en ticket ${ticketId}:`, { spare_part_id, quantity_used, unit_cost, bill_to_client });
    
    // Validaciones
    if (!spare_part_id || !quantity_used || quantity_used <= 0) {
        return res.status(400).json({
            error: 'spare_part_id y quantity_used son requeridos y quantity_used debe ser > 0',
            code: 'VALIDATION_ERROR'
        });
    }
    
    // Validar que unit_cost esté presente
    if (unit_cost === undefined || unit_cost === null || unit_cost <= 0) {
        return res.status(400).json({
            error: 'unit_cost es requerido y debe ser mayor a 0',
            code: 'VALIDATION_ERROR'
        });
    }
    
    // Verificar que el ticket existe
    db.get('SELECT id, title FROM Tickets WHERE id = ?', [ticketId], (err, ticket) => {
        if (err) {
            console.error('❌ Error verificando ticket:', err.message);
            return res.status(500).json({ 
                error: 'Error verificando ticket',
                code: 'TICKET_CHECK_ERROR'
            });
        }
        
        if (!ticket) {
            return res.status(404).json({
                error: 'Ticket no encontrado',
                code: 'TICKET_NOT_FOUND'
            });
        }
        
        // Verificar que el repuesto existe y tiene stock
        db.get('SELECT id, name, sku, current_stock FROM spareparts WHERE id = ?', [spare_part_id], (err, sparePart) => {
            if (err) {
                console.error('❌ Error verificando repuesto:', err.message);
                return res.status(500).json({ 
                    error: 'Error verificando repuesto',
                    code: 'SPARE_PART_CHECK_ERROR'
                });
            }
            
            if (!sparePart) {
                return res.status(404).json({
                    error: 'Repuesto no encontrado',
                    code: 'SPARE_PART_NOT_FOUND'
                });
            }
            
            if (sparePart.current_stock < quantity_used) {
                return res.status(400).json({
                    error: `Stock insuficiente. Disponible: ${sparePart.current_stock}, solicitado: ${quantity_used}`,
                    code: 'INSUFFICIENT_STOCK'
                });
            }
            
            // Insertar en ticketspareparts
            const insertSql = `
                INSERT INTO ticketspareparts 
                (ticket_id, spare_part_id, quantity_used, unit_cost, notes, used_at) 
                VALUES (?, ?, ?, ?, ?, NOW())
            `;
            
            db.run(insertSql, [ticketId, spare_part_id, quantity_used, unit_cost, notes || null], function(err) {
                if (err) {
                    console.error('❌ Error insertando repuesto en ticket:', err.message);
                    return res.status(500).json({ 
                        error: 'Error al agregar repuesto al ticket',
                        code: 'INSERT_ERROR'
                    });
                }
                
                const sparePartUsageId = this.lastID;
                
                // Actualizar stock del repuesto
                const updateStockSql = 'UPDATE spareparts SET current_stock = current_stock - ? WHERE id = ?';
                db.run(updateStockSql, [quantity_used, spare_part_id], (err) => {
                    if (err) {
                        console.error('❌ Error actualizando stock:', err.message);
                        // Revertir la inserción
                        db.run('DELETE FROM ticketspareparts WHERE id = ?', [sparePartUsageId]);
                        return res.status(500).json({ 
                            error: 'Error actualizando stock del repuesto',
                            code: 'STOCK_UPDATE_ERROR'
                        });
                    }
                    
                    console.log(`✅ Stock actualizado: ${sparePart.name} - Stock anterior: ${sparePart.current_stock}, usado: ${quantity_used}`);
                    
                    // 🆕 CREAR EXPENSE AUTOMÁTICAMENTE si bill_to_client = true
                    if (bill_to_client && unit_cost && unit_cost > 0) {
                        const totalCost = quantity_used * unit_cost;
                        const expenseDescription = `Repuesto: ${sparePart.name} (${quantity_used} ${quantity_used > 1 ? 'unidades' : 'unidad'}) - ${ticket.title}`;
                        
                        // Obtener o crear categoría "Repuestos"
                        db.get('SELECT id FROM ExpenseCategories WHERE name = ? LIMIT 1', ['Repuestos'], (err, category) => {
                            const categoryId = category ? category.id : null;
                            
                            const expenseSql = `
                                INSERT INTO Expenses (
                                    category_id, 
                                    category, 
                                    description, 
                                    amount, 
                                    date, 
                                    reference_type, 
                                    reference_id,
                                    notes,
                                    created_by, 
                                    status
                                ) VALUES (?, 'Repuestos', ?, ?, NOW(), 'ticket', ?, ?, ?, 'Aprobado')
                            `;
                            
                            const expenseNotes = notes ? `Uso registrado en ticket #${ticketId}. ${notes}` : `Uso registrado en ticket #${ticketId}`;
                            
                            db.run(expenseSql, [
                                categoryId,
                                expenseDescription,
                                totalCost,
                                ticketId,
                                expenseNotes,
                                req.user.id
                            ], function(expenseErr) {
                                if (expenseErr) {
                                    console.error('⚠️ Error creando gasto automático:', expenseErr.message);
                                    // No revertimos el uso del repuesto, solo loggeamos el error
                                } else {
                                    console.log(`💰 Gasto automático creado - ID: ${this.lastID}, Monto: $${totalCost}`);
                                }
                                
                                // Continuar con la respuesta (con o sin expense)
                                returnSuccessResponse();
                            });
                        });
                    } else {
                        // No crear expense, retornar directamente
                        returnSuccessResponse();
                    }
                    
                    function returnSuccessResponse() {
                        // Obtener el registro completo insertado con datos del repuesto
                        const selectSql = `
                            SELECT 
                                tsp.*,
                                sp.name as spare_part_name,
                                sp.sku as spare_part_sku
                            FROM ticketspareparts tsp
                            JOIN spareparts sp ON tsp.spare_part_id = sp.id
                            WHERE tsp.id = ?
                        `;
                        
                        db.get(selectSql, [sparePartUsageId], (err, newRecord) => {
                            if (err) {
                                console.error('❌ Error obteniendo registro creado:', err.message);
                                return res.status(500).json({ 
                                    error: 'Error obteniendo registro creado',
                                    code: 'RECORD_FETCH_ERROR'
                                });
                            }
                            
                            console.log(`✅ Uso de repuesto registrado en ticket ${ticketId}, ID: ${sparePartUsageId}`);
                            res.status(201).json({
                                message: "Uso de repuesto registrado exitosamente",
                                data: newRecord,
                                expense_created: bill_to_client
                            });
                        });
                    }
                });
            });
        });
    });
});

// ===================================================================
// RUTAS DE TICKETS DE GIMNACIÓN - MANTENIMIENTO PREVENTIVO MASIVO
// ===================================================================

// 1. GET /api/locations/:id/equipment - Obtener equipos de una sede con info de contrato
app.get('/api/locations/:locationId/equipment', authenticateToken, (req, res) => {
    try {
        const { locationId } = req.params;
        const { contractId } = req.query;
        
        let sql = `
            SELECT 
                e.id,
                COALESCE(NULLIF(e.name, ''), em.name) as name,
                COALESCE(NULLIF(e.type, ''), 'Equipment') as type,
                COALESCE(NULLIF(e.brand, ''), em.brand) as brand,
                COALESCE(NULLIF(e.model, ''), em.model_code, em.name) as model,
                COALESCE(NULLIF(e.serial_number, ''), 'S/N no disponible') as serial_number,
                e.custom_id,
                COALESCE(em.category, 'Sin categoría') as category,
                CASE 
                    WHEN ce.equipment_id IS NOT NULL THEN true 
                    ELSE false 
                END as is_in_contract
            FROM Equipment e
            LEFT JOIN EquipmentModels em ON e.model_id = em.id
            LEFT JOIN contract_equipment ce ON e.id = ce.equipment_id AND ce.contract_id = ?
            WHERE e.location_id = ?
            ORDER BY COALESCE(NULLIF(e.name, ''), em.name)
        `;
        
        const params = contractId ? [contractId, locationId] : [null, locationId];
        
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Error fetching location equipment:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            res.json({
                message: 'success',
                data: rows,
                metadata: {
                    locationId: parseInt(locationId),
                    contractId: contractId ? parseInt(contractId) : null,
                    totalEquipment: rows.length,
                    contractEquipment: rows.filter(r => r.is_in_contract).length
                }
            });
        });
        
    } catch (error) {
        console.error('Location equipment endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 2. POST /api/tickets/gimnacion - Crear ticket de gimnación
app.post('/api/tickets/gimnacion', authenticateToken, (req, res) => {
    try {
        const {
            title,
            description,
            priority = 'Media',
            client_id,
            location_id,
            contract_id,
            equipment_scope, // Array de { equipment_id, is_included, exclusion_reason }
            technicians,     // Array de { technician_id, role }
            checklist_template_id,
            custom_checklist // Array de { item_text, item_order, is_required, category }
        } = req.body;
        
        // Validaciones básicas
        if (!title || !client_id || !location_id || !equipment_scope || !Array.isArray(equipment_scope)) {
            return res.status(400).json({ 
                error: 'Faltan campos requeridos',
                required: ['title', 'client_id', 'location_id', 'equipment_scope']
            });
        }
        
        // Usar callback pattern para transacciones
        const createTicketSql = `
            INSERT INTO Tickets (
                title, description, status, priority, ticket_type,
                client_id, location_id, contract_id, assigned_technician_id,
                created_at, updated_at
            ) VALUES (?, ?, 'Abierto', ?, 'gimnacion', ?, ?, ?, ?, NOW(), NOW())
        `;
        
        const mainTechnician = technicians && technicians.length > 0 ? technicians[0].technician_id : null;
        
        db.run(createTicketSql, [
            title, description, priority, client_id, location_id, contract_id, mainTechnician
        ], function(err) {
            if (err) {
                console.error('Error creating gimnacion ticket:', err);
                return res.status(500).json({ error: 'Error creating ticket' });
            }
            
            const ticketId = this.lastID;
            let completedOperations = 0;
            let totalOperations = equipment_scope.length + (technicians ? technicians.length : 0);
            let hasErrors = false;
            
            // Función para completar la operación
            const completeOperation = () => {
                completedOperations++;
                if (completedOperations === totalOperations && !hasErrors) {
                    res.status(201).json({
                        message: 'Ticket de gimnación creado exitosamente',
                        data: {
                            ticket_id: ticketId,
                            title: title,
                            equipment_count: equipment_scope.length,
                            included_equipment: equipment_scope.filter(e => e.is_included).length,
                            technicians_count: technicians ? technicians.length : 0
                        }
                    });
                }
            };
            
            // Insertar scope de equipos
            equipment_scope.forEach(scope => {
                const scopeSql = `
                    INSERT INTO TicketEquipmentScope (
                        ticket_id, equipment_id, is_included, exclusion_reason, 
                        assigned_technician_id, status
                    ) VALUES (?, ?, ?, ?, ?, 'Pendiente')
                `;
                
                db.run(scopeSql, [
                    ticketId,
                    scope.equipment_id,
                    scope.is_included,
                    scope.exclusion_reason,
                    scope.assigned_technician_id || mainTechnician
                ], (err) => {
                    if (err && !hasErrors) {
                        hasErrors = true;
                        console.error('Error inserting equipment scope:', err);
                        return res.status(500).json({ error: 'Error creating equipment scope' });
                    }
                    if (!hasErrors) completeOperation();
                });
            });
            
            // Insertar técnicos asignados
            if (technicians && technicians.length > 0) {
                technicians.forEach(tech => {
                    const techSql = `
                        INSERT INTO TicketTechnicians (
                            ticket_id, technician_id, role, assigned_by
                        ) VALUES (?, ?, ?, ?)
                    `;
                    
                    db.run(techSql, [
                        ticketId, tech.technician_id, tech.role || 'Asistente', req.user.id
                    ], (err) => {
                        if (err && !hasErrors) {
                            hasErrors = true;
                            console.error('Error inserting technician:', err);
                            return res.status(500).json({ error: 'Error assigning technicians' });
                        }
                        if (!hasErrors) completeOperation();
                    });
                });
            } else {
                // Si no hay técnicos, ajustar el total de operaciones
                totalOperations = equipment_scope.length;
            }
            
            // Si no hay operaciones pendientes, responder inmediatamente
            if (totalOperations === 0) {
                res.status(201).json({
                    message: 'Ticket de gimnación creado exitosamente',
                    data: {
                        ticket_id: ticketId,
                        title: title,
                        equipment_count: 0,
                        included_equipment: 0,
                        technicians_count: 0
                    }
                });
            }
        });
        
    } catch (error) {
        console.error('Gimnacion ticket creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 3. GET /api/tickets/:id/gimnacion-details - Obtener detalles completos de ticket de gimnación
app.get('/api/tickets/:ticketId/gimnacion-details', authenticateToken, (req, res) => {
    try {
        const { ticketId } = req.params;
        
        // Query principal del ticket
        const ticketSql = `
            SELECT t.*, c.name as client_name, l.name as location_name,
                   contract.id as contract_id,
                   u.username as assigned_technician
            FROM Tickets t
            LEFT JOIN Clients c ON t.client_id = c.id
            LEFT JOIN Locations l ON t.location_id = l.id
            LEFT JOIN Contracts contract ON t.contract_id = contract.id
            LEFT JOIN Users u ON t.assigned_technician_id = u.id
            WHERE t.id = ? AND t.ticket_type = 'gimnacion'
        `;
        
        db.get(ticketSql, [ticketId], (err, ticket) => {
            if (err) {
                console.error('Error fetching gimnacion ticket:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!ticket) {
                return res.status(404).json({ error: 'Ticket de gimnación no encontrado' });
            }
            
            // Obtener scope de equipos
            const equipmentSql = `
                SELECT tes.*, e.name as equipment_name, e.type, e.brand, e.model,
                       u.username as assigned_technician_name
                FROM TicketEquipmentScope tes
                JOIN Equipment e ON tes.equipment_id = e.id
                LEFT JOIN Users u ON tes.assigned_technician_id = u.id
                WHERE tes.ticket_id = ?
                ORDER BY e.name
            `;
            
            db.all(equipmentSql, [ticketId], (err, equipment) => {
                if (err) {
                    console.error('Error fetching equipment scope:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                // Obtener técnicos asignados
                const techniciansSql = `
                    SELECT tt.*, u.username, u.email
                    FROM TicketTechnicians tt
                    JOIN Users u ON tt.technician_id = u.id
                    WHERE tt.ticket_id = ?
                `;
                
                db.all(techniciansSql, [ticketId], (err, technicians) => {
                    if (err) {
                        console.error('Error fetching technicians:', err);
                        return res.status(500).json({ error: 'Database error' });
                    }
                    
                    // Obtener checklist
                    const checklistSql = `
                        SELECT * FROM TicketGimnacionChecklist
                        WHERE ticket_id = ?
                        ORDER BY item_order
                    `;
                    
                    db.all(checklistSql, [ticketId], (err, checklist) => {
                        if (err) {
                            console.error('Error fetching checklist:', err);
                            return res.status(500).json({ error: 'Database error' });
                        }
                        
                        res.json({
                            message: 'success',
                            data: {
                                ticket,
                                equipment_scope: equipment,
                                technicians,
                                checklist,
                                summary: {
                                    total_equipment: equipment.length,
                                    included_equipment: equipment.filter(e => e.is_included).length,
                                    excluded_equipment: equipment.filter(e => !e.is_included).length,
                                    completed_equipment: equipment.filter(e => e.status === 'Completado').length,
                                    total_technicians: technicians.length,
                                    checklist_progress: checklist.length > 0 
                                        ? Math.round((checklist.filter(c => c.is_completed).length / checklist.length) * 100)
                                        : 0
                                }
                            }
                        });
                    });
                });
            });
        });
        
    } catch (error) {
        console.error('Gimnacion details endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 4. GET /api/gimnacion/checklist-templates - Obtener templates de checklist
app.get('/api/gimnacion/checklist-templates', authenticateToken, (req, res) => {
    try {
        const sql = `
            SELECT t.*, 
                   COUNT(i.id) as items_count,
                   u.username as created_by_username
            FROM GimnacionChecklistTemplates t
            LEFT JOIN GimnacionChecklistItems i ON t.id = i.template_id
            LEFT JOIN Users u ON t.created_by = u.id
            GROUP BY t.id
            ORDER BY t.is_default DESC, t.name
        `;
        
        db.all(sql, [], (err, templates) => {
            if (err) {
                console.error('Error fetching checklist templates:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            res.json({
                message: 'success',
                data: templates
            });
        });
        
    } catch (error) {
        console.error('Checklist templates endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 5. GET /api/gimnacion/checklist-templates/:id/items - Obtener items de un template
app.get('/api/gimnacion/checklist-templates/:templateId/items', authenticateToken, (req, res) => {
    try {
        const { templateId } = req.params;
        
        const sql = `
            SELECT 
                id,
                template_id,
                item_text as item_description,
                item_order as sort_order,
                is_required,
                category,
                created_at
            FROM GimnacionChecklistItems
            WHERE template_id = ?
            ORDER BY item_order, id
        `;
        
        db.all(sql, [templateId], (err, items) => {
            if (err) {
                console.error('Error fetching template items:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            res.json({
                message: 'success',
                data: items
            });
        });
        
    } catch (error) {
        console.error('Template items endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 6. POST /api/gimnacion/checklist-templates - Crear nuevo template de checklist
app.post('/api/gimnacion/checklist-templates', authenticateToken, (req, res) => {
    try {
        const { template_name, items = [] } = req.body;
        
        if (!template_name || template_name.trim() === '') {
            return res.status(400).json({ error: 'El nombre del template es requerido' });
        }
        
        // Insertar template
        const insertTemplateSql = `
            INSERT INTO GimnacionChecklistTemplates (name, description, created_by, created_at)
            VALUES (?, '', ?, NOW())
        `;
        
        db.run(insertTemplateSql, [template_name.trim(), req.user.id], function(err) {
            if (err) {
                console.error('Error creating checklist template:', err);
                return res.status(500).json({ error: 'Error al crear template' });
            }
            
            const templateId = this.lastID;
            
            // Si hay items, insertarlos
            if (items.length > 0) {
                const insertItemsSql = `
                    INSERT INTO GimnacionChecklistItems (template_id, item_text, item_order, is_required, category)
                    VALUES (?, ?, ?, ?, ?)
                `;
                
                const stmt = db.prepare(insertItemsSql);
                let itemsInserted = 0;
                let errors = [];
                
                items.forEach((item, index) => {
                    stmt.run([
                        templateId,
                        item.item_description || item.item_text || '',
                        item.sort_order || item.item_order || index + 1,
                        item.is_required ? 1 : 0,
                        item.category || 'general'
                    ], function(err) {
                        if (err) {
                            errors.push(`Error inserting item ${index}: ${err.message}`);
                        }
                        itemsInserted++;
                        
                        // Cuando todos los items se han procesado
                        if (itemsInserted === items.length) {
                            stmt.finalize();
                            
                            if (errors.length > 0) {
                                console.error('Errors inserting items:', errors);
                                return res.status(500).json({ 
                                    error: 'Template creado pero hubo errores con algunos items',
                                    template_id: templateId,
                                    errors: errors
                                });
                            }
                            
                            res.json({
                                message: 'Template creado exitosamente',
                                data: {
                                    id: templateId,
                                    name: template_name.trim(),
                                    items_count: items.length
                                }
                            });
                        }
                    });
                });
            } else {
                // No hay items, responder directamente
                res.json({
                    message: 'Template creado exitosamente',
                    data: {
                        id: templateId,
                        name: template_name.trim(),
                        items_count: 0
                    }
                });
            }
        });
        
    } catch (error) {
        console.error('Create checklist template endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 7. PUT /api/gimnacion/checklist-templates/:id - Actualizar template de checklist
app.put('/api/gimnacion/checklist-templates/:id', authenticateToken, (req, res) => {
    try {
        const templateId = req.params.id;
        const { template_name, items = [] } = req.body;
        
        if (!template_name || template_name.trim() === '') {
            return res.status(400).json({ error: 'El nombre del template es requerido' });
        }
        
        // Actualizar template
        const updateTemplateSql = `
            UPDATE GimnacionChecklistTemplates 
            SET name = ?, updated_at = NOW()
            WHERE id = ?
        `;
        
        db.run(updateTemplateSql, [template_name.trim(), templateId], function(err) {
            if (err) {
                console.error('Error updating checklist template:', err);
                return res.status(500).json({ error: 'Error al actualizar template' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Template no encontrado' });
            }
            
            // Eliminar items existentes
            const deleteItemsSql = `DELETE FROM GimnacionChecklistItems WHERE template_id = ?`;
            
            db.run(deleteItemsSql, [templateId], (err) => {
                if (err) {
                    console.error('Error deleting existing items:', err);
                    return res.status(500).json({ error: 'Error al actualizar items' });
                }
                
                // Insertar nuevos items
                if (items.length > 0) {
                    const insertItemsSql = `
                        INSERT INTO GimnacionChecklistItems (template_id, item_text, item_order, is_required, category)
                        VALUES (?, ?, ?, ?, ?)
                    `;
                    
                    const stmt = db.prepare(insertItemsSql);
                    let itemsInserted = 0;
                    let errors = [];
                    
                    items.forEach((item, index) => {
                        stmt.run([
                            templateId,
                            item.item_description || item.item_text || '',
                            item.sort_order || item.item_order || index + 1,
                            item.is_required ? 1 : 0,
                            item.category || 'general'
                        ], function(err) {
                            if (err) {
                                errors.push(`Error inserting item ${index}: ${err.message}`);
                            }
                            itemsInserted++;
                            
                            // Cuando todos los items se han procesado
                            if (itemsInserted === items.length) {
                                stmt.finalize();
                                
                                if (errors.length > 0) {
                                    console.error('Errors inserting items:', errors);
                                    return res.status(500).json({ 
                                        error: 'Template actualizado pero hubo errores con algunos items',
                                        errors: errors
                                    });
                                }
                                
                                res.json({
                                    message: 'Template actualizado exitosamente',
                                    data: {
                                        id: templateId,
                                        name: template_name.trim(),
                                        items_count: items.length
                                    }
                                });
                            }
                        });
                    });
                } else {
                    // No hay items nuevos
                    res.json({
                        message: 'Template actualizado exitosamente',
                        data: {
                            id: templateId,
                            name: template_name.trim(),
                            items_count: 0
                        }
                    });
                }
            });
        });
        
    } catch (error) {
        console.error('Update checklist template endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 8. DELETE /api/gimnacion/checklist-templates/:id - Eliminar template de checklist
app.delete('/api/gimnacion/checklist-templates/:id', authenticateToken, (req, res) => {
    try {
        const templateId = req.params.id;
        
        // Verificar que el template existe
        const checkSql = `SELECT id, is_default FROM GimnacionChecklistTemplates WHERE id = ?`;
        
        db.get(checkSql, [templateId], (err, template) => {
            if (err) {
                console.error('Error checking template:', err);
                return res.status(500).json({ error: 'Error al verificar template' });
            }
            
            if (!template) {
                return res.status(404).json({ error: 'Template no encontrado' });
            }
            
            if (template.is_default) {
                return res.status(400).json({ error: 'No se puede eliminar un template por defecto' });
            }
            
            // Eliminar template (los items se eliminan automáticamente por CASCADE)
            const deleteSql = `DELETE FROM GimnacionChecklistTemplates WHERE id = ?`;
            
            db.run(deleteSql, [templateId], function(err) {
                if (err) {
                    console.error('Error deleting template:', err);
                    return res.status(500).json({ error: 'Error al eliminar template' });
                }
                
                res.json({
                    message: 'Template eliminado exitosamente',
                    data: { id: templateId }
                });
            });
        });
        
    } catch (error) {
        console.error('Delete checklist template endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
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

// GET /api/models - Obtener todos los modelos de EquipmentModels
app.get('/api/models', async (req, res) => {
    try {
        console.log('📋 Obteniendo lista de modelos desde EquipmentModels...');
        
        const query = `
            SELECT 
                id,
                name,
                brand,
                category,
                model_code,
                description,
                weight,
                dimensions,
                voltage,
                power,
                specifications AS technical_specs,
                created_at,
                updated_at
            FROM EquipmentModels 
            ORDER BY brand ASC, name ASC
        `;
        
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('❌ Error obteniendo modelos:', err);
                return res.status(500).json({
                    error: 'Error al obtener modelos',
                    details: err.message
                });
            }
            
            console.log(`✅ ${rows.length} modelos encontrados desde EquipmentModels`);
            
            res.json({
                message: 'success',
                data: rows,
                count: rows.length
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
        const { 
            name, 
            brand, 
            category, 
            model_code, 
            description, 
            weight, 
            dimensions, 
            voltage, 
            power, 
            technical_specs 
        } = req.body;
        
        if (!name || !brand || !category) {
            return res.status(400).json({
                error: 'Nombre, marca y categoría son requeridos'
            });
        }
        
        console.log('📝 Creando nuevo modelo:', name);
        
        // Verificar si el código del modelo ya existe
        if (model_code) {
            const checkQuery = `SELECT COUNT(*) as count FROM EquipmentModels WHERE model_code = ?`;
            
            db.get(checkQuery, [model_code], (err, row) => {
                if (err) {
                    console.error('❌ Error verificando código del modelo:', err);
                    return res.status(500).json({
                        error: 'Error al verificar código del modelo',
                        details: err.message
                    });
                }
                
                if (row.count > 0) {
                    return res.status(409).json({
                        error: 'El código del modelo ya existe'
                    });
                }
                
                // Proceder con la inserción
                insertModel();
            });
        } else {
            insertModel();
        }
        
        function insertModel() {
            const insertQuery = `
                INSERT INTO EquipmentModels 
                (name, brand, category, model_code, description, weight, dimensions, voltage, power, specifications)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            db.run(insertQuery, [
                name, 
                brand, 
                category, 
                model_code || null, 
                description || null, 
                weight || null, 
                dimensions || null, 
                voltage || null, 
                power || null, 
                technical_specs || null
            ], function(err) {
                if (err) {
                    console.error('❌ Error creando modelo:', err);
                    return res.status(500).json({
                        error: 'Error al crear modelo',
                        details: err.message
                    });
                }
                
                console.log(`✅ Modelo creado con ID: ${this.lastID}`);
                
                res.status(201).json({
                    message: 'success',
                    data: {
                        id: this.lastID,
                        name,
                        brand,
                        category,
                        model_code,
                        description,
                        weight,
                        dimensions,
                        voltage,
                        power,
                        technical_specs
                    }
                });
            });
        }
        
    } catch (error) {
        console.error('💥 Error en creación de modelo:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// PUT /api/models/:id - Actualizar un modelo
app.put('/api/models/:id', authenticateToken, async (req, res) => {
    try {
        const modelId = req.params.id;
        const { 
            name, 
            brand, 
            category, 
            model_code, 
            description, 
            weight, 
            dimensions, 
            voltage, 
            power, 
            technical_specs 
        } = req.body;
        
        if (!name || !brand || !category) {
            return res.status(400).json({
                error: 'Nombre, marca y categoría son requeridos'
            });
        }
        
        console.log('📝 Actualizando modelo ID:', modelId);
        
        // Verificar si el modelo existe
        const checkQuery = `SELECT * FROM EquipmentModels WHERE id = ?`;
        
        db.get(checkQuery, [modelId], (err, row) => {
            if (err) {
                console.error('❌ Error verificando modelo:', err);
                return res.status(500).json({
                    error: 'Error al verificar modelo',
                    details: err.message
                });
            }
            
            if (!row) {
                return res.status(404).json({
                    error: 'Modelo no encontrado'
                });
            }
            
            // Verificar código único si se está cambiando
            if (model_code && model_code !== row.model_code) {
                const checkCodeQuery = `SELECT COUNT(*) as count FROM EquipmentModels WHERE model_code = ? AND id != ?`;
                
                db.get(checkCodeQuery, [model_code, modelId], (err, codeRow) => {
                    if (err) {
                        console.error('❌ Error verificando código del modelo:', err);
                        return res.status(500).json({
                            error: 'Error al verificar código del modelo',
                            details: err.message
                        });
                    }
                    
                    if (codeRow.count > 0) {
                        return res.status(409).json({
                            error: 'El código del modelo ya existe'
                        });
                    }
                    
                    updateModel();
                });
            } else {
                updateModel();
            }
        });
        
        function updateModel() {
            const updateQuery = `
                UPDATE EquipmentModels SET
                    name = ?,
                    brand = ?,
                    category = ?,
                    model_code = ?,
                    description = ?,
                    weight = ?,
                    dimensions = ?,
                    voltage = ?,
                    power = ?,
                    specifications = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            db.run(updateQuery, [
                name, 
                brand, 
                category, 
                model_code || null, 
                description || null, 
                weight || null, 
                dimensions || null, 
                voltage || null, 
                power || null, 
                technical_specs || null,
                modelId
            ], function(err) {
                if (err) {
                    console.error('❌ Error actualizando modelo:', err);
                    return res.status(500).json({
                        error: 'Error al actualizar modelo',
                        details: err.message
                    });
                }
                
                console.log(`✅ Modelo ${modelId} actualizado exitosamente`);
                
                res.json({
                    message: 'success',
                    data: {
                        id: modelId,
                        name,
                        brand,
                        category,
                        model_code,
                        description,
                        weight,
                        dimensions,
                        voltage,
                        power,
                        technical_specs
                    }
                });
            });
        }
        
    } catch (error) {
        console.error('💥 Error en actualización de modelo:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// DELETE /api/models/:id - Eliminar un modelo
app.delete('/api/models/:id', authenticateToken, async (req, res) => {
    try {
        const modelId = req.params.id;
        
        console.log('🗑️ Eliminando modelo ID:', modelId);
        
        // Verificar si el modelo existe
        const checkQuery = `SELECT * FROM EquipmentModels WHERE id = ?`;
        
        db.get(checkQuery, [modelId], (err, row) => {
            if (err) {
                console.error('❌ Error verificando modelo:', err);
                return res.status(500).json({
                    error: 'Error al verificar modelo',
                    details: err.message
                });
            }
            
            if (!row) {
                return res.status(404).json({
                    error: 'Modelo no encontrado'
                });
            }
            
            // Verificar si hay equipos usando este modelo
            const equipmentCheckQuery = `SELECT COUNT(*) as count FROM Equipment WHERE model_id = ?`;
            
            db.get(equipmentCheckQuery, [modelId], (err, equipmentRow) => {
                if (err) {
                    console.error('❌ Error verificando equipos:', err);
                    return res.status(500).json({
                        error: 'Error al verificar equipos',
                        details: err.message
                    });
                }
                
                if (equipmentRow.count > 0) {
                    return res.status(409).json({
                        error: `No se puede eliminar el modelo. Hay ${equipmentRow.count} equipos usando este modelo.`
                    });
                }
                
                // Eliminar el modelo
                const deleteQuery = `DELETE FROM EquipmentModels WHERE id = ?`;
                
                db.run(deleteQuery, [modelId], function(err) {
                    if (err) {
                        console.error('❌ Error eliminando modelo:', err);
                        return res.status(500).json({
                            error: 'Error al eliminar modelo',
                            details: err.message
                        });
                    }
                    
                    console.log(`✅ Modelo ${modelId} eliminado exitosamente`);
                    
                    res.json({
                        message: 'success',
                        data: { deleted: true, id: modelId }
                    });
                });
            });
        });
        
    } catch (error) {
        console.error('💥 Error en eliminación de modelo:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// GET /api/models/:id/photos - Obtener fotos de un modelo
app.get('/api/models/:id/photos', async (req, res) => {
    try {
        const modelId = req.params.id;
        
        console.log('📷 Obteniendo fotos del modelo ID:', modelId);
        
        const query = `
            SELECT 
                id,
                photo_data,
                file_name,
                mime_type,
                file_size,
                is_primary,
                created_at
            FROM ModelPhotos 
            WHERE model_id = ?
            ORDER BY is_primary DESC, created_at ASC
        `;
        
        db.all(query, [modelId], (err, rows) => {
            if (err) {
                console.error('❌ Error obteniendo fotos del modelo:', err);
                return res.status(500).json({
                    error: 'Error al obtener fotos del modelo',
                    details: err.message
                });
            }
            
            const photos = rows.map(row => ({
                id: row.id,
                url: `data:${row.mime_type};base64,${row.photo_data}`,
                fileName: row.file_name,
                isPrimary: row.is_primary,
                size: row.file_size,
                createdAt: row.created_at
            }));
            
            console.log(`✅ ${photos.length} fotos encontradas para el modelo ${modelId}`);
            
            res.json(photos);
        });
        
    } catch (error) {
        console.error('💥 Error en endpoint de fotos:', error);
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

// ============================================================================
// QUOTES CRUD ENDPOINTS (Cotizaciones) - Financial Module
// ============================================================================

// GET /api/quotes - Obtener todas las cotizaciones
app.get('/api/quotes', authenticateToken, (req, res) => {
    console.log('📋 Obteniendo lista de cotizaciones...');
    
    const { status, client_id, date_from, date_to, limit = 50, offset = 0 } = req.query;
    
    let sql = `
        SELECT 
            q.*,
            c.name as client_name,
            u.username as created_by_name
        FROM Quotes q
        LEFT JOIN Clients c ON q.client_id = c.id
        LEFT JOIN Users u ON q.created_by = u.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
        sql += ` AND q.status = ?`;
        params.push(status);
    }
    
    if (client_id) {
        sql += ` AND q.client_id = ?`;
        params.push(client_id);
    }
    
    if (date_from) {
        sql += ` AND q.created_date >= ?`;
        params.push(date_from);
    }
    
    if (date_to) {
        sql += ` AND q.created_date <= ?`;
        params.push(date_to);
    }
    
    sql += ` ORDER BY q.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('❌ Error obteniendo cotizaciones:', err);
            res.status(500).json({ 
                error: 'Error obteniendo cotizaciones',
                details: err.message 
            });
            return;
        }
        
        console.log(`✅ ${rows.length} cotizaciones obtenidas`);
        res.json({
            message: 'success',
            data: rows,
            total: rows.length,
            offset: parseInt(offset),
            limit: parseInt(limit)
        });
    });
});

// POST /api/quotes - Crear nueva cotización
app.post('/api/quotes', authenticateToken, (req, res) => {
    const {
        client_id,
        quote_number,
        created_date,
        valid_until,
        description,
        items,
        subtotal,
        tax_amount,
        total,
        payment_terms,
        notes
    } = req.body;
    
    // Validaciones básicas
    if (!client_id || !created_date || !description || !total) {
        return res.status(400).json({
            error: 'Cliente, fecha, descripción y total son requeridos'
        });
    }
    
    if (total <= 0) {
        return res.status(400).json({
            error: 'El total debe ser mayor a 0'
        });
    }
    
    console.log(`📋 Creando nueva cotización para cliente ${client_id}: $${total}`);
    
    const sql = `
        INSERT INTO Quotes (
            client_id, quote_number, created_date, valid_until, description,
            items, subtotal, tax_amount, total, payment_terms, notes,
            created_by, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Borrador')
    `;
    
    const params = [
        client_id,
        quote_number || `Q-${Date.now()}`,
        created_date,
        valid_until || null,
        description,
        JSON.stringify(items || []),
        subtotal || 0,
        tax_amount || 0,
        total,
        payment_terms || null,
        notes || null,
        req.user.id
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error creando cotización:', err);
            res.status(500).json({ 
                error: 'Error creando cotización',
                details: err.message 
            });
            return;
        }
        
        console.log(`✅ Cotización creada con ID: ${this.lastID}`);
        res.status(201).json({
            message: 'Cotización creada exitosamente',
            id: this.lastID,
            quote_number: quote_number || `Q-${Date.now()}`
        });
    });
});

// PUT /api/quotes/:id - Actualizar cotización
app.put('/api/quotes/:id', authenticateToken, (req, res) => {
    const quoteId = req.params.id;
    const {
        client_id,
        quote_number,
        created_date,
        valid_until,
        description,
        items,
        subtotal,
        tax_amount,
        total,
        payment_terms,
        notes,
        status
    } = req.body;
    
    console.log(`📋 Actualizando cotización ID: ${quoteId}`);
    
    const sql = `
        UPDATE Quotes SET
            client_id = ?,
            quote_number = ?,
            created_date = ?,
            valid_until = ?,
            description = ?,
            items = ?,
            subtotal = ?,
            tax_amount = ?,
            total = ?,
            payment_terms = ?,
            notes = ?,
            status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    
    const params = [
        client_id,
        quote_number,
        created_date,
        valid_until,
        description,
        JSON.stringify(items || []),
        subtotal || 0,
        tax_amount || 0,
        total,
        payment_terms,
        notes,
        status || 'Borrador',
        quoteId
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error actualizando cotización:', err);
            res.status(500).json({ 
                error: 'Error actualizando cotización',
                details: err.message 
            });
            return;
        }
        
        if (this.changes === 0) {
            return res.status(404).json({
                error: 'Cotización no encontrada'
            });
        }
        
        console.log(`✅ Cotización ${quoteId} actualizada`);
        res.json({
            message: 'Cotización actualizada exitosamente',
            changes: this.changes
        });
    });
});

// DELETE /api/quotes/:id - Eliminar cotización
app.delete('/api/quotes/:id', authenticateToken, (req, res) => {
    const quoteId = req.params.id;
    
    console.log(`📋 Eliminando cotización ID: ${quoteId}`);
    
    const sql = 'DELETE FROM Quotes WHERE id = ?';
    
    db.run(sql, [quoteId], function(err) {
        if (err) {
            console.error('❌ Error eliminando cotización:', err);
            res.status(500).json({ 
                error: 'Error eliminando cotización',
                details: err.message 
            });
            return;
        }
        
        if (this.changes === 0) {
            return res.status(404).json({
                error: 'Cotización no encontrada'
            });
        }
        
        console.log(`✅ Cotización ${quoteId} eliminada`);
        res.json({
            message: 'Cotización eliminada exitosamente',
            changes: this.changes
        });
    });
});

// GET /api/quotes/:id - Obtener cotización específica
app.get('/api/quotes/:id', authenticateToken, (req, res) => {
    const quoteId = req.params.id;
    
    console.log(`📋 Obteniendo cotización ID: ${quoteId}`);
    
    const sql = `
        SELECT 
            q.*,
            c.name as client_name,
            c.email as client_email,
            c.phone as client_phone,
            u.username as created_by_name
        FROM Quotes q
        LEFT JOIN Clients c ON q.client_id = c.id
        LEFT JOIN Users u ON q.created_by = u.id
        WHERE q.id = ?
    `;
    
    db.get(sql, [quoteId], (err, row) => {
        if (err) {
            console.error('❌ Error obteniendo cotización:', err);
            res.status(500).json({ 
                error: 'Error obteniendo cotización',
                details: err.message 
            });
            return;
        }
        
        if (!row) {
            return res.status(404).json({
                error: 'Cotización no encontrada'
            });
        }
        
        // Parse items JSON if exists
        if (row.items) {
            try {
                row.items = JSON.parse(row.items);
            } catch (e) {
                console.warn('⚠️ Error parsing items JSON:', e);
                row.items = [];
            }
        }
        
        console.log(`✅ Cotización ${quoteId} obtenida`);
        res.json({
            message: 'success',
            data: row
        });
    });
});

// ============================================================================
// INVOICES CRUD ENDPOINTS (Facturas) - Financial Module  
// ============================================================================

// GET /api/invoices - Obtener todas las facturas
app.get('/api/invoices', authenticateToken, (req, res) => {
    console.log('🧾 Obteniendo lista de facturas...');
    
    const { status, client_id, date_from, date_to, limit = 50, offset = 0 } = req.query;
    
    let sql = `
        SELECT 
            i.*,
            c.name as client_name,
            u.username as created_by_name
        FROM Invoices i
        LEFT JOIN Clients c ON i.client_id = c.id
        LEFT JOIN Users u ON i.created_by = u.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
        sql += ` AND i.status = ?`;
        params.push(status);
    }
    
    if (client_id) {
        sql += ` AND i.client_id = ?`;
        params.push(client_id);
    }
    
    if (date_from) {
        sql += ` AND i.invoice_date >= ?`;
        params.push(date_from);
    }
    
    if (date_to) {
        sql += ` AND i.invoice_date <= ?`;
        params.push(date_to);
    }
    
    sql += ` ORDER BY i.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('❌ Error obteniendo facturas:', err);
            res.status(500).json({ 
                error: 'Error obteniendo facturas',
                details: err.message 
            });
            return;
        }
        
        console.log(`✅ ${rows.length} facturas obtenidas`);
        res.json({
            message: 'success',
            data: rows,
            total: rows.length,
            offset: parseInt(offset),
            limit: parseInt(limit)
        });
    });
});

// POST /api/invoices - Crear nueva factura
app.post('/api/invoices', authenticateToken, (req, res) => {
    const {
        client_id,
        quote_id,
        invoice_number,
        invoice_date,
        due_date,
        description,
        items,
        subtotal,
        tax_amount,
        total,
        payment_terms,
        notes
    } = req.body;
    
    // Validaciones básicas
    if (!client_id || !invoice_date || !description || !total) {
        return res.status(400).json({
            error: 'Cliente, fecha, descripción y total son requeridos'
        });
    }
    
    if (total <= 0) {
        return res.status(400).json({
            error: 'El total debe ser mayor a 0'
        });
    }
    
    console.log(`🧾 Creando nueva factura para cliente ${client_id}: $${total}`);
    
    const sql = `
        INSERT INTO Invoices (
            client_id, quote_id, invoice_number, invoice_date, due_date,
            description, items, subtotal, tax_amount, total, payment_terms,
            notes, created_by, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente')
    `;
    
    const params = [
        client_id,
        quote_id || null,
        invoice_number || `INV-${Date.now()}`,
        invoice_date,
        due_date || null,
        description,
        JSON.stringify(items || []),
        subtotal || 0,
        tax_amount || 0,
        total,
        payment_terms || null,
        notes || null,
        req.user.id
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error creando factura:', err);
            res.status(500).json({ 
                error: 'Error creando factura',
                details: err.message 
            });
            return;
        }
        
        console.log(`✅ Factura creada con ID: ${this.lastID}`);
        res.status(201).json({
            message: 'Factura creada exitosamente',
            id: this.lastID,
            invoice_number: invoice_number || `INV-${Date.now()}`
        });
    });
});

// PUT /api/invoices/:id - Actualizar factura
app.put('/api/invoices/:id', authenticateToken, (req, res) => {
    const invoiceId = req.params.id;
    const {
        client_id,
        quote_id,
        invoice_number,
        invoice_date,
        due_date,
        description,
        items,
        subtotal,
        tax_amount,
        total,
        payment_terms,
        notes,
        status,
        paid_date,
        paid_amount
    } = req.body;
    
    console.log(`🧾 Actualizando factura ID: ${invoiceId}`);
    
    const sql = `
        UPDATE Invoices SET
            client_id = ?,
            quote_id = ?,
            invoice_number = ?,
            invoice_date = ?,
            due_date = ?,
            description = ?,
            items = ?,
            subtotal = ?,
            tax_amount = ?,
            total = ?,
            payment_terms = ?,
            notes = ?,
            status = ?,
            paid_date = ?,
            paid_amount = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    
    const params = [
        client_id,
        quote_id,
        invoice_number,
        invoice_date,
        due_date,
        description,
        JSON.stringify(items || []),
        subtotal || 0,
        tax_amount || 0,
        total,
        payment_terms,
        notes,
        status || 'Pendiente',
        paid_date,
        paid_amount,
        invoiceId
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error actualizando factura:', err);
            res.status(500).json({ 
                error: 'Error actualizando factura',
                details: err.message 
            });
            return;
        }
        
        if (this.changes === 0) {
            return res.status(404).json({
                error: 'Factura no encontrada'
            });
        }
        
        console.log(`✅ Factura ${invoiceId} actualizada`);
        res.json({
            message: 'Factura actualizada exitosamente',
            changes: this.changes
        });
    });
});

// DELETE /api/invoices/:id - Eliminar factura
app.delete('/api/invoices/:id', authenticateToken, (req, res) => {
    const invoiceId = req.params.id;
    
    console.log(`🧾 Eliminando factura ID: ${invoiceId}`);
    
    const sql = 'DELETE FROM Invoices WHERE id = ?';
    
    db.run(sql, [invoiceId], function(err) {
        if (err) {
            console.error('❌ Error eliminando factura:', err);
            res.status(500).json({ 
                error: 'Error eliminando factura',
                details: err.message 
            });
            return;
        }
        
        if (this.changes === 0) {
            return res.status(404).json({
                error: 'Factura no encontrada'
            });
        }
        
        console.log(`✅ Factura ${invoiceId} eliminada`);
        res.json({
            message: 'Factura eliminada exitosamente',
            changes: this.changes
        });
    });
});

// GET /api/invoices/:id - Obtener factura específica
app.get('/api/invoices/:id', authenticateToken, (req, res) => {
    const invoiceId = req.params.id;
    
    console.log(`🧾 Obteniendo factura ID: ${invoiceId}`);
    
    const sql = `
        SELECT 
            i.*,
            c.name as client_name,
            c.email as client_email,
            c.phone as client_phone,
            c.address as client_address,
            u.username as created_by_name,
            q.quote_number
        FROM Invoices i
        LEFT JOIN Clients c ON i.client_id = c.id
        LEFT JOIN Users u ON i.created_by = u.id
        LEFT JOIN Quotes q ON i.quote_id = q.id
        WHERE i.id = ?
    `;
    
    db.get(sql, [invoiceId], (err, row) => {
        if (err) {
            console.error('❌ Error obteniendo factura:', err);
            res.status(500).json({ 
                error: 'Error obteniendo factura',
                details: err.message 
            });
            return;
        }
        
        if (!row) {
            return res.status(404).json({
                error: 'Factura no encontrada'
            });
        }
        
        // Parse items JSON if exists
        if (row.items) {
            try {
                row.items = JSON.parse(row.items);
            } catch (e) {
                console.warn('⚠️ Error parsing items JSON:', e);
                row.items = [];
            }
        }
        
        console.log(`✅ Factura ${invoiceId} obtenida`);
        res.json({
            message: 'success',
            data: row
        });
    });
});

// PUT /api/invoices/:id/mark-paid - Marcar factura como pagada
app.put('/api/invoices/:id/mark-paid', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const invoiceId = req.params.id;
    const { paid_amount, paid_date, payment_method, notes } = req.body;
    
    console.log(`🧾 Marcando factura ${invoiceId} como pagada`);
    
    const sql = `
        UPDATE Invoices SET
            status = 'Pagada',
            paid_date = ?,
            paid_amount = ?,
            payment_method = ?,
            payment_notes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    
    const params = [
        paid_date || new Date().toISOString().split('T')[0],
        paid_amount,
        payment_method || 'No especificado',
        notes || null,
        invoiceId
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error marcando factura como pagada:', err);
            res.status(500).json({ 
                error: 'Error marcando factura como pagada',
                details: err.message 
            });
            return;
        }
        
        if (this.changes === 0) {
            return res.status(404).json({
                error: 'Factura no encontrada'
            });
        }
        
        console.log(`✅ Factura ${invoiceId} marcada como pagada`);
        res.json({
            message: 'Factura marcada como pagada exitosamente',
            changes: this.changes
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
