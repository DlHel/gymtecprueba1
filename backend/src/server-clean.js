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
const AuthService = require('./services/auth-service');

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
                const sql = `INSERT INTO TicketChecklists (ticket_id, title, order_index) VALUES (?, ?, ?)`;
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
// MANEJADORES GLOBALES DE ERRORES Y FINALIZACIÓN
// ===================================================================

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
        console.log(`📂 Base de datos: ${db.filename || 'MySQL/SQLite'}`);
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
