const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const nodemailer = require('nodemailer');

console.log('🚀🚀🚀 CARGANDO server-clean.js - INICIO DEL ARCHIVO 🚀🚀🚀');

// CRÍTICO: Cargar variables de entorno DESPUÉS de require('path')
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

// Base de datos - usando adaptador configurable
const dbAdapter = require('./db-adapter');
const db = dbAdapter;

// Servicios de Autenticación
const AuthService = require('./services/authService');

// Router imports
const purchaseOrdersRoutes = require('./routes/purchase-orders');
const inventoryRoutes = require('./routes/inventory'); // Ensure this is mounted too just in case
const planningRoutes = require('./modules/planning/planning.routes'); // ✅ NUEVO: Módulo planificador

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
// HELPER FUNCTIONS
// ===================================================================

/**
 * Convierte una fecha JavaScript a formato MySQL DATETIME (hora local)
 * Esto evita problemas de zona horaria al guardar/recuperar fechas
 * @param {Date} date - Fecha a convertir (por defecto: fecha actual)
 * @returns {string} Fecha en formato MySQL 'YYYY-MM-DD HH:MM:SS'
 */
function toMySQLDateTime(date = new Date()) {
    // Obtener componentes de fecha en zona horaria local
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// ===================================================================
// CONFIGURACIÓN BÁSICA DE EXPRESS
// ===================================================================

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware básico
app.use(cors());

// Helper para detectar peticiones multipart (file uploads)
const isMultipart = (req) => {
    const ct = req.headers['content-type'];
    return ct && (ct.includes('multipart/form-data') || ct.includes('application/octet-stream'));
};

// Middleware JSON condicionado - ignora multipart para permitir multer
app.use((req, res, next) => {
    if (isMultipart(req)) return next();
    express.json({ limit: '50mb' })(req, res, next);
});

// Middleware urlencoded condicionado - ignora multipart para permitir multer  
app.use((req, res, next) => {
    if (isMultipart(req)) return next();
    express.urlencoded({ limit: '50mb', extended: true })(req, res, next);
});

// Rutas de API
app.use('/api/purchase-orders', purchaseOrdersRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/maintenance-tasks', planningRoutes); // ✅ NUEVO: Planificador con UNION corregida

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


// Configuración para reportes PDF
const storageReports = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../uploads/reports/');
        // Asegurar que el directorio existe (node < 10 no tiene recursive: true en mkdirSync, pero asumimos entorno moderno)
        const fs = require('fs');
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Usar el nombre original o generar uno seguro
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'report-' + uniqueSuffix + '.pdf');
    }
});

const uploadReports = multer({ 
    storage: storageReports,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF'));
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
            return res.status(401).json({
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
        const userRoleLower = userRole ? userRole.toLowerCase() : '';
        const hasPermission = roles.some(role => {
            const roleLower = role.toLowerCase();
            // Case-insensitive comparison
            if (roleLower === 'admin') {
                return userRoleLower === 'admin' || userRoleLower === 'administrador';
            }
            return userRoleLower === roleLower;
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

// POST create new user
app.post('/api/users', authenticateToken, async (req, res) => {
    // Solo Admin puede crear usuarios
    if (req.user.role !== 'Admin') {
        return res.status(403).json({ 
            error: 'No tienes permisos para crear usuarios' 
        });
    }

    const { username, email, password, role, status } = req.body;

    // Validaciones
    if (!username || !email || !password || !role) {
        return res.status(400).json({ 
            error: 'Faltan campos requeridos: username, email, password, role' 
        });
    }

    if (password.length < 6) {
        return res.status(400).json({ 
            error: 'La contraseña debe tener al menos 6 caracteres' 
        });
    }

    const validRoles = ['Admin', 'Manager', 'Technician', 'Client'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ 
            error: 'Rol inválido. Debe ser: Admin, Manager, Technician o Client' 
        });
    }

    try {
        // Verificar si el username ya existe
        const checkUserSql = 'SELECT id FROM Users WHERE username = ?';
        db.get(checkUserSql, [username], async (err, existingUser) => {
            if (err) {
                console.error('❌ Error checking username:', err);
                return res.status(500).json({ error: 'Error al verificar usuario' });
            }

            if (existingUser) {
                return res.status(409).json({ 
                    error: 'El nombre de usuario ya existe' 
                });
            }

            // Verificar si el email ya existe
            const checkEmailSql = 'SELECT id FROM Users WHERE email = ?';
            db.get(checkEmailSql, [email], async (err, existingEmail) => {
                if (err) {
                    console.error('❌ Error checking email:', err);
                    return res.status(500).json({ error: 'Error al verificar email' });
                }

                if (existingEmail) {
                    return res.status(409).json({ 
                        error: 'El email ya está registrado' 
                    });
                }

                // Hash de la contraseña
                const hashedPassword = await bcrypt.hash(password, 10);

                // Insertar usuario
                const insertSql = `
                    INSERT INTO Users (username, email, password_hash, role, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, NOW(), NOW())
                `;

                const userStatus = status || 'active';

                db.run(insertSql, [username, email, hashedPassword, role, userStatus], function(err) {
                    if (err) {
                        console.error('❌ Error creating user:', err);
                        return res.status(500).json({ 
                            error: 'Error al crear usuario: ' + err.message 
                        });
                    }

                    const newUserId = this.lastID;

                    console.log(`✅ Usuario creado: ${username} (${role}) - ID: ${newUserId}`);

                    // Retornar usuario creado (sin contraseña)
                    const selectSql = 'SELECT id, username, email, role, status, created_at FROM Users WHERE id = ?';
                    db.get(selectSql, [newUserId], (err, user) => {
                        if (err) {
                            console.error('❌ Error getting created user:', err);
                            return res.status(500).json({ error: 'Usuario creado pero error al recuperarlo' });
                        }

                        res.status(201).json({ 
                            message: 'Usuario creado exitosamente',
                            data: user 
                        });
                    });
                });
            });
        });
    } catch (error) {
        console.error('❌ Error in user creation:', error);
        res.status(500).json({ 
            error: 'Error al crear usuario: ' + error.message 
        });
    }
});

// PUT update user
app.put('/api/users/:id', authenticateToken, async (req, res) => {
    // Solo Admin puede actualizar usuarios
    if (req.user.role !== 'Admin') {
        return res.status(403).json({ 
            error: 'No tienes permisos para actualizar usuarios' 
        });
    }

    const userId = req.params.id;
    const { username, email, password, role, status } = req.body;

    // Validaciones básicas
    if (!username || !email || !role) {
        return res.status(400).json({ 
            error: 'Faltan campos requeridos: username, email, role' 
        });
    }

    const validRoles = ['Admin', 'Manager', 'Technician', 'Client'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ 
            error: 'Rol inválido' 
        });
    }

    try {
        // Si hay contraseña nueva, hashearla
        let updateFields = [username, email, role, status || 'active'];
        let updateSql = `
            UPDATE Users 
            SET username = ?, email = ?, role = ?, status = ?, updated_at = NOW()
        `;

        if (password && password.trim() !== '') {
            if (password.length < 6) {
                return res.status(400).json({ 
                    error: 'La contraseña debe tener al menos 6 caracteres' 
                });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            updateSql += ', password_hash = ?';
            updateFields.push(hashedPassword);
        }

        updateSql += ' WHERE id = ?';
        updateFields.push(userId);

        db.run(updateSql, updateFields, function(err) {
            if (err) {
                console.error('❌ Error updating user:', err);
                return res.status(500).json({ 
                    error: 'Error al actualizar usuario: ' + err.message 
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({ 
                    error: 'Usuario no encontrado' 
                });
            }

            console.log(`✅ Usuario actualizado: ID ${userId}`);

            // Retornar usuario actualizado
            const selectSql = 'SELECT id, username, email, role, status, created_at, updated_at FROM Users WHERE id = ?';
            db.get(selectSql, [userId], (err, user) => {
                if (err) {
                    return res.status(500).json({ error: 'Error al recuperar usuario actualizado' });
                }

                res.json({ 
                    message: 'Usuario actualizado exitosamente',
                    data: user 
                });
            });
        });
    } catch (error) {
        console.error('❌ Error in user update:', error);
        res.status(500).json({ 
            error: 'Error al actualizar usuario: ' + error.message 
        });
    }
});

// DELETE user
app.delete('/api/users/:id', authenticateToken, (req, res) => {
    // Solo Admin puede eliminar usuarios
    if (req.user.role !== 'Admin') {
        return res.status(403).json({ 
            error: 'No tienes permisos para eliminar usuarios' 
        });
    }

    const userId = req.params.id;

    // No permitir eliminar al propio usuario
    if (parseInt(userId, 10) === req.user.id) {
        return res.status(400).json({ 
            error: 'No puedes eliminar tu propio usuario' 
        });
    }

    const sql = 'DELETE FROM Users WHERE id = ?';
    
    db.run(sql, [userId], function(err) {
        if (err) {
            console.error('❌ Error deleting user:', err);
            return res.status(500).json({ 
                error: 'Error al eliminar usuario: ' + err.message 
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({ 
                error: 'Usuario no encontrado' 
            });
        }

        console.log(`✅ Usuario eliminado: ID ${userId}`);
        res.json({ 
            message: 'Usuario eliminado exitosamente' 
        });
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

// GET all maintenance tasks (includes tickets with due_date)
app.get('/api/maintenance-tasks', authenticateToken, (req, res) => {
    // Query combinada: MaintenanceTasks + Tickets con due_date
    // NOTA: Se usa COLLATE para evitar error "Illegal mix of collations"
    const sql = `
        SELECT 
            mt.id,
            'task' COLLATE utf8mb4_unicode_ci as source_type,
            mt.title COLLATE utf8mb4_unicode_ci as title,
            mt.description COLLATE utf8mb4_unicode_ci as description,
            mt.type COLLATE utf8mb4_unicode_ci as type,
            mt.status COLLATE utf8mb4_unicode_ci as status,
            mt.priority COLLATE utf8mb4_unicode_ci as priority,
            mt.scheduled_date,
            mt.scheduled_time,
            mt.estimated_duration,
            mt.actual_duration,
            mt.notes COLLATE utf8mb4_unicode_ci as notes,
            mt.is_preventive,
            mt.started_at,
            mt.completed_at,
            mt.created_at,
            mt.updated_at,
            e.name COLLATE utf8mb4_unicode_ci as equipment_name,
            e.serial_number COLLATE utf8mb4_unicode_ci as equipment_serial,
            em.name COLLATE utf8mb4_unicode_ci as equipment_model,
            u.username COLLATE utf8mb4_unicode_ci as technician_username,
            u.username COLLATE utf8mb4_unicode_ci as technician_name,
            c.name COLLATE utf8mb4_unicode_ci as client_name,
            l.name COLLATE utf8mb4_unicode_ci as location_name
        FROM MaintenanceTasks mt
        LEFT JOIN Equipment e ON mt.equipment_id = e.id
        LEFT JOIN EquipmentModels em ON e.model_id = em.id
        LEFT JOIN Users u ON mt.technician_id = u.id
        LEFT JOIN Clients c ON mt.client_id = c.id
        LEFT JOIN Locations l ON mt.location_id = l.id
        
        UNION ALL
        
        SELECT 
            t.id,
            'ticket' COLLATE utf8mb4_unicode_ci as source_type,
            t.title COLLATE utf8mb4_unicode_ci as title,
            t.description COLLATE utf8mb4_unicode_ci as description,
            'repair' COLLATE utf8mb4_unicode_ci as type,
            t.status COLLATE utf8mb4_unicode_ci as status,
            t.priority COLLATE utf8mb4_unicode_ci as priority,
            DATE_FORMAT(t.due_date, '%Y-%m-%d') as scheduled_date,
            DATE_FORMAT(t.due_date, '%H:%i:%s') as scheduled_time,
            NULL as estimated_duration,
            NULL as actual_duration,
            NULL as notes,
            0 as is_preventive,
            NULL as started_at,
            NULL as completed_at,
            t.created_at,
            t.updated_at,
            eq.name COLLATE utf8mb4_unicode_ci as equipment_name,
            eq.serial_number COLLATE utf8mb4_unicode_ci as equipment_serial,
            eqm.name COLLATE utf8mb4_unicode_ci as equipment_model,
            tech.username COLLATE utf8mb4_unicode_ci as technician_username,
            tech.username COLLATE utf8mb4_unicode_ci as technician_name,
            cl.name COLLATE utf8mb4_unicode_ci as client_name,
            loc.name COLLATE utf8mb4_unicode_ci as location_name
        FROM Tickets t
        LEFT JOIN Equipment eq ON t.equipment_id = eq.id
        LEFT JOIN EquipmentModels eqm ON eq.model_id = eqm.id
        LEFT JOIN Users tech ON t.assigned_technician_id = tech.id
        LEFT JOIN Clients cl ON t.client_id = cl.id
        LEFT JOIN Locations loc ON t.location_id = loc.id
        WHERE t.due_date IS NOT NULL
        AND t.status NOT IN ('Cerrado', 'Resuelto')
        
        ORDER BY scheduled_date DESC, scheduled_time ASC
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
        
        // Separar conteos para logging
        const taskCount = rows.filter(r => r.source_type === 'task').length;
        const ticketCount = rows.filter(r => r.source_type === 'ticket').length;
        
        console.log(`✅ Planificador: ${taskCount} tareas + ${ticketCount} tickets = ${rows.length} total`);
        res.json({ 
            message: 'success',
            data: rows,
            metadata: {
                total: rows.length,
                tasks: taskCount,
                tickets: ticketCount,
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
    const taskId = parseInt(req.params.id, 10);
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
    const taskId = parseInt(req.params.id, 10);
    
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
// GET system settings
app.get('/api/system-settings', authenticateToken, requireRole(['Admin']), (req, res) => {
    const sql = 'SELECT * FROM SystemSettings ORDER BY setting_key';
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Error getting system settings:', err);
            res.status(500).json({ error: 'Error retrieving settings' });
            return;
        }
        
        console.log('📊 Raw settings from DB:', rows.length);

        // Transform flat key-value pairs to nested object
        const settings = {
            company: {},
            workSchedule: { days: {} },
            security: {},
            maintenance: {},
            integrations: {}
        };

        rows.forEach(row => {
            const key = row.setting_key;
            const value = row.setting_value;

            // Parse boolean and numbers
            let parsedValue = value;
            if (value === 'true') parsedValue = true;
            else if (value === 'false') parsedValue = false;
            else if (!isNaN(value) && value.trim() !== '') parsedValue = Number(value);

            // Assign to nested object
            if (key.startsWith('company.')) {
                settings.company[key.split('.')[1]] = parsedValue;
            } else if (key.startsWith('workSchedule.days.')) {
                settings.workSchedule.days[key.split('.')[2]] = parsedValue;
            } else if (key.startsWith('workSchedule.')) {
                settings.workSchedule[key.split('.')[1]] = parsedValue;
            } else if (key.startsWith('security.')) {
                settings.security[key.split('.')[1]] = parsedValue;
            } else if (key.startsWith('maintenance.')) {
                settings.maintenance[key.split('.')[1]] = parsedValue;
            } else if (key.startsWith('integrations.')) {
                settings.integrations[key.split('.')[1]] = parsedValue;
            }
        });
        
        console.log('✅ System settings retrieved from DB');
        res.json({ data: settings });
    });
});

// PUT update system settings
app.put('/api/system-settings', authenticateToken, requireRole(['Admin']), async (req, res) => {
    const settings = req.body;
    
    if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'Invalid settings format' });
    }

    // Helper to flatten object to array of {key, value}
    const flatSettings = [];
    
    // Company
    if (settings.company) {
        Object.keys(settings.company).forEach(k => flatSettings.push({ key: `company.${k}`, value: settings.company[k] }));
    }
    
    // Work Schedule
    if (settings.workSchedule) {
        const { days, ...rest } = settings.workSchedule;
        Object.keys(rest).forEach(k => flatSettings.push({ key: `workSchedule.${k}`, value: rest[k] }));
        if (days) {
            Object.keys(days).forEach(k => flatSettings.push({ key: `workSchedule.days.${k}`, value: days[k] }));
        }
    }
    
    // Security
    if (settings.security) {
        Object.keys(settings.security).forEach(k => flatSettings.push({ key: `security.${k}`, value: settings.security[k] }));
    }
    
    // Maintenance
    if (settings.maintenance) {
        Object.keys(settings.maintenance).forEach(k => flatSettings.push({ key: `maintenance.${k}`, value: settings.maintenance[k] }));
    }
    
    // Integrations
    if (settings.integrations) {
        Object.keys(settings.integrations).forEach(k => flatSettings.push({ key: `integrations.${k}`, value: settings.integrations[k] }));
    }

    // Update in DB using transaction
    let connection;
    try {
        // Get connection from pool
        connection = await db.db.pool.getConnection();
        
        // Start transaction
        await connection.beginTransaction();

        const stmtSql = 'INSERT INTO SystemSettings (setting_key, setting_value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP';
        
        for (const item of flatSettings) {
            await connection.query(stmtSql, [item.key, String(item.value)]);
        }

        // Commit
        await connection.commit();

        console.log('✅ System settings updated in DB');
        res.json({ 
            message: 'Settings updated successfully',
            data: settings
        });

    } catch (error) {
        console.error('❌ Error updating settings:', error);
        
        // Rollback
        if (connection) {
            await connection.rollback();
        }

        res.status(500).json({ error: 'Error saving settings: ' + error.message });
    } finally {
        // Release connection
        if (connection) {
            connection.release();
        }
    }
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

app.delete("/api/clients/:id", authenticateToken, async (req, res) => {
    const clientId = req.params.id;
    console.log(`🗑️ Iniciando eliminación en cascada para cliente ID: ${clientId}`);
    
    try {
        // Paso 1: Eliminar fotos de equipos
        console.log("📋 Paso 1: Eliminando fotos de equipos...");
        const deleteEquipmentPhotosSQL = `
            DELETE FROM EquipmentPhotos 
            WHERE equipment_id IN (
                SELECT e.id FROM Equipment e 
                JOIN Locations l ON e.location_id = l.id 
                WHERE l.client_id = ?
            )
        `;
        await db.runAsync(deleteEquipmentPhotosSQL, [clientId]);
        console.log("✅ Fotos de equipos eliminadas");
        
        // Paso 2: Eliminar notas de equipos
        console.log("📝 Paso 2: Eliminando notas de equipos...");
        const deleteEquipmentNotesSQL = `
            DELETE FROM EquipmentNotes 
            WHERE equipment_id IN (
                SELECT e.id FROM Equipment e 
                JOIN Locations l ON e.location_id = l.id 
                WHERE l.client_id = ?
            )
        `;
        await db.runAsync(deleteEquipmentNotesSQL, [clientId]);
        console.log("✅ Notas de equipos eliminadas");
        
        // Paso 3: Eliminar tickets relacionados con el cliente
        console.log("🎫 Paso 3: Eliminando tickets...");
        const deleteTicketsSQL = 'DELETE FROM Tickets WHERE client_id = ?';
        await db.runAsync(deleteTicketsSQL, [clientId]);
        console.log("✅ Tickets eliminados");
        
        // Paso 4: Eliminar equipos
        console.log("🔧 Paso 4: Eliminando equipos...");
        const deleteEquipmentSQL = `
            DELETE FROM Equipment 
            WHERE location_id IN (
                SELECT id FROM Locations WHERE client_id = ?
            )
        `;
        await db.runAsync(deleteEquipmentSQL, [clientId]);
        console.log("✅ Equipos eliminados");
        
        // Paso 5: Eliminar sedes
        console.log("🏢 Paso 5: Eliminando sedes...");
        const deleteLocationsSQL = 'DELETE FROM Locations WHERE client_id = ?';
        await db.runAsync(deleteLocationsSQL, [clientId]);
        console.log("✅ Sedes eliminadas");
        
        // Paso 6: Eliminar cliente
        console.log("👤 Paso 6: Eliminando cliente...");
        const deleteClientSQL = 'DELETE FROM Clients WHERE id = ?';
        const result = await db.runAsync(deleteClientSQL, [clientId]);
        
        if (result.affectedRows === 0) {
            console.log("⚠️ Cliente no encontrado");
            return res.status(404).json({"error": "Cliente no encontrado"});
        }
        
        console.log("🎉 Eliminación en cascada completada exitosamente");
        res.json({
            "message": "Cliente y todos sus datos relacionados eliminados exitosamente",
            "clientId": clientId
        });
        
    } catch (err) {
        console.error("❌ Error en eliminación en cascada:", err.message);
        res.status(500).json({"error": "Error al eliminar cliente: " + err.message});
    }
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

app.get('/api/clients/:clientId/locations', authenticateToken, (req, res) => {
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

app.get("/api/locations/:id", authenticateToken, (req, res) => {
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

app.put("/api/locations/:id", authenticateToken, (req, res) => {
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

app.delete("/api/locations/:id", authenticateToken, (req, res) => {
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
    // Query sin JOIN a EquipmentModels (usar columnas directas de Equipment)
    const sql = `
        SELECT 
            e.id,
            e.name,
            e.custom_id,
            e.serial_number,
            e.location_id,
            e.model_id,
            e.brand,
            e.model,
            e.type,
            e.acquisition_date,
            e.last_maintenance_date,
            e.notes,
            e.created_at,
            e.updated_at,
            e.brand as model_brand,
            e.model as model_name,
            l.name as location_name,
            c.name as client_name
        FROM Equipment e
        LEFT JOIN Locations l ON e.location_id = l.id
        LEFT JOIN Clients c ON l.client_id = c.id
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

// FASE 2 ENHANCEMENTS - Sistema de Notificaciones Inteligentes (Production mode)
try {
    const notificationsRoutes = require('./routes/notifications');
    // const notificationsTestRoutes = require('./routes/notifications-test'); // ⚠️ TEST ROUTE - Disabled in production
    // const notificationsSimpleTestRoutes = require('./routes/notifications-simple-test'); // ⚠️ TEST ROUTE - Disabled in production
    const notificationsFixedRoutes = require('./routes/notifications-fixed');
    // const testDbRoutes = require('./routes/test-db'); // ⚠️ TEST ROUTE - Disabled in production
    // const simpleTestRoutes = require('./routes/simple-test'); // ⚠️ TEST ROUTE - Disabled in production
    
    app.use('/api/notifications', notificationsRoutes);
    // app.use('/api/notifications', notificationsTestRoutes); // ⚠️ TEST ROUTE - Disabled in production
    // app.use('/api/notifications', notificationsSimpleTestRoutes); // ⚠️ TEST ROUTE - Disabled in production
    app.use('/api/notifications', notificationsFixedRoutes);
    // app.use('/api', testDbRoutes); // ⚠️ TEST ROUTE - Disabled in production
    // app.use('/api', simpleTestRoutes); // ⚠️ TEST ROUTE - Disabled in production
    
    console.log('✅ Fase 2 Routes loaded: Sistema de Notificaciones (Production mode)');
} catch (error) {
    console.warn('⚠️  Warning: Some Fase 2 routes could not be loaded:', error.message);
}

// PAYROLL SYSTEM - Sistema de N�mina Chile
try {
    const payrollRoutes = require('./routes/payroll-chile');
    // app.use('/api', payrollRoutes); // Disabled: routes initialized via function call later
    console.log('? Payroll Routes loaded: Sistema de N�mina Chile con c�lculos autom�ticos');
} catch (error) {
    console.warn('⚠️  Warning: Some Fase 2 routes could not be loaded:', error.message);
}

// FASE 3 ENHANCEMENTS - Sistema de Inventario Inteligente y Reportes
try {
    const inventoryRoutes = require('./routes/inventory');
    const purchaseOrdersRoutes = require('./routes/purchase-orders');
    
    app.use('/api/inventory', inventoryRoutes);
    app.use('/api/purchase-orders', purchaseOrdersRoutes);
    
    console.log('✅ Fase 3 Routes loaded: Sistema de Inventario Inteligente y Reportes');
    console.log('   📦 /api/inventory/* (Gestión de Inventario)');
    console.log('   🛒 /api/purchase-orders/* (Órdenes de Compra)');
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
            
            // Obtener notas del ticket (usar ticketnotes donde se guardan)
            const notesSql = `SELECT * FROM ticketnotes WHERE ticket_id = ? ORDER BY created_at DESC`;
            
            db.all(notesSql, [ticketId], (notesErr, notes) => {
                if (notesErr) {
                    console.log('⚠️ Error obteniendo notas (continuando sin notas):', notesErr.message);
                    notes = [];
                }
                
                console.log(`📝 Encontradas ${notes ? notes.length : 0} notas para ticket ${ticketId}`);
                
                // Obtener checklist del ticket (usar ticketchecklists)
                const checklistSql = `SELECT * FROM ticketchecklists WHERE ticket_id = ? ORDER BY created_at DESC`;
                
                db.all(checklistSql, [ticketId], (checklistErr, checklist) => {
                    if (checklistErr) {
                        console.log('⚠️ Error obteniendo checklist (continuando sin checklist):', checklistErr.message);
                        checklist = [];
                    }
                    
                    console.log(`📋 Encontradas ${checklist ? checklist.length : 0} tareas de checklist para ticket ${ticketId}`);
                    
                    // Obtener repuestos usados del ticket
                    const sparePartsSql = `
                        SELECT tsp.*, sp.name as spare_part_name, sp.sku as spare_part_sku
                        FROM TicketSpareParts tsp
                        LEFT JOIN SpareParts sp ON tsp.spare_part_id = sp.id
                        WHERE tsp.ticket_id = ?
                        ORDER BY tsp.used_at DESC
                    `;
                    
                    db.all(sparePartsSql, [ticketId], (sparePartsErr, spareParts) => {
                        if (sparePartsErr) {
                            console.log('⚠️ Error obteniendo spare_parts (continuando sin repuestos):', sparePartsErr.message);
                            spareParts = [];
                        }
                        
                        console.log(`🔧 Encontrados ${spareParts ? spareParts.length : 0} repuestos para ticket ${ticketId}`);
                    
                        // Estructurar respuesta completa con TODOS los datos
                        const detailedTicket = {
                            ...ticket,
                            photos: photos || [],
                            notes: notes || [],
                            checklist: checklist || [],
                            spare_parts: spareParts || [], // ✅ NUEVO: Agregar repuestos
                            activities: [], // Mantenemos actividades vacío por ahora
                            metadata: {
                                photos_count: photos ? photos.length : 0,
                                notes_count: notes ? notes.length : 0,
                                checklist_count: checklist ? checklist.length : 0,
                                spare_parts_count: spareParts ? spareParts.length : 0,
                                activities_count: 0,
                                last_updated: ticket.updated_at,
                                created_date: ticket.created_at
                            }
                        };
                        
                        console.log(`✅ Detalle completo del ticket ${ticketId} preparado - Fotos: ${detailedTicket.metadata.photos_count}, Notas: ${detailedTicket.metadata.notes_count}, Checklist: ${detailedTicket.metadata.checklist_count}, Repuestos: ${detailedTicket.metadata.spare_parts_count}`);
                        
                        return res.json({
                            success: true,
                            message: "success", 
                            data: detailedTicket
                        });
                    }); // cierre spare_parts callback
                }); // cierre checklist callback
            }); // cierre notes callback
        }); // cierre photos callback
    }); // cierre ticket callback
});

// POST new ticket
app.post('/api/tickets', authenticateToken, (req, res) => {
    const { client_id, location_id, equipment_id, title, description, priority, due_date } = req.body;

    // Basic validation
    if (!title || !client_id || !priority) {
        return res.status(400).json({ error: "Título, Cliente y Prioridad son campos obligatorios." });
    }

    // Convertir due_date de formato ISO a formato MySQL si existe
    let formattedDueDate = null;
    if (due_date) {
        try {
            formattedDueDate = toMySQLDateTime(new Date(due_date));
        } catch (e) {
            console.warn('⚠️ Error parseando due_date, usando valor original:', due_date);
            formattedDueDate = due_date;
        }
    }

    const sql = `INSERT INTO Tickets (client_id, location_id, equipment_id, title, description, priority, due_date, status, ticket_type, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
    const params = [client_id, location_id || null, equipment_id || null, title, description, priority, formattedDueDate, 'Abierto', 'individual'];
    
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
            e.brand,
            e.model as model_name,
            e.type as category,
            1 as is_included
        FROM TicketEquipmentScope tes
        INNER JOIN Equipment e ON tes.equipment_id = e.id
        WHERE tes.ticket_id = ?
        ORDER BY e.type, e.name
    `;
    
    db.all(sql, [ticketId], (err, rows) => {
        if (err) {
            console.error('❌ Error fetching equipment scope:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        console.log(`✅ Found ${rows ? rows.length : 0} equipment items for ticket ${ticketId}`);
        
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

    // Convertir due_date de formato ISO a formato MySQL si existe
    let formattedDueDate = null;
    if (due_date) {
        try {
            formattedDueDate = toMySQLDateTime(new Date(due_date));
        } catch (e) {
            console.warn('⚠️ Error parseando due_date, usando valor original:', due_date);
            formattedDueDate = due_date;
        }
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
                 
    const params = [client_id, location_id, equipment_id, title, description, status, priority, formattedDueDate, req.params.id];

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
        parseInt(ticketId, 10), 
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
app.post('/api/tickets/:ticketId/photos', authenticateToken, async (req, res) => {
    const { ticketId } = req.params;
    // Usar let para permitir modificación durante compresión de imagen
    let { photo_data, file_name, mime_type, file_size, description, photo_type } = req.body;
    
    console.log(`📸 Solicitud de subir foto al ticket ${ticketId}:`, {
        file_name,
        mime_type,
        photo_data_length: photo_data?.length || 0,
        file_size,
        photo_type
    });
    
    if (!photo_data || !mime_type) {
        console.warn('⚠️ Falta photo_data o mime_type');
        return res.status(400).json({ 
            error: "photo_data y mime_type son requeridos",
            code: 'PHOTO_DATA_REQUIRED'
        });
    }
    
    // Validar tamaño del archivo (límite 10MB en base64)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (photo_data.length > maxSize) {
        console.warn(`⚠️ Archivo demasiado grande: ${photo_data.length} bytes`);
        return res.status(400).json({
            error: "La imagen es demasiado grande (máximo 10MB)",
            code: 'FILE_TOO_LARGE'
        });
    }
    
    try {
        // Compresión de imagen con Sharp
        let processedPhotoData = photo_data;
        let processedSize = file_size;
        
        try {
            // Verificar si es una imagen base64 válida
            if (photo_data.includes('base64,')) {
                const base64Data = photo_data.split(';base64,').pop();
                const imgBuffer = Buffer.from(base64Data, 'base64');
                
                console.log(`🔄 Comprimiendo imagen (${(imgBuffer.length / 1024).toFixed(2)} KB)...`);
                
                const compressedBuffer = await sharp(imgBuffer)
                    .resize(1280, 1280, { 
                        fit: 'inside',
                        withoutEnlargement: true 
                    })
                    .jpeg({ quality: 80, mozjpeg: true }) // Convertir siempre a JPEG optimizado
                    .toBuffer();
                
                processedPhotoData = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
                processedSize = compressedBuffer.length;
                
                console.log(`✅ Imagen comprimida: ${(processedSize / 1024).toFixed(2)} KB (Ahorro: ${((1 - processedSize/imgBuffer.length)*100).toFixed(1)}%)`);
                
                // Actualizar mime_type a jpeg ya que convertimos todo
                mime_type = 'image/jpeg';
                if (file_name && !file_name.toLowerCase().endsWith('.jpg') && !file_name.toLowerCase().endsWith('.jpeg')) {
                    file_name = file_name.split('.')[0] + '.jpg';
                }
            }
        } catch (sharpError) {
            console.error('⚠️ Error al comprimir imagen, usando original:', sharpError);
            // Continuar con la imagen original si falla la compresión
        }

        const sql = `INSERT INTO TicketPhotos 
                     (ticket_id, photo_data, file_name, mime_type, file_size, description, photo_type, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`;
        const params = [
            parseInt(ticketId, 10), 
            processedPhotoData, 
            file_name || 'foto.jpg', 
            mime_type, 
            processedSize || 0, 
            description || null, 
            photo_type || 'Otros'
        ];
        
        console.log(`💾 Insertando foto en base de datos...`);
        const insertResult = await db.runAsync(sql, params);
        const photoId = insertResult.lastID;
        
        console.log(`✅ Foto agregada al ticket ${ticketId}, ID: ${photoId}`);
        
        // Obtener la foto recién creada (sin el photo_data para evitar respuesta grande)
        console.log(`🔍 Obteniendo foto recién creada (ID: ${photoId})...`);
        const newPhoto = await db.getAsync(
            'SELECT id, ticket_id, file_name, mime_type, file_size, description, photo_type, created_at FROM TicketPhotos WHERE id = ?', 
            [photoId]
        );
        
        if (!newPhoto) {
            console.error(`❌ No se encontró la foto recién creada (ID: ${photoId})`);
            return res.status(500).json({ 
                error: 'Error al obtener foto creada',
                code: 'PHOTO_RETRIEVE_ERROR'
            });
        }
        
        console.log(`✅ Foto obtenida exitosamente:`, newPhoto);
        res.status(201).json({
            message: "Foto agregada exitosamente",
            data: newPhoto
        });
        
    } catch (err) {
        console.error('❌ Error completo al procesar foto:', {
            error: err.message,
            stack: err.stack,
            ticketId,
            file_name
        });
        res.status(500).json({ 
            error: 'Error al procesar la foto: ' + err.message,
            code: 'PHOTO_PROCESSING_ERROR'
        });
    }
});

// DELETE a ticket photo (ruta alternativa con ticketId para compatibilidad frontend)
app.delete('/api/tickets/:ticketId/photos/:photoId', authenticateToken, (req, res) => {
    const { photoId, ticketId } = req.params;
    
    console.log(`🗑️ Eliminando foto ${photoId} del ticket ${ticketId}`);
    
    const sql = 'DELETE FROM TicketPhotos WHERE id = ? AND ticket_id = ?';
    db.run(sql, [photoId, ticketId], function(err) {
        if (err) {
            console.error('❌ Error eliminando foto de ticket:', err.message);
            return res.status(500).json({ 
                error: 'Error al eliminar foto del ticket',
                code: 'PHOTO_DELETE_ERROR'
            });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ 
                error: "Foto no encontrada",
                code: 'PHOTO_NOT_FOUND'
            });
        }
        
        console.log(`✅ Foto ${photoId} eliminada del ticket ${ticketId}`);
        res.json({ 
            message: "Foto eliminada exitosamente", 
            changes: this.changes 
        });
    });
});

// DELETE a ticket photo (ruta legacy sin ticketId)
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
        SELECT * FROM EquipmentPhotos 
        WHERE equipment_id = ? 
        ORDER BY created_at DESC
    `;
    
    db.all(sql, [equipmentId], (err, rows) => {
        if (err) {
            console.error('❌ Error fetching equipment photos:', err.message);
            res.status(500).json({ 
                message: 'error',
                error: 'Error al obtener fotos del equipo',
                code: 'PHOTOS_FETCH_ERROR',
                details: err.message
            });
            return;
        }
        
        const photos = rows || [];
        console.log(`📸 Fotos encontradas para equipo ${equipmentId}:`, photos.length);
        res.json({
            message: 'success',
            data: photos,
            count: photos.length
        });
    });
});

// POST upload photo for equipment
app.post('/api/equipment/:equipmentId/photos', authenticateToken, (req, res) => {
    const { equipmentId } = req.params;
    const { photo_data, mime_type, filename } = req.body;
    
    if (!photo_data || !mime_type) {
        return res.status(400).json({ 
            error: 'Se requiere photo_data y mime_type',
            code: 'MISSING_PHOTO_DATA'
        });
    }
    
    // Schema: id, equipment_id, photo_data, file_name, mime_type, file_size, created_at
    const sql = `INSERT INTO EquipmentPhotos 
                 (equipment_id, photo_data, file_name, mime_type, file_size, created_at) 
                 VALUES (?, ?, ?, ?, ?, NOW())`;
    
    const file_size = filename ? Math.round(photo_data.length * 0.75) : 0; // Aproximación del tamaño real
    const params = [
        parseInt(equipmentId, 10), 
        photo_data, 
        filename || 'foto.jpg', 
        mime_type, 
        file_size
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
    
    const sql = 'DELETE FROM EquipmentPhotos WHERE id = ?';
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
        
        const notes = rows || [];
        console.log(`📝 Notas encontradas para equipo ${equipmentId}:`, notes.length);
        res.json({
            message: 'success',
            data: notes,
            count: notes.length
        });
    });
});

// POST add note to equipment
app.post('/api/equipment/:equipmentId/notes', authenticateToken, (req, res) => {
    const { equipmentId } = req.params;
    const { note } = req.body;
    
    if (!note || note.trim() === '') {
        return res.status(400).json({ 
            error: 'La nota no puede estar vacía',
            code: 'EMPTY_NOTE'
        });
    }
    
    // Schema: id, equipment_id, note, author, created_at
    const sql = `INSERT INTO EquipmentNotes 
                 (equipment_id, note, author, created_at) 
                 VALUES (?, ?, ?, NOW())`;
    
    const params = [
        parseInt(equipmentId, 10), 
        note.trim(), 
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

// ===================================================================
// CRUD DE EQUIPOS
// ===================================================================

// POST crear nuevo equipo
app.post('/api/equipment', authenticateToken, (req, res) => {
    const { 
        location_id, 
        model_id, 
        custom_id, 
        serial_number, 
        acquisition_date,
        notes 
    } = req.body;
    
    // Validaciones básicas
    if (!location_id) {
        return res.status(400).json({ 
            error: 'location_id es requerido',
            code: 'MISSING_LOCATION'
        });
    }
    
    if (!model_id) {
        return res.status(400).json({ 
            error: 'model_id es requerido',
            code: 'MISSING_MODEL'
        });
    }
    
    // Generar custom_id si no se proporciona
    let finalCustomId = custom_id;
    
    const insertEquipment = (customIdValue) => {
        const sql = `INSERT INTO Equipment 
                     (location_id, model_id, custom_id, serial_number, acquisition_date, notes, name, type, brand, model, created_at, updated_at) 
                     VALUES (?, ?, ?, ?, ?, ?, '', '', '', '', NOW(), NOW())`;
        
        const params = [
            parseInt(location_id, 10),
            parseInt(model_id, 10),
            customIdValue || null,  // Convertir cadena vacía a null
            serial_number || null,
            acquisition_date || null,
            notes || null
        ];
        
        db.run(sql, params, function(err) {
            if (err) {
                console.error('❌ Error creando equipo:', err.message);
                
                // Manejo de errores específicos
                if (err.message.includes('UNIQUE') || err.code === 'ER_DUP_ENTRY') {
                    // Determinar qué campo causó el duplicado
                    let fieldName = 'custom_id o serial_number';
                    if (err.message.includes('serial_number')) {
                        fieldName = 'número de serie (serial_number)';
                    } else if (err.message.includes('custom_id')) {
                        fieldName = 'ID personalizado (custom_id)';
                    }
                    return res.status(409).json({ 
                        error: `Ya existe un equipo con ese ${fieldName}`,
                        code: 'DUPLICATE_EQUIPMENT',
                        field: fieldName
                    });
                }
                
                return res.status(500).json({ 
                    error: 'Error al crear equipo: ' + err.message,
                    code: 'EQUIPMENT_CREATE_ERROR'
                });
            }
            
            const equipmentId = this.lastID;
            console.log(`✅ Equipo creado exitosamente, ID: ${equipmentId}`);
            
            // Obtener el equipo recién creado con información del modelo
            const selectSql = `
                SELECT 
                    e.id,
                    e.custom_id,
                    e.serial_number,
                    e.location_id,
                    e.model_id,
                    e.acquisition_date,
                    e.notes,
                    COALESCE(NULLIF(e.name, ''), em.name) as name,
                    COALESCE(NULLIF(e.type, ''), em.category) as type,
                    COALESCE(NULLIF(e.brand, ''), em.brand) as brand,
                    COALESCE(NULLIF(e.model, ''), em.model_code, em.name) as model,
                    em.name as model_name
                FROM Equipment e
                LEFT JOIN EquipmentModels em ON e.model_id = em.id
                WHERE e.id = ?
            `;
            
            db.get(selectSql, [equipmentId], (err, row) => {
                if (err) {
                    console.error('❌ Error obteniendo equipo creado:', err.message);
                    return res.status(500).json({ 
                        error: 'Equipo creado pero error al recuperar datos',
                        code: 'EQUIPMENT_RETRIEVE_ERROR',
                        data: { id: equipmentId }
                    });
                }
                
                res.status(201).json({
                    message: 'Equipo creado exitosamente',
                    data: row
                });
            });
        });
    };
    
    // Si no hay custom_id, generar uno automáticamente
    if (!finalCustomId) {
        // Buscar el último custom_id GLOBAL (no por ubicación) para evitar duplicados
        // ya que custom_id tiene restricción UNIQUE global
        const findMaxSql = `
            SELECT custom_id 
            FROM Equipment 
            WHERE custom_id LIKE 'CARD-%'
            ORDER BY CAST(SUBSTRING(custom_id, 6) AS UNSIGNED) DESC 
            LIMIT 1
        `;
        
        db.get(findMaxSql, [], (err, row) => {
            if (err) {
                console.error('❌ Error buscando último custom_id:', err.message);
                return res.status(500).json({ 
                    error: 'Error al generar custom_id',
                    code: 'CUSTOM_ID_ERROR'
                });
            }
            
            let nextNumber = 1;
            if (row && row.custom_id) {
                const match = row.custom_id.match(/CARD-(\d+)/);
                if (match) {
                    nextNumber = parseInt(match[1], 10) + 1;
                }
            }
            
            finalCustomId = `CARD-${nextNumber}`;
            console.log(`🔢 Custom ID generado automáticamente (global): ${finalCustomId}`);
            insertEquipment(finalCustomId);
        });
    } else {
        insertEquipment(finalCustomId);
    }
});

// PUT actualizar equipo existente
app.put('/api/equipment/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { 
        location_id, 
        model_id, 
        custom_id, 
        serial_number, 
        acquisition_date,
        notes 
    } = req.body;
    
    // Validaciones básicas
    if (!location_id || !model_id) {
        return res.status(400).json({ 
            error: 'location_id y model_id son requeridos',
            code: 'MISSING_REQUIRED_FIELDS'
        });
    }
    
    const sql = `UPDATE Equipment 
                 SET location_id = ?, 
                     model_id = ?, 
                     custom_id = ?, 
                     serial_number = ?, 
                     acquisition_date = ?, 
                     notes = ?,
                     updated_at = NOW()
                 WHERE id = ?`;
    
    const params = [
        parseInt(location_id, 10),
        parseInt(model_id, 10),
        custom_id || null,
        serial_number || null,
        acquisition_date || null,
        notes || null,
        parseInt(id, 10)
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error actualizando equipo:', err.message);
            
            if (err.message.includes('UNIQUE') || err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ 
                    error: 'Ya existe un equipo con ese custom_id o serial_number',
                    code: 'DUPLICATE_EQUIPMENT'
                });
            }
            
            return res.status(500).json({ 
                error: 'Error al actualizar equipo: ' + err.message,
                code: 'EQUIPMENT_UPDATE_ERROR'
            });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ 
                error: 'Equipo no encontrado',
                code: 'EQUIPMENT_NOT_FOUND'
            });
        }
        
        console.log(`✅ Equipo ${id} actualizado exitosamente`);
        
        // Obtener el equipo actualizado con información del modelo
        const selectSql = `
            SELECT 
                e.id,
                e.custom_id,
                e.serial_number,
                e.location_id,
                e.model_id,
                e.acquisition_date,
                e.notes,
                COALESCE(NULLIF(e.name, ''), em.name) as name,
                COALESCE(NULLIF(e.type, ''), em.category) as type,
                COALESCE(NULLIF(e.brand, ''), em.brand) as brand,
                COALESCE(NULLIF(e.model, ''), em.model_code, em.name) as model,
                em.name as model_name
            FROM Equipment e
            LEFT JOIN EquipmentModels em ON e.model_id = em.id
            WHERE e.id = ?
        `;
        
        db.get(selectSql, [id], (err, row) => {
            if (err) {
                console.error('❌ Error obteniendo equipo actualizado:', err.message);
                return res.status(500).json({ 
                    error: 'Equipo actualizado pero error al recuperar datos',
                    code: 'EQUIPMENT_RETRIEVE_ERROR',
                    data: { id: id }
                });
            }
            
            res.json({
                message: 'Equipo actualizado exitosamente',
                data: row
            });
        });
    });
});

// DELETE eliminar equipo
app.delete('/api/equipment/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    
    console.log(`🗑️ Eliminando equipo ID: ${id}`);
    
    // Primero eliminar datos relacionados (fotos, notas)
    const deletePhotosSql = 'DELETE FROM EquipmentPhotos WHERE equipment_id = ?';
    const deleteNotesSql = 'DELETE FROM EquipmentNotes WHERE equipment_id = ?';
    const deleteEquipmentSql = 'DELETE FROM Equipment WHERE id = ?';
    
    // Eliminar fotos
    db.run(deletePhotosSql, [id], function(err) {
        if (err) {
            console.error('⚠️ Error eliminando fotos del equipo:', err.message);
            // Continuar de todos modos
        }
        
        // Eliminar notas
        db.run(deleteNotesSql, [id], function(err) {
            if (err) {
                console.error('⚠️ Error eliminando notas del equipo:', err.message);
                // Continuar de todos modos
            }
            
            // Eliminar el equipo
            db.run(deleteEquipmentSql, [id], function(err) {
                if (err) {
                    console.error('❌ Error eliminando equipo:', err.message);
                    return res.status(500).json({ 
                        error: 'Error al eliminar equipo: ' + err.message,
                        code: 'EQUIPMENT_DELETE_ERROR'
                    });
                }
                
                if (this.changes === 0) {
                    return res.status(404).json({ 
                        error: 'Equipo no encontrado',
                        code: 'EQUIPMENT_NOT_FOUND'
                    });
                }
                
                console.log(`✅ Equipo ${id} eliminado exitosamente`);
                res.json({
                    message: 'Equipo eliminado exitosamente',
                    changes: this.changes
                });
            });
        });
    });
});
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
                message: 'error',
                error: 'Error al obtener tickets del equipo',
                code: 'TICKETS_FETCH_ERROR',
                details: err.message
            });
            return;
        }
        
        const tickets = rows || [];
        console.log(`🎫 Tickets encontrados para equipo ${equipmentId}:`, tickets.length);
        res.json({
            message: 'success',
            data: tickets,
            count: tickets.length
        });
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
    
    // Validaciones básicas
    if (!spare_part_id || !quantity_used || quantity_used <= 0) {
        return res.status(400).json({
            error: 'spare_part_id y quantity_used son requeridos y quantity_used debe ser > 0',
            code: 'VALIDATION_ERROR'
        });
    }
    
    // Nota: unit_cost ya no es requerido - se obtiene del catálogo si no se proporciona
    
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
        
        // Verificar que el repuesto existe y tiene stock - incluir precio
        db.get('SELECT id, name, sku, current_stock, unit_price FROM spareparts WHERE id = ?', [spare_part_id], (err, sparePart) => {
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
            
            // 🆕 NUEVA LÓGICA: Si no hay stock suficiente, usar lo disponible y solicitar lo faltante
            const availableStock = parseFloat(sparePart.current_stock);
            const requestedQty = parseFloat(quantity_used);
            const shortageQty = requestedQty - availableStock;
            const actualUsedQty = Math.min(availableStock, requestedQty);
            
            console.log(`📊 Stock analysis:`, {
                available: availableStock,
                requested: requestedQty,
                shortage: shortageQty > 0 ? shortageQty : 0,
                willUse: actualUsedQty
            });
            
            // Si no hay NADA de stock, solo crear solicitud
            if (availableStock <= 0) {
                console.log('⚠️ Sin stock disponible, creando solo solicitud de compra...');
                
                // Crear solicitud de compra por la cantidad total
                const requestSql = `
                    INSERT INTO spare_part_requests (
                        ticket_id,
                        spare_part_name,
                        quantity_needed,
                        priority,
                        justification,
                        requested_by,
                        status
                    ) VALUES (?, ?, ?, 'alta', ?, ?, 'pendiente')
                `;
                
                const justification = notes ? 
                    `Repuesto solicitado para ticket #${ticketId}. ${notes}` : 
                    `Repuesto solicitado para ticket #${ticketId}`;
                
                db.run(requestSql, [
                    ticketId,
                    sparePart.name,
                    requestedQty,
                    justification,
                    req.user.username || req.user.id
                ], function(err) {
                    if (err) {
                        console.error('❌ Error creando solicitud:', err.message);
                        return res.status(500).json({ 
                            error: 'Error al crear solicitud de compra',
                            code: 'REQUEST_CREATE_ERROR'
                        });
                    }
                    
                    console.log(`✅ Solicitud de compra creada - ID: ${this.lastID}, Cantidad: ${requestedQty}`);
                    
                    res.status(201).json({
                        message: 'Sin stock disponible. Se ha creado una solicitud de compra',
                        data: {
                            action: 'request_created',
                            request_id: this.lastID,
                            requested_quantity: requestedQty
                        }
                    });
                });
                
                return; // Terminar aquí
            }
            
            // Insertar en ticketspareparts (solo la cantidad que SÍ hay en stock)
            const insertSql = `
                INSERT INTO ticketspareparts 
                (ticket_id, spare_part_id, quantity_used, unit_cost, notes, used_at) 
                VALUES (?, ?, ?, ?, ?, NOW())
            `;
            
            const usageNotes = shortageQty > 0 ? 
                `${notes || 'Uso de repuesto'} - Stock disponible: ${actualUsedQty}. Faltante: ${shortageQty} (solicitado)` :
                notes || 'Uso de repuesto';
            
            // Usar unit_cost del frontend o precio del catálogo si está disponible
            const catalogPrice = parseFloat(sparePart.unit_price) || 0;
            const finalUnitCost = unit_cost && unit_cost > 0 ? unit_cost : catalogPrice;
            console.log(`💰 Precio unitario: ${finalUnitCost} (fuente: ${unit_cost && unit_cost > 0 ? 'frontend' : catalogPrice > 0 ? 'catálogo' : 'sin precio'})`);
            
            db.run(insertSql, [ticketId, spare_part_id, actualUsedQty, finalUnitCost, usageNotes], function(err) {
                if (err) {
                    console.error('❌ Error insertando repuesto en ticket:', err.message);
                    return res.status(500).json({ 
                        error: 'Error al agregar repuesto al ticket',
                        code: 'INSERT_ERROR'
                    });
                }
                
                const sparePartUsageId = this.lastID;
                
                // Actualizar stock del repuesto (restar solo lo que SE USARÁ)
                const updateStockSql = 'UPDATE spareparts SET current_stock = current_stock - ? WHERE id = ?';
                db.run(updateStockSql, [actualUsedQty, spare_part_id], (err) => {
                    if (err) {
                        console.error('❌ Error actualizando stock:', err.message);
                        // Revertir la inserción
                        db.run('DELETE FROM ticketspareparts WHERE id = ?', [sparePartUsageId]);
                        return res.status(500).json({ 
                            error: 'Error actualizando stock del repuesto',
                            code: 'STOCK_UPDATE_ERROR'
                        });
                    }
                    
                    console.log(`✅ Stock actualizado: ${sparePart.name} - usado: ${actualUsedQty}, nuevo stock: ${availableStock - actualUsedQty}`);
                    
                    // 🆕 REGISTRAR MOVIMIENTO EN INVENTARIO (InventoryTransactions)
                    const newStock = availableStock - actualUsedQty;
                    const transactionSql = `
                        INSERT INTO InventoryTransactions (
                            spare_part_id,
                            transaction_type,
                            quantity,
                            quantity_before,
                            quantity_after,
                            reference_type,
                            reference_id,
                            performed_by,
                            notes,
                            transaction_date
                        ) VALUES (?, 'Salida', ?, ?, ?, 'Ticket', ?, ?, ?, NOW())
                    `;
                    
                    const transactionNotes = notes ? 
                        `Uso en ticket #${ticketId}: ${notes}` : 
                        `Uso en ticket #${ticketId}`;
                    
                    db.run(transactionSql, [
                        spare_part_id,
                        actualUsedQty,
                        availableStock,
                        newStock,
                        ticketId,
                        req.user.id,
                        transactionNotes
                    ], function(transErr) {
                        if (transErr) {
                            console.error('⚠️ Error registrando movimiento de inventario:', transErr.message);
                            // No revertimos, solo loggeamos - el stock ya fue actualizado
                        } else {
                            console.log(`📊 Movimiento de inventario registrado - ID: ${this.lastID}, Tipo: Salida, Cantidad: ${actualUsedQty}`);
                        }
                    });
                    
                    // 🆕 Si hay faltante, crear solicitud de compra automáticamente
                    if (shortageQty > 0) {
                        console.log(`📋 Creando solicitud de compra por ${shortageQty} unidades faltantes...`);
                        
                        const requestSql = `
                            INSERT INTO spare_part_requests (
                                ticket_id,
                                spare_part_name,
                                quantity_needed,
                                priority,
                                justification,
                                requested_by,
                                status
                            ) VALUES (?, ?, ?, 'alta', ?, ?, 'pendiente')
                        `;
                        
                        const justification = notes ? 
                            `Stock insuficiente para ticket #${ticketId}. Usado: ${actualUsedQty}, Faltante: ${shortageQty}. ${notes}` : 
                            `Stock insuficiente para ticket #${ticketId}. Usado: ${actualUsedQty}, Faltante: ${shortageQty}`;
                        
                        db.run(requestSql, [
                            ticketId,
                            sparePart.name,
                            shortageQty,
                            justification,
                            req.user.username || req.user.id
                        ], function(requestErr) {
                            if (requestErr) {
                                console.error('⚠️ Error creando solicitud automática:', requestErr.message);
                                // No revertimos el uso, solo loggeamos
                            } else {
                                console.log(`✅ Solicitud de compra automática creada - ID: ${this.lastID}, Cantidad: ${shortageQty}`);
                            }
                            
                            // Continuar con expense y respuesta
                            handleExpenseAndResponse();
                        });
                    } else {
                        // No hay faltante, continuar directo
                        handleExpenseAndResponse();
                    }
                    
                    function handleExpenseAndResponse() {
                        // 🆕 CREAR SOLICITUD APROBADA AUTOMÁTICAMENTE (registro de uso)
                        console.log(`📋 Creando registro de solicitud aprobada para ${actualUsedQty} unidades usadas...`);
                        
                        const approvedRequestSql = `
                            INSERT INTO spare_part_requests (
                                ticket_id,
                                spare_part_name,
                                inventory_id,
                                quantity_needed,
                                priority,
                                description,
                                justification,
                                requested_by,
                                status,
                                approved_at,
                                approved_by,
                                created_at
                            ) VALUES (?, ?, ?, ?, 'media', ?, ?, ?, 'aprobada', NOW(), ?, NOW())
                        `;
                        
                        const justificationText = notes ? 
                            `Repuesto usado en ticket #${ticketId}. ${notes}` : 
                            `Repuesto usado en ticket #${ticketId}`;
                        
                        const descriptionText = `Stock disponible: ${actualUsedQty} unidades`;
                        
                        db.run(approvedRequestSql, [
                            ticketId,
                            sparePart.name,
                            spare_part_id,
                            actualUsedQty,
                            descriptionText,
                            justificationText,
                            req.user.username || req.user.id,
                            req.user.id
                        ], function(requestErr) {
                            if (requestErr) {
                                console.error('⚠️ Error creando solicitud aprobada:', requestErr.message);
                                // No revertimos el uso, solo loggeamos
                            } else {
                                console.log(`✅ Solicitud aprobada registrada - ID: ${this.lastID}, Cantidad: ${actualUsedQty}`);
                            }
                            
                            // Continuar con expense
                            createExpenseIfNeeded();
                        });
                        
                        function createExpenseIfNeeded() {
                            // CREAR EXPENSE AUTOMÁTICAMENTE si bill_to_client = true y hay costo
                            if (bill_to_client && finalUnitCost > 0) {
                                const totalCost = actualUsedQty * finalUnitCost;
                                const expenseDescription = `Repuesto: ${sparePart.name} (${actualUsedQty} ${actualUsedQty > 1 ? 'unidades' : 'unidad'}) - ${ticket.title}`;
                                
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
                        }
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
                            
                            // Respuesta mejorada con información de stock parcial
                            const responseData = {
                                message: shortageQty > 0 ? 
                                    `Stock parcial usado. Se creó solicitud de compra por ${shortageQty} unidades faltantes.` :
                                    "Uso de repuesto registrado exitosamente",
                                data: newRecord,
                                expense_created: bill_to_client,
                                stock_info: {
                                    requested: requestedQty,
                                    used: actualUsedQty,
                                    shortage: shortageQty,
                                    request_created: shortageQty > 0
                                }
                            };
                            
                            res.status(201).json(responseData);
                        });
                    }
                });
            });
        });
    });
});

/**
 * @route GET /api/tickets/:ticketId/spare-parts/requests
 * @desc Obtener todas las solicitudes de repuestos de un ticket (usados + pendientes)
 * @access Protegido - Requiere autenticación
 */
app.get('/api/tickets/:ticketId/spare-parts/requests', authenticateToken, (req, res) => {
    const { ticketId } = req.params;
    
    console.log(`📋 Obteniendo repuestos y solicitudes del ticket ${ticketId}...`);
    
    // 1. Obtener repuestos ya USADOS (ticketspareparts)
    const usedPartsSql = `
        SELECT 
            tsp.*,
            sp.name as spare_part_name,
            sp.sku as spare_part_sku,
            'used' as status_type
        FROM ticketspareparts tsp
        LEFT JOIN spareparts sp ON tsp.spare_part_id = sp.id
        WHERE tsp.ticket_id = ?
        ORDER BY tsp.used_at DESC
    `;
    
    db.all(usedPartsSql, [ticketId], (err, usedParts) => {
        if (err) {
            console.error('❌ Error obteniendo repuestos usados:', err.message);
            return res.status(500).json({
                error: 'Error al obtener repuestos usados',
                code: 'USED_PARTS_ERROR'
            });
        }
        
        // 2. Obtener SOLICITUDES pendientes/aprobadas/rechazadas (spare_part_requests)
        const requestsSql = `
            SELECT 
                spr.*,
                'request' as status_type,
                u.username as requested_by_name,
                approver.username as approved_by_name
            FROM spare_part_requests spr
            LEFT JOIN Users u ON spr.requested_by = u.id
            LEFT JOIN Users approver ON spr.approved_by = approver.id
            WHERE spr.ticket_id = ?
            ORDER BY spr.created_at DESC
        `;
        
        db.all(requestsSql, [ticketId], (err, requests) => {
            if (err) {
                console.error('❌ Error obteniendo solicitudes:', err.message);
                return res.status(500).json({
                    error: 'Error al obtener solicitudes de repuestos',
                    code: 'REQUESTS_ERROR'
                });
            }
            
            console.log(`✅ Repuestos encontrados: ${usedParts.length} usados, ${requests.length} solicitudes`);
            
            res.json({
                message: 'success',
                data: {
                    used_parts: usedParts || [],
                    requests: requests || []
                },
                summary: {
                    used_count: usedParts.length,
                    pending_count: requests.filter(r => r.status === 'pendiente').length,
                    approved_count: requests.filter(r => r.status === 'aprobada').length,
                    rejected_count: requests.filter(r => r.status === 'rechazada').length
                }
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
        
        // Query con JOIN a EquipmentModels para obtener type/brand/model
        // Usa COALESCE para tomar del modelo si el equipo no tiene el campo
        let sql = `
            SELECT 
                e.id,
                e.name,
                e.serial_number,
                e.custom_id,
                e.location_id,
                e.model_id,
                COALESCE(NULLIF(e.type, ''), m.category) as type,
                COALESCE(NULLIF(e.brand, ''), m.brand) as brand,
                COALESCE(NULLIF(e.model, ''), m.name) as model,
                m.category as model_type,
                m.name as model_name,
                m.brand as manufacturer,
                l.name as location_name,
                c.name as client_name
            FROM Equipment e
            LEFT JOIN EquipmentModels m ON e.model_id = m.id
            LEFT JOIN Locations l ON e.location_id = l.id
            LEFT JOIN Clients c ON l.client_id = c.id
            WHERE e.location_id = ?
            ORDER BY e.id DESC
        `;
        
        db.all(sql, [locationId], (err, rows) => {
            if (err) {
                console.error('❌ Error fetching location equipment:', err);
                return res.status(500).json({ 
                    message: 'error',
                    error: 'Error al obtener equipos',
                    details: err.message
                });
            }
            
            const equipment = rows || [];
            console.log(`🏢 Equipos encontrados para location ${locationId}:`, equipment.length);
            
            res.json({
                message: 'success',
                data: equipment,
                metadata: {
                    locationId: parseInt(locationId, 10),
                    contractId: contractId ? parseInt(contractId, 10) : null,
                    totalEquipment: equipment.length,
                    timestamp: new Date().toISOString()
                }
            });
        });
        
    } catch (error) {
        console.error('❌ Location equipment endpoint error:', error);
        res.status(500).json({ 
            message: 'error',
            error: 'Error interno del servidor',
            details: error.message
        });
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
    const limit = parseInt(req.query.limit, 10) || 10;
    console.log(`📋 Solicitando actividad reciente (límite: ${limit})...`);
    
    // Query simplificada que solo obtiene tickets recientes
    const sql = `
        SELECT 
            'ticket' as type,
            t.id as reference_id,
            t.title as description,
            t.status,
            t.priority,
            t.updated_at as timestamp,
            c.name as client_name,
            l.name as location_name,
            u.username as created_by_name
        FROM Tickets t
        LEFT JOIN Locations l ON t.location_id = l.id
        LEFT JOIN Clients c ON t.client_id = c.id
        LEFT JOIN Users u ON t.assigned_technician_id = u.id
        ORDER BY t.updated_at DESC
        LIMIT ?
    `;
    
    db.all(sql, [limit], (err, rows) => {
        if (err) {
            console.error('❌ Error obteniendo actividad:', err);
            res.status(500).json({ 
                message: 'error',
                error: 'Error obteniendo actividad',
                details: err.message 
            });
            return;
        }
        
        const activity = rows || [];
        console.log(`✅ Actividad obtenida: ${activity.length} registros`);
        res.json({
            message: 'success',
            data: activity,
            count: activity.length,
            timestamp: new Date().toISOString()
        });
    });
});

// ===================================================================

// ===================================================================
// DASHBOARD CONSOLIDADO - NUEVOS ENDPOINTS
// ===================================================================

// Endpoint 1: Resumen de Recursos Humanos
app.get('/api/dashboard/resources-summary', authenticateToken, (req, res) => {
    console.log('?? Solicitando resumen de recursos humanos...');
    
    const queries = [
        // Total de personal activo
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(*) as total FROM Users WHERE role IN ('Technician', 'Manager', 'Admin')`, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'active_staff', value: rows[0].total });
            });
        }),
        
        // T�cnicos activos
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(*) as total FROM Users WHERE role = 'Technician'`, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'active_technicians', value: rows[0].total });
            });
        }),
        
        // Asistencias hoy
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(DISTINCT user_id) as total 
                FROM Attendance 
                WHERE date = CURDATE()
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'attendance_today', value: rows[0].total });
            });
        }),
        
        // Horas extras este mes
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COALESCE(SUM(hours), 0) as total 
                FROM Overtime 
                WHERE DATE(date) >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
                AND status = 'Approved'
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'overtime_hours_month', value: Math.round(rows[0].total * 10) / 10 });
            });
        }),
        
        // Carga de trabajo por t�cnico
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    u.id,
                    u.username,
                    u.email,
                    COUNT(t.id) as ticket_count,
                    SUM(CASE WHEN t.priority = 'Cr�tica' THEN 1 ELSE 0 END) as critical_count
                FROM Users u
                LEFT JOIN Tickets t ON t.assigned_technician_id = u.id AND t.status NOT IN ('Cerrado', 'Completado')
                WHERE u.role = 'Technician'
                GROUP BY u.id, u.username, u.email
                ORDER BY ticket_count DESC
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'technician_workload', value: rows });
            });
        }),
        
        // Utilizaci�n de recursos (% de t�cnicos con tickets)
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    COUNT(DISTINCT CASE WHEN t.id IS NOT NULL THEN u.id END) * 100.0 / 
                    NULLIF(COUNT(DISTINCT u.id), 0) as utilization_percentage
                FROM Users u
                LEFT JOIN Tickets t ON t.assigned_technician_id = u.id AND t.status NOT IN ('Cerrado', 'Completado')
                WHERE u.role = 'Technician'
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ 
                    metric: 'resource_utilization', 
                    value: Math.round((rows[0].utilization_percentage || 0) * 10) / 10 
                });
            });
        })
    ];
    
    Promise.all(queries)
        .then(results => {
            const summary = {};
            results.forEach(result => {
                summary[result.metric] = result.value;
            });
            
            console.log('? Resumen de recursos calculado:', summary);
            res.json({
                message: 'success',
                data: summary,
                timestamp: new Date().toISOString()
            });
        })
        .catch(error => {
            console.error('? Error calculando resumen de recursos (dashboard) - se devolverán valores por defecto:', error && error.message || error);
            // Devolver datos por defecto para evitar 500 en frontend cuando faltan tablas/columnas
            const defaultSummary = {
                active_staff: 0,
                active_technicians: 0,
                attendance_today: 0,
                overtime_hours_month: 0,
                technician_workload: [],
                resource_utilization: 0
            };
            res.json({
                message: 'success',
                data: defaultSummary,
                note: 'Datos parciales - algunas tablas/columnas no disponibles en la base de datos',
                timestamp: new Date().toISOString()
            });
        });
});

// Endpoint 2: Resumen Financiero
app.get('/api/dashboard/financial-summary', authenticateToken, (req, res) => {
    console.log('?? Solicitando resumen financiero...');
    
    const queries = [
        // Total gastos este mes
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COALESCE(SUM(amount), 0) as total 
                FROM Expenses 
                WHERE date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'expenses_this_month', value: Math.round(rows[0].total) });
            });
        }),
        
        // Gastos pendientes de aprobaci�n
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as total_amount
                FROM Expenses 
                WHERE status = 'Pendiente'
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ 
                    metric: 'pending_expenses', 
                    value: { count: rows[0].total, amount: Math.round(rows[0].total_amount) }
                });
            });
        }),
        
        // Facturas pendientes de pago
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total, COALESCE(SUM(total), 0) as total_amount
                FROM Invoices 
                WHERE status IN ('Enviada', 'Vencida')
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ 
                    metric: 'pending_invoices', 
                    value: { count: rows[0].total, amount: Math.round(rows[0].total_amount) }
                });
            });
        }),
        
        // Cotizaciones en proceso
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total, COALESCE(SUM(total), 0) as total_amount
                FROM Quotes 
                WHERE status IN ('Borrador', 'Enviada')
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ 
                    metric: 'active_quotes', 
                    value: { count: rows[0].total, amount: Math.round(rows[0].total_amount) }
                });
            });
        }),
        
        // Gastos por categor�a (top 5)
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    ec.name as category_name,
                    COUNT(e.id) as expense_count,
                    COALESCE(SUM(e.amount), 0) as total_amount
                FROM ExpenseCategories ec
                LEFT JOIN Expenses e ON e.category_id = ec.id 
                    AND e.date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
                GROUP BY ec.id, ec.name
                ORDER BY total_amount DESC
                LIMIT 5
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'expenses_by_category', value: rows });
            });
        })
    ];
    
    Promise.all(queries)
        .then(results => {
            const summary = {};
            results.forEach(result => {
                summary[result.metric] = result.value;
            });
            
            console.log('? Resumen financiero calculado');
            res.json({
                message: 'success',
                data: summary,
                timestamp: new Date().toISOString()
            });
        })
        .catch(error => {
            console.error('? Error calculando resumen financiero (dashboard) - devolviendo valores por defecto:', error && error.message || error);
            const defaultSummary = {
                expenses_this_month: 0,
                pending_expenses: { count: 0, amount: 0 },
                pending_invoices: { count: 0, amount: 0 },
                active_quotes: { count: 0, amount: 0 },
                expenses_by_category: []
            };
            res.json({
                message: 'success',
                data: defaultSummary,
                note: 'Datos simulados - tablas financieras no disponibles o con columnas faltantes',
                timestamp: new Date().toISOString()
            });
        });
});

// Endpoint 3: Resumen de Inventario
app.get('/api/dashboard/inventory-summary', authenticateToken, (req, res) => {
    console.log('?? Solicitando resumen de inventario...');
    
    const queries = [
        // Items con stock bajo
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total 
                FROM SpareParts 
                WHERE current_stock <= minimum_stock
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'low_stock_items', value: rows[0].total });
            });
        }),
        
        // Items con stock cr�tico (0 unidades)
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total 
                FROM SpareParts 
                WHERE current_stock = 0
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'critical_stock_items', value: rows[0].total });
            });
        }),
        
        // Movimientos hoy
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total 
                FROM SparePartsMovements 
                WHERE DATE(movement_date) = CURDATE()
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'movements_today', value: rows[0].total });
            });
        }),
        
        // �rdenes de compra pendientes
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total, COALESCE(SUM(total), 0) as total_amount
                FROM SpareParts WHERE 1=0 
                WHERE status IN ('Pending', 'Approved')
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ 
                    metric: 'pending_purchase_orders', 
                    value: { count: rows[0].total, amount: Math.round(rows[0].total_amount) }
                });
            });
        }),
        
        // Top 5 repuestos m�s usados este mes
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    i.sku,
                    i.name,
                    SUM(CASE WHEN im.type = 'Salida' THEN im.quantity ELSE 0 END) as usage_count,
                    i.current_stock
                FROM SpareParts i
                LEFT JOIN SparePartsMovements im ON im.spare_part_id = i.id 
                    AND DATE(im.created_at) >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
                GROUP BY i.id, i.sku, i.name, i.current_stock
                ORDER BY usage_count DESC
                LIMIT 5
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'top_used_parts', value: rows });
            });
        }),
        
        // Detalles de items cr�ticos
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    sku,
                    name,
                    current_stock,
                    minimum_stock,
                    0 as unit_cost
                FROM SpareParts 
                WHERE current_stock <= minimum_stock
                ORDER BY current_stock ASC
                LIMIT 10
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'critical_items_detail', value: rows });
            });
        })
    ];
    
    Promise.all(queries)
        .then(results => {
            const summary = {};
            results.forEach(result => {
                summary[result.metric] = result.value;
            });
            
            console.log('? Resumen de inventario calculado');
            res.json({
                message: 'success',
                data: summary,
                timestamp: new Date().toISOString()
            });
        })
        .catch(error => {
            console.error('? Error calculando resumen de inventario (dashboard) - devolviendo valores por defecto:', error && error.message || error);
            const defaultSummary = {
                low_stock_items: 0,
                critical_stock_items: 0,
                movements_today: 0,
                pending_purchase_orders: { count: 0, amount: 0 },
                top_used_parts: [],
                critical_items_detail: []
            };
            res.json({
                message: 'success',
                data: defaultSummary,
                note: 'Datos parciales - tabla de inventario/modificaciones no disponibles',
                timestamp: new Date().toISOString()
            });
        });
});

// Endpoint 4: Resumen de Contratos & SLA
app.get('/api/dashboard/contracts-sla-summary', authenticateToken, (req, res) => {
    console.log('?? Solicitando resumen de contratos y SLA...');
    
    const queries = [
        // Contratos activos
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total 
                FROM Contracts 
                WHERE status = 'Active' AND end_date >= CURDATE()
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'active_contracts', value: rows[0].total });
            });
        }),
        
        // Contratos pr�ximos a vencer (30 d�as)
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total
                FROM Contracts 
                WHERE status = 'Active' 
                AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'contracts_expiring_soon', value: rows[0].total });
            });
        }),
        
        // Contratos vencidos
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total 
                FROM Contracts 
                WHERE end_date < CURDATE()
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'expired_contracts', value: rows[0].total });
            });
        }),
        
        // Tickets fuera de SLA
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total 
                FROM Tickets 
                WHERE sla_status = 'Violated' 
                AND status NOT IN ('Cerrado', 'Completado')
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'tickets_outside_sla', value: rows[0].total });
            });
        }),
        
        // Tickets en riesgo de SLA
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total 
                FROM Tickets 
                WHERE sla_status = 'At Risk' 
                AND status NOT IN ('Cerrado', 'Completado')
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'tickets_at_risk_sla', value: rows[0].total });
            });
        }),
        
        // Cumplimiento SLA promedio (�ltimos 30 d�as)
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    COUNT(*) as total_tickets,
                    SUM(CASE WHEN sla_status = 'Met' THEN 1 ELSE 0 END) as met_sla,
                    (SUM(CASE WHEN sla_status = 'Met' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0)) as compliance_percentage
                FROM Tickets 
                WHERE status IN ('Cerrado', 'Completado')
                AND updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ 
                    metric: 'sla_compliance', 
                    value: {
                        percentage: Math.round((rows[0].compliance_percentage || 0) * 10) / 10,
                        total_tickets: rows[0].total_tickets,
                        met_sla: rows[0].met_sla
                    }
                });
            });
        }),
        
        // Detalles de contratos pr�ximos a vencer
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    c.id,
                    c.id as contract_number,
                    c.start_date,
                    c.end_date,
                    DATEDIFF(c.end_date, CURDATE()) as days_remaining,
                    cl.name as client_name
                FROM Contracts c
                LEFT JOIN Clients cl ON c.client_id = cl.id
                WHERE c.status = 'Active' 
                AND c.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                ORDER BY c.end_date ASC
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'expiring_contracts_detail', value: rows });
            });
        })
    ];
    
    Promise.all(queries)
        .then(results => {
            const summary = {};
            results.forEach(result => {
                summary[result.metric] = result.value;
            });
            
            console.log('? Resumen de contratos y SLA calculado');
            res.json({
                message: 'success',
                data: summary,
                timestamp: new Date().toISOString()
            });
        })
        .catch(error => {
            console.error('? Error calculando resumen de contratos y SLA (dashboard) - devolviendo valores por defecto:', error && error.message || error);
            const defaultSummary = {
                active_contracts: 0,
                contracts_expiring_soon: 0,
                expired_contracts: 0,
                tickets_outside_sla: 0,
                tickets_at_risk_sla: 0,
                sla_compliance: { percentage: 0, total_tickets: 0, met_sla: 0 },
                expiring_contracts_detail: []
            };
            res.json({
                message: 'success',
                data: defaultSummary,
                note: 'Datos de contratos simulados - tabla Contracts no disponible o con columnas faltantes',
                timestamp: new Date().toISOString()
            });
        });
});

// Endpoint 5: Alertas Cr�ticas Consolidadas
app.get('/api/dashboard/critical-alerts', authenticateToken, (req, res) => {
    console.log('?? Solicitando alertas cr�ticas...');
    
    const queries = [
        // Tickets sin asignar > 24 horas
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    id,
                    title,
                    priority,
                    created_at,
                    TIMESTAMPDIFF(HOUR, created_at, NOW()) as hours_unassigned
                FROM Tickets 
                WHERE assigned_technician_id IS NULL 
                AND status = 'Abierto'
                AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
                ORDER BY priority DESC, created_at ASC
                LIMIT 5
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'unassigned_tickets_24h', value: rows });
            });
        }),
        
        // SLA en riesgo AHORA (pr�ximas 2 horas)
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    t.id,
                    t.title,
                    t.priority,
                    t.sla_deadline,
                    TIMESTAMPDIFF(MINUTE, NOW(), t.sla_deadline) as minutes_remaining,
                    c.name as client_name
                FROM Tickets t
                LEFT JOIN Equipment e ON t.equipment_id = e.id
                LEFT JOIN Locations l ON e.location_id = l.id
                LEFT JOIN Clients c ON l.client_id = c.id
                WHERE t.sla_status = 'At Risk'
                AND t.status NOT IN ('Cerrado', 'Completado')
                AND t.sla_deadline BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 2 HOUR)
                ORDER BY t.sla_deadline ASC
                LIMIT 5
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'sla_critical_2h', value: rows });
            });
        }),
        
        // Stock en 0 (cr�tico)
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    sku,
                    name,
                    minimum_stock,
                    0 as unit_cost
                FROM SpareParts 
                WHERE current_stock = 0
                ORDER BY minimum_stock DESC
                LIMIT 5
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'zero_stock_items', value: rows });
            });
        }),
        
        // Contratos venciendo esta semana
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    c.id,
                    c.id as contract_number,
                    c.end_date,
                    DATEDIFF(c.end_date, CURDATE()) as days_remaining,
                    cl.name as client_name
                FROM Contracts c
                LEFT JOIN Clients cl ON c.client_id = cl.id
                WHERE c.status = 'Active'
                AND c.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
                ORDER BY c.end_date ASC
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'contracts_expiring_week', value: rows });
            });
        }),
        
        // Equipos fuera de servicio (simulado - tabla Equipment no tiene columna activo)
        new Promise((resolve, reject) => {
            resolve({ metric: 'equipment_out_of_service', value: [] });
        }),
        
        // Gastos pendientes de aprobaci�n > 7 d�as (simulado - tabla Expenses no existe)
        new Promise((resolve, reject) => {
            resolve({ metric: 'expenses_pending_7days', value: [] });
        })
    ];
    
    Promise.all(queries)
        .then(results => {
            const alerts = {};
            results.forEach(result => {
                alerts[result.metric] = result.value;
            });
            
            // Calcular total de alertas
            const totalAlerts = 
                (alerts.unassigned_tickets_24h?.length || 0) +
                (alerts.sla_critical_2h?.length || 0) +
                (alerts.zero_stock_items?.length || 0) +
                (alerts.contracts_expiring_week?.length || 0) +
                (alerts.equipment_out_of_service?.length || 0) +
                (alerts.expenses_pending_7days?.length || 0);
            
            console.log(`? Alertas cr�ticas calculadas: ${totalAlerts} alertas totales`);
            res.json({
                message: 'success',
                data: alerts,
                total_alerts: totalAlerts,
                timestamp: new Date().toISOString()
            });
        })
        .catch(error => {
            console.error('? Error calculando alertas críticas (dashboard) - devolviendo valores por defecto:', error && error.message || error);
            const defaultAlerts = {
                unassigned_tickets_24h: [],
                sla_critical_2h: [],
                zero_stock_items: [],
                contracts_expiring_week: [],
                equipment_out_of_service: [],
                expenses_pending_7days: []
            };
            res.json({
                message: 'success',
                data: defaultAlerts,
                total_alerts: 0,
                note: 'Alertas parciales - algunas tablas/columnas no disponibles',
                timestamp: new Date().toISOString()
            });
        });
});

// Endpoint 6: KPIs Mejorados (actualizaci�n del existente)
app.get('/api/dashboard/kpis-enhanced', authenticateToken, (req, res) => {
    console.log('📊 Solicitando KPIs mejorados del dashboard...');
    
    const queries = [
        // KPIs originales
        new Promise((resolve, reject) => {
            db.all('SELECT COUNT(*) as total FROM Clients', [], (err, rows) => {
                if (err) {
                    console.error('❌ Error en query Clients:', err.message);
                    resolve({ metric: 'total_clients', value: 0 });
                } else {
                    console.log('✅ Clients:', rows[0].total);
                    resolve({ metric: 'total_clients', value: rows[0].total });
                }
            });
        }),
        new Promise((resolve, reject) => {
            db.all('SELECT COUNT(*) as total FROM Equipment', [], (err, rows) => {
                if (err) {
                    console.error('❌ Error en query Equipment:', err.message);
                    resolve({ metric: 'total_equipment', value: 0 });
                } else {
                    console.log('✅ Equipment:', rows[0].total);
                    resolve({ metric: 'total_equipment', value: rows[0].total });
                }
            });
        }),
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(*) as total FROM Tickets WHERE status NOT IN ('Cerrado', 'Completado')`, [], (err, rows) => {
                if (err) {
                    console.error('❌ Error en query Tickets activos:', err.message);
                    resolve({ metric: 'active_tickets', value: 0 });
                } else {
                    console.log('✅ Tickets activos:', rows[0].total);
                    resolve({ metric: 'active_tickets', value: rows[0].total });
                }
            });
        }),
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(*) as total FROM Tickets WHERE priority = 'Crítica' AND status NOT IN ('Cerrado', 'Completado')`, [], (err, rows) => {
                if (err) {
                    console.error('❌ Error en query Tickets críticos:', err.message);
                    resolve({ metric: 'critical_tickets', value: 0 });
                } else {
                    console.log('✅ Tickets críticos:', rows[0].total);
                    resolve({ metric: 'critical_tickets', value: rows[0].total });
                }
            });
        }),
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(*) as total FROM SpareParts WHERE current_stock <= minimum_stock`, [], (err, rows) => {
                if (err) {
                    console.error('❌ Error en query SpareParts:', err.message);
                    resolve({ metric: 'low_stock_items', value: 0 });
                } else {
                    console.log('✅ Stock bajo:', rows[0].total);
                    resolve({ metric: 'low_stock_items', value: rows[0].total });
                }
            });
        }),
        
        // Nuevos KPIs
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(*) as total FROM Contracts WHERE status = 'Active' AND end_date >= CURDATE()`, [], (err, rows) => {
                if (err) {
                    console.error('❌ Error en query Contracts:', err.message);
                    resolve({ metric: 'active_contracts', value: 0 });
                } else {
                    console.log('✅ Contratos activos:', rows[0].total);
                    resolve({ metric: 'active_contracts', value: rows[0].total });
                }
            });
        }),
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(*) as total FROM Users WHERE role IN ('Technician', 'Manager', 'Admin')`, [], (err, rows) => {
                if (err) {
                    console.error('❌ Error en query Users:', err.message);
                    resolve({ metric: 'active_staff', value: 0 });
                } else {
                    console.log('✅ Personal activo:', rows[0].total);
                    resolve({ metric: 'active_staff', value: rows[0].total });
                }
            });
        }),
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(DISTINCT user_id) as total FROM Attendance WHERE DATE(check_in) = CURDATE()`, [], (err, rows) => {
                if (err) {
                    console.error('❌ Error en query Attendance:', err.message);
                    resolve({ metric: 'attendance_today', value: 0 });
                } else {
                    console.log('✅ Asistencia hoy:', rows[0].total);
                    resolve({ metric: 'attendance_today', value: rows[0].total });
                }
            });
        }),
        
        // Datos para gráficos
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    status,
                    COUNT(*) as count
                FROM Tickets
                GROUP BY status
                ORDER BY count DESC
            `, [], (err, rows) => {
                if (err) {
                    console.error('❌ Error en query tickets por estado:', err.message);
                    resolve({ metric: 'tickets_by_status', value: [] });
                } else {
                    console.log('✅ Tickets por estado:', rows.length, 'estados');
                    resolve({ metric: 'tickets_by_status', value: rows });
                }
            });
        }),
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    priority,
                    COUNT(*) as count
                FROM Tickets
                WHERE status NOT IN ('Cerrado', 'Completado')
                GROUP BY priority
                ORDER BY FIELD(priority, 'Crítica', 'Alta', 'Media', 'Baja')
            `, [], (err, rows) => {
                if (err) {
                    console.error('❌ Error en query tickets por prioridad:', err.message);
                    resolve({ metric: 'tickets_by_priority', value: [] });
                } else {
                    console.log('✅ Tickets por prioridad:', rows.length, 'prioridades');
                    resolve({ metric: 'tickets_by_priority', value: rows });
                }
            });
        }),
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    u.id,
                    u.username,
                    COUNT(t.id) as ticket_count
                FROM Users u
                LEFT JOIN Tickets t ON t.assigned_technician_id = u.id AND t.status NOT IN ('Cerrado', 'Completado')
                WHERE u.role = 'Technician'
                GROUP BY u.id, u.username
                ORDER BY ticket_count DESC
                LIMIT 10
            `, [], (err, rows) => {
                if (err) {
                    console.error('❌ Error en query carga de técnicos:', err.message);
                    resolve({ metric: 'technician_workload', value: [] });
                } else {
                    console.log('✅ Carga de técnicos:', rows.length, 'técnicos');
                    resolve({ metric: 'technician_workload', value: rows });
                }
            });
        })
    ];
    
    Promise.allSettled(queries)
        .then(results => {
            const kpis = {};
            let successCount = 0;
            let errorCount = 0;
            
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    kpis[result.value.metric] = result.value.value;
                    successCount++;
                } else {
                    console.error(`❌ Query ${index} falló:`, result.reason);
                    errorCount++;
                }
            });
            
            console.log(`✅ KPIs mejorados calculados: ${successCount} éxitos, ${errorCount} errores`);
            console.log('📊 Datos finales:', JSON.stringify(kpis, null, 2));
            
            res.json({
                message: 'success',
                data: kpis,
                timestamp: new Date().toISOString()
            });
        })
        .catch(error => {
            // Esto no debería suceder con allSettled, pero por si acaso
            console.error('❌ Error inesperado calculando KPIs mejorados:', error && error.message || error);
            const defaultKpis = {
                total_clients: 0,
                total_equipment: 0,
                active_tickets: 0,
                critical_tickets: 0,
                low_stock_items: 0,
                active_contracts: 0,
                active_staff: 0,
                attendance_today: 0,
                tickets_by_status: [],
                tickets_by_priority: [],
                technician_workload: []
            };
            res.json({
                message: 'success',
                data: defaultKpis,
                note: 'KPIs parciales - algunas tablas/columnas no disponibles',
                timestamp: new Date().toISOString()
            });
        });
});


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

// GET /api/models/:id/main-photo - Obtener foto principal de un modelo
app.get('/api/models/:id/main-photo', async (req, res) => {
    try {
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
                // No hay foto principal, intentar obtener la primera foto disponible
                const fallbackQuery = `
                    SELECT 
                        id,
                        photo_data,
                        file_name,
                        mime_type,
                        file_size,
                        created_at
                    FROM ModelPhotos 
                    WHERE model_id = ?
                    ORDER BY created_at ASC
                    LIMIT 1
                `;
                
                db.get(fallbackQuery, [modelId], (err2, fallbackRow) => {
                    if (err2 || !fallbackRow) {
                        return res.status(404).json({
                            error: 'No se encontró foto para este modelo',
                            modelId: modelId
                        });
                    }
                    
                    res.json({
                        message: 'success',
                        data: {
                            id: fallbackRow.id,
                            url: `data:${fallbackRow.mime_type};base64,${fallbackRow.photo_data}`,
                            fileName: fallbackRow.file_name,
                            isPrimary: false,
                            size: fallbackRow.file_size,
                            createdAt: fallbackRow.created_at
                        }
                    });
                });
                return;
            }
            
            res.json({
                message: 'success',
                data: {
                    id: row.id,
                    url: `data:${row.mime_type};base64,${row.photo_data}`,
                    fileName: row.file_name,
                    isPrimary: true,
                    size: row.file_size,
                    createdAt: row.created_at
                }
            });
        });
    } catch (error) {
        console.error('❌ Error en endpoint main-photo:', error);
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
    params.push(parseInt(limit, 10), parseInt(offset, 10));
    
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
            offset: parseInt(offset, 10),
            limit: parseInt(limit, 10)
        });
    });
});

// POST /api/expenses - Crear nuevo gasto
// POST /api/expenses - Crear nuevo gasto (Admin/Manager/Technician) 🔒
app.post('/api/expenses', authenticateToken, requireRole(['Admin', 'Manager', 'Technician']), (req, res) => {
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
// PUT /api/expenses/:id - Actualizar gasto (SOLO Admin/Manager) 🔒
app.put('/api/expenses/:id', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
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
// DELETE /api/expenses/:id - Eliminar gasto (SOLO Admin) 🔒
app.delete('/api/expenses/:id', authenticateToken, requireRole(['Admin']), (req, res) => {
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
            c.name as client_name
        FROM Quotes q
        LEFT JOIN Clients c ON q.client_id = c.id
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
        sql += ` AND q.created_at >= ?`;
        params.push(date_from);
    }
    
    if (date_to) {
        sql += ` AND q.created_at <= ?`;
        params.push(date_to);
    }
    
    sql += ` ORDER BY q.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));
    
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
            offset: parseInt(offset, 10),
            limit: parseInt(limit, 10)
        });
    });
});

// POST /api/quotes - Crear nueva cotización
// POST /api/quotes - Crear nueva cotización (SOLO Admin/Manager) 🔒
app.post('/api/quotes', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
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
// PUT /api/quotes/:id - Actualizar cotización (SOLO Admin/Manager) 🔒
app.put('/api/quotes/:id', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
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
// DELETE /api/quotes/:id - Eliminar cotización (SOLO Admin) 🔒
app.delete('/api/quotes/:id', authenticateToken, requireRole(['Admin']), (req, res) => {
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
            c.phone as client_phone
        FROM Quotes q
        LEFT JOIN Clients c ON q.client_id = c.id
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
            c.name as client_name
        FROM Invoices i
        LEFT JOIN Clients c ON i.client_id = c.id
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
        sql += ` AND i.created_at >= ?`;
        params.push(date_from);
    }
    
    if (date_to) {
        sql += ` AND i.created_at <= ?`;
        params.push(date_to);
    }
    
    sql += ` ORDER BY i.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));
    
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
            offset: parseInt(offset, 10),
            limit: parseInt(limit, 10)
        });
    });
});

// POST /api/invoices - Crear nueva factura
// POST /api/invoices - Crear nueva factura (SOLO Admin/Manager) 🔒
app.post('/api/invoices', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
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
// PUT /api/invoices/:id - Actualizar factura (SOLO Admin/Manager) 🔒
app.put('/api/invoices/:id', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
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
// DELETE /api/invoices/:id - Eliminar factura (SOLO Admin) 🔒
app.delete('/api/invoices/:id', authenticateToken, requireRole(['Admin']), (req, res) => {
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

// ===================================================================
// MÓDULO DE ASISTENCIA Y CONTROL HORARIO - MOVIDO AQUÍ ANTES DE ERROR HANDLER
// ===================================================================
console.log('🔄 Registrando rutas del módulo de asistencia...');
console.log('📍 Posición actual en archivo: ANTES del error handler');
console.log('✅ app está definido:', typeof app);
console.log('✅ authenticateToken está definido:', typeof authenticateToken);

// ===================================================================
// TIPOS DE TURNO
// ===================================================================

// GET - Obtener todos los tipos de turno
app.get('/api/shift-types', authenticateToken, (req, res) => {
    console.log('🎯 RUTA /api/shift-types INVOCADA');
    const sql = 'SELECT * FROM ShiftTypes WHERE is_active = 1 ORDER BY name';
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error obteniendo tipos de turno:', err);
            return res.status(500).json({ error: 'Error al obtener tipos de turno' });
        }
        res.json({ message: 'success', data: rows });
    });
});

// POST - Crear tipo de turno
app.post('/api/shift-types', authenticateToken, requireRole(['Admin']), (req, res) => {
    const { name, description, color } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    const sql = `INSERT INTO ShiftTypes (name, description, color) VALUES (?, ?, ?)`;
    
    db.run(sql, [name, description, color || '#3B82F6'], function(err) {
        if (err) {
            console.error('Error creando tipo de turno:', err);
            return res.status(500).json({ error: 'Error al crear tipo de turno' });
        }
        res.json({ 
            message: 'success',
            data: { id: this.lastID, name, description, color }
        });
    });
});

// ===================================================================
// HORARIOS DE TRABAJO
// ===================================================================

// GET - Obtener todos los horarios
app.get('/api/work-schedules', authenticateToken, (req, res) => {
    const sql = `
        SELECT ws.*, st.name as shift_type_name, st.color as shift_type_color
        FROM WorkSchedules ws
        LEFT JOIN ShiftTypes st ON ws.shift_type_id = st.id
        WHERE ws.is_active = 1
        ORDER BY ws.name
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error obteniendo horarios:', err);
            return res.status(500).json({ error: 'Error al obtener horarios' });
        }
        res.json({ message: 'success', data: rows });
    });
});

// GET - Obtener horario por ID
app.get('/api/work-schedules/:id', authenticateToken, (req, res) => {
    const sql = `
        SELECT ws.*, st.name as shift_type_name
        FROM WorkSchedules ws
        LEFT JOIN ShiftTypes st ON ws.shift_type_id = st.id
        WHERE ws.id = ?
    `;
    
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            console.error('Error obteniendo horario:', err);
            return res.status(500).json({ error: 'Error al obtener horario' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Horario no encontrado' });
        }
        res.json({ message: 'success', data: row });
    });
});

// POST - Crear horario
app.post('/api/work-schedules', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const {
        name, description, shift_type_id,
        monday_enabled, monday_start, monday_end, monday_break_duration,
        tuesday_enabled, tuesday_start, tuesday_end, tuesday_break_duration,
        wednesday_enabled, wednesday_start, wednesday_end, wednesday_break_duration,
        thursday_enabled, thursday_start, thursday_end, thursday_break_duration,
        friday_enabled, friday_start, friday_end, friday_break_duration,
        saturday_enabled, saturday_start, saturday_end, saturday_break_duration,
        sunday_enabled, sunday_start, sunday_end, sunday_break_duration,
        weekly_hours, tolerance_minutes
    } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    const sql = `
        INSERT INTO WorkSchedules (
            name, description, shift_type_id,
            monday_enabled, monday_start, monday_end, monday_break_duration,
            tuesday_enabled, tuesday_start, tuesday_end, tuesday_break_duration,
            wednesday_enabled, wednesday_start, wednesday_end, wednesday_break_duration,
            thursday_enabled, thursday_start, thursday_end, thursday_break_duration,
            friday_enabled, friday_start, friday_end, friday_break_duration,
            saturday_enabled, saturday_start, saturday_end, saturday_break_duration,
            sunday_enabled, sunday_start, sunday_end, sunday_break_duration,
            weekly_hours, tolerance_minutes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
        name, description, shift_type_id,
        monday_enabled || 0, monday_start, monday_end, monday_break_duration || 0,
        tuesday_enabled || 0, tuesday_start, tuesday_end, tuesday_break_duration || 0,
        wednesday_enabled || 0, wednesday_start, wednesday_end, wednesday_break_duration || 0,
        thursday_enabled || 0, thursday_start, thursday_end, thursday_break_duration || 0,
        friday_enabled || 0, friday_start, friday_end, friday_break_duration || 0,
        saturday_enabled || 0, saturday_start, saturday_end, saturday_break_duration || 0,
        sunday_enabled || 0, sunday_start, sunday_end, sunday_break_duration || 0,
        weekly_hours || 0, tolerance_minutes || 15
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error creando horario:', err);
            return res.status(500).json({ error: 'Error al crear horario' });
        }
        res.json({ message: 'success', data: { id: this.lastID } });
    });
});

// PUT - Actualizar horario
app.put('/api/work-schedules/:id', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const {
        name, description, shift_type_id,
        monday_enabled, monday_start, monday_end, monday_break_duration,
        tuesday_enabled, tuesday_start, tuesday_end, tuesday_break_duration,
        wednesday_enabled, wednesday_start, wednesday_end, wednesday_break_duration,
        thursday_enabled, thursday_start, thursday_end, thursday_break_duration,
        friday_enabled, friday_start, friday_end, friday_break_duration,
        saturday_enabled, saturday_start, saturday_end, saturday_break_duration,
        sunday_enabled, sunday_start, sunday_end, sunday_break_duration,
        weekly_hours, tolerance_minutes
    } = req.body;
    
    const sql = `
        UPDATE WorkSchedules SET
            name = ?, description = ?, shift_type_id = ?,
            monday_enabled = ?, monday_start = ?, monday_end = ?, monday_break_duration = ?,
            tuesday_enabled = ?, tuesday_start = ?, tuesday_end = ?, tuesday_break_duration = ?,
            wednesday_enabled = ?, wednesday_start = ?, wednesday_end = ?, wednesday_break_duration = ?,
            thursday_enabled = ?, thursday_start = ?, thursday_end = ?, thursday_break_duration = ?,
            friday_enabled = ?, friday_start = ?, friday_end = ?, friday_break_duration = ?,
            saturday_enabled = ?, saturday_start = ?, saturday_end = ?, saturday_break_duration = ?,
            sunday_enabled = ?, sunday_start = ?, sunday_end = ?, sunday_break_duration = ?,
            weekly_hours = ?, tolerance_minutes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    
    const params = [
        name, description, shift_type_id,
        monday_enabled || 0, monday_start, monday_end, monday_break_duration || 0,
        tuesday_enabled || 0, tuesday_start, tuesday_end, tuesday_break_duration || 0,
        wednesday_enabled || 0, wednesday_start, wednesday_end, wednesday_break_duration || 0,
        thursday_enabled || 0, thursday_start, thursday_end, thursday_break_duration || 0,
        friday_enabled || 0, friday_start, friday_end, friday_break_duration || 0,
        saturday_enabled || 0, saturday_start, saturday_end, saturday_break_duration || 0,
        sunday_enabled || 0, sunday_start, sunday_end, sunday_break_duration || 0,
        weekly_hours || 0, tolerance_minutes || 15,
        req.params.id
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error actualizando horario:', err);
            return res.status(500).json({ error: 'Error al actualizar horario' });
        }
        res.json({ message: 'success' });
    });
});

// DELETE - Desactivar horario
app.delete('/api/work-schedules/:id', authenticateToken, requireRole(['Admin']), (req, res) => {
    const sql = 'UPDATE WorkSchedules SET is_active = 0 WHERE id = ?';
    
    db.run(sql, [req.params.id], function(err) {
        if (err) {
            console.error('Error desactivando horario:', err);
            return res.status(500).json({ error: 'Error al desactivar horario' });
        }
        res.json({ message: 'success' });
    });
});

// ===================================================================
// ASIGNACIÓN DE HORARIOS A EMPLEADOS
// ===================================================================

// GET - Obtener horarios de un empleado
app.get('/api/employee-schedules/:userId', authenticateToken, (req, res) => {
    const sql = `
        SELECT es.*, ws.name as schedule_name, ws.weekly_hours,
               u.username, st.name as shift_type_name
        FROM EmployeeSchedules es
        JOIN WorkSchedules ws ON es.schedule_id = ws.id
        JOIN Users u ON es.user_id = u.id
        LEFT JOIN ShiftTypes st ON ws.shift_type_id = st.id
        WHERE es.user_id = ?
        ORDER BY es.start_date DESC
    `;
    
    db.all(sql, [req.params.userId], (err, rows) => {
        if (err) {
            console.error('Error obteniendo horarios del empleado:', err);
            return res.status(500).json({ error: 'Error al obtener horarios' });
        }
        res.json({ message: 'success', data: rows });
    });
});

// GET - Obtener horario activo de un empleado
app.get('/api/employee-schedules/:userId/active', authenticateToken, (req, res) => {
    const sql = `
        SELECT es.*, ws.*, st.name as shift_type_name
        FROM EmployeeSchedules es
        JOIN WorkSchedules ws ON es.schedule_id = ws.id
        LEFT JOIN ShiftTypes st ON ws.shift_type_id = st.id
        WHERE es.user_id = ?
          AND es.is_active = 1
          AND CURDATE() >= es.start_date
          AND (es.end_date IS NULL OR CURDATE() <= es.end_date)
        ORDER BY es.start_date DESC
        LIMIT 1
    `;
    
    db.get(sql, [req.params.userId], (err, row) => {
        if (err) {
            console.error('Error obteniendo horario activo:', err);
            return res.status(500).json({ error: 'Error al obtener horario activo' });
        }
        res.json({ message: 'success', data: row });
    });
});

// POST - Asignar horario a empleado
app.post('/api/employee-schedules', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const { user_id, schedule_id, start_date, end_date, notes } = req.body;
    
    if (!user_id || !schedule_id || !start_date) {
        return res.status(400).json({ error: 'Datos incompletos' });
    }
    
    const sql = `
        INSERT INTO EmployeeSchedules (user_id, schedule_id, start_date, end_date, notes)
        VALUES (?, ?, ?, ?, ?)
    `;
    
    db.run(sql, [user_id, schedule_id, start_date, end_date, notes], function(err) {
        if (err) {
            console.error('Error asignando horario:', err);
            return res.status(500).json({ error: 'Error al asignar horario' });
        }
        res.json({ message: 'success', data: { id: this.lastID } });
    });
});

// ===================================================================
// ASISTENCIA
// ===================================================================

// GET - Obtener asistencias (con filtros)
app.get('/api/attendance', authenticateToken, (req, res) => {
    const { user_id, date_from, date_to, status } = req.query;
    
    let sql = `
        SELECT a.*, u.username, u.role_id,
               ws.name as schedule_name
        FROM Attendance a
        JOIN Users u ON a.user_id = u.id
        LEFT JOIN EmployeeSchedules es ON es.user_id = u.id 
            AND a.date BETWEEN es.start_date AND COALESCE(es.end_date, '9999-12-31')
            AND es.is_active = 1
        LEFT JOIN WorkSchedules ws ON es.schedule_id = ws.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (user_id) {
        sql += ' AND a.user_id = ?';
        params.push(user_id);
    }
    
    if (date_from) {
        sql += ' AND a.date >= ?';
        params.push(date_from);
    }
    
    if (date_to) {
        sql += ' AND a.date <= ?';
        params.push(date_to);
    }
    
    if (status) {
        sql += ' AND a.status = ?';
        params.push(status);
    }
    
    sql += ' ORDER BY a.date DESC, u.username';
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Error obteniendo asistencias:', err);
            return res.status(500).json({ error: 'Error al obtener asistencias' });
        }
        res.json({ message: 'success', data: rows });
    });
});

// GET - Obtener asistencia de hoy del usuario actual
app.get('/api/attendance/today', authenticateToken, (req, res) => {
    const sql = `
        SELECT a.*, ws.name as schedule_name,
               ws.tolerance_minutes
        FROM Attendance a
        LEFT JOIN EmployeeSchedules es ON es.user_id = a.user_id 
            AND a.date BETWEEN es.start_date AND COALESCE(es.end_date, '9999-12-31')
            AND es.is_active = 1
        LEFT JOIN WorkSchedules ws ON es.schedule_id = ws.id
        WHERE a.user_id = ? AND a.date = CURDATE()
    `;
    
    db.get(sql, [req.user.id], (err, row) => {
        if (err) {
            console.error('Error obteniendo asistencia de hoy:', err);
            return res.status(500).json({ error: 'Error al obtener asistencia' });
        }
        res.json({ message: 'success', data: row });
    });
});

// NOTE: Por limitaciones de tamaño, las demás rutas (check-in, check-out, overtime, leave-requests, holidays, reports) 
// se mantendrán en su ubicación actual después de startServer() temporalmente.
// TODO: Mover todas las rutas aquí en un refactor posterior.

// ===================================================================
// REPORTES DE ASISTENCIA
// ===================================================================

// GET - Resumen de asistencia por empleado
app.get('/api/attendance/summary/:userId', authenticateToken, (req, res) => {
    const { month, year } = req.query;
    
    let sql = `
        SELECT 
            COUNT(*) as total_days,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
            SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
            SUM(CASE WHEN is_late = 1 THEN 1 ELSE 0 END) as late_days,
            SUM(late_minutes) as total_late_minutes,
            SUM(worked_hours) as total_worked_hours,
            AVG(worked_hours) as avg_worked_hours
        FROM Attendance
        WHERE user_id = ?
    `;
    
    const params = [req.params.userId];
    
    if (month && year) {
        sql += ' AND MONTH(date) = ? AND YEAR(date) = ?';
        params.push(month, year);
    }
    
    db.get(sql, params, (err, row) => {
        if (err) {
            console.error('Error obteniendo resumen de asistencia:', err);
            return res.status(500).json({ error: 'Error al obtener resumen' });
        }
        res.json({ message: 'success', data: row });
    });
});

// GET - Estadísticas generales de asistencia
app.get('/api/attendance/stats', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const sql = `
        SELECT 
            COUNT(DISTINCT user_id) as total_employees,
            COUNT(*) as total_records,
            SUM(CASE WHEN date = CURDATE() THEN 1 ELSE 0 END) as today_present,
            SUM(CASE WHEN date = CURDATE() AND check_in_time IS NOT NULL AND check_out_time IS NULL THEN 1 ELSE 0 END) as currently_working,
            SUM(CASE WHEN is_late = 1 THEN 1 ELSE 0 END) as total_late
        FROM Attendance
        WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `;
    
    db.get(sql, [], (err, row) => {
        if (err) {
            console.error('Error obteniendo estadísticas:', err);
            return res.status(500).json({ error: 'Error al obtener estadísticas' });
        }
        res.json({ message: 'success', data: row });
    });
});

// GET - Vista global de asistencia para Admin/Manager (NUEVO)
app.get('/api/attendance/all', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const { user_id, date_from, date_to, status, limit = 100 } = req.query;
    
    // Query principal con información del usuario
    let sql = `
        SELECT 
            a.id,
            a.user_id,
            a.date,
            a.check_in_time,
            a.check_out_time,
            a.worked_hours,
            a.scheduled_hours,
            a.is_late,
            a.late_minutes,
            a.status,
            u.username,
            u.email,
            u.role_id,
            ws.name as schedule_name,
            ws.weekly_hours
        FROM Attendance a
        JOIN Users u ON a.user_id = u.id
        LEFT JOIN EmployeeSchedules es ON es.user_id = u.id 
            AND a.date BETWEEN es.start_date AND COALESCE(es.end_date, '9999-12-31')
            AND es.is_active = 1
        LEFT JOIN WorkSchedules ws ON es.schedule_id = ws.id
        WHERE 1=1
    `;
    
    const params = [];
    
    // Filtros
    if (user_id) {
        sql += ' AND a.user_id = ?';
        params.push(user_id);
    }
    
    if (date_from) {
        sql += ' AND a.date >= ?';
        params.push(date_from);
    }
    
    if (date_to) {
        sql += ' AND a.date <= ?';
        params.push(date_to);
    }
    
    if (status) {
        sql += ' AND a.status = ?';
        params.push(status);
    }
    
    sql += ' ORDER BY a.date DESC, u.username LIMIT ?';
    params.push(parseInt(limit, 10));
    
    // Obtener registros
    db.all(sql, params, (err, attendances) => {
        if (err) {
            console.error('❌ Error obteniendo asistencias globales:', err);
            return res.status(500).json({ message: 'error', error: 'Error al obtener asistencias' });
        }
        
        // Obtener agregaciones
        let summarySQL = `
            SELECT 
                COUNT(DISTINCT user_id) as total_users,
                COUNT(*) as total_records,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
                SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,
                SUM(CASE WHEN is_late = 1 THEN 1 ELSE 0 END) as total_lates,
                SUM(late_minutes) as total_late_minutes,
                SUM(worked_hours) as total_worked_hours,
                AVG(worked_hours) as avg_worked_hours
            FROM Attendance
            WHERE 1=1
        `;
        
        const summaryParams = [];
        
        if (user_id) {
            summarySQL += ' AND user_id = ?';
            summaryParams.push(user_id);
        }
        
        if (date_from) {
            summarySQL += ' AND date >= ?';
            summaryParams.push(date_from);
        }
        
        if (date_to) {
            summarySQL += ' AND date <= ?';
            summaryParams.push(date_to);
        }
        
        if (status) {
            summarySQL += ' AND status = ?';
            summaryParams.push(status);
        }
        
        db.get(summarySQL, summaryParams, (err, summary) => {
            if (err) {
                console.error('❌ Error obteniendo resumen:', err);
                return res.json({ message: 'success', data: attendances, summary: null });
            }
            
            console.log(`✅ Asistencias globales obtenidas: ${attendances.length} registros`);
            res.json({ 
                message: 'success', 
                data: attendances,
                summary: summary || {},
                filters: { user_id, date_from, date_to, status, limit }
            });
        });
    });
});

// POST - Marcar entrada (check-in)
app.post('/api/attendance/check-in', authenticateToken, (req, res) => {
    const { location, notes } = req.body;
    const user_id = req.user.id;
    const ip = req.ip || req.connection.remoteAddress;
    
    // Verificar si ya marcó entrada hoy
    const checkSql = 'SELECT * FROM Attendance WHERE user_id = ? AND date = CURDATE()';
    
    db.get(checkSql, [user_id], (err, existing) => {
        if (err) {
            console.error('Error verificando asistencia:', err);
            return res.status(500).json({ error: 'Error al verificar asistencia' });
        }
        
        if (existing && existing.check_in_time) {
            return res.status(400).json({ 
                error: 'Ya has marcado tu entrada hoy',
                data: existing
            });
        }
        
        // Obtener horario del empleado para calcular tardanza
        const scheduleSql = `
            SELECT ws.*, 
                   CASE DAYOFWEEK(NOW())
                       WHEN 2 THEN ws.monday_start
                       WHEN 3 THEN ws.tuesday_start
                       WHEN 4 THEN ws.wednesday_start
                       WHEN 5 THEN ws.thursday_start
                       WHEN 6 THEN ws.friday_start
                       WHEN 7 THEN ws.saturday_start
                       WHEN 1 THEN ws.sunday_start
                   END as scheduled_start
            FROM EmployeeSchedules es
            JOIN WorkSchedules ws ON es.schedule_id = ws.id
            WHERE es.user_id = ?
              AND es.is_active = 1
              AND CURDATE() >= es.start_date
              AND (es.end_date IS NULL OR CURDATE() <= es.end_date)
            LIMIT 1
        `;
        
        db.get(scheduleSql, [user_id], (err, schedule) => {
            const now = new Date();
            const nowTime = toMySQLDateTime(now); //  FIX: Hora local
            let is_late = 0;
            let late_minutes = 0;
            let status = 'present';
            
            if (schedule && schedule.scheduled_start) {
                const scheduledStart = new Date();
                const [hours, minutes] = schedule.scheduled_start.split(':');
                scheduledStart.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
                
                const tolerance = (schedule.tolerance_minutes || 15) * 60 * 1000;
                const diff = now - scheduledStart;
                
                if (diff > tolerance) {
                    is_late = 1;
                    late_minutes = Math.floor(diff / 60000);
                    status = 'late';
                }
            }
            
            if (existing) {
                // Actualizar registro existente
                const updateSql = `
                    UPDATE Attendance SET
                        check_in_time = ?,
                        check_in_location = ?,
                        check_in_notes = ?,
                        check_in_ip = ?,
                        is_late = ?,
                        late_minutes = ?,
                        status = ?
                    WHERE id = ?
                `;
                
                db.run(updateSql, [nowTime, location, notes, ip, is_late, late_minutes, status, existing.id], function(err) {
                    if (err) {
                        console.error('Error actualizando entrada:', err);
                        return res.status(500).json({ error: 'Error al marcar entrada' });
                    }
                    res.json({ message: 'Entrada registrada correctamente', data: { id: existing.id, is_late, late_minutes } });
                });
            } else {
                // Crear nuevo registro
                const insertSql = `
                    INSERT INTO Attendance (
                        user_id, date, check_in_time, check_in_location, check_in_notes, check_in_ip,
                        is_late, late_minutes, status, scheduled_hours
                    ) VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                
                const scheduled_hours = schedule ? schedule.weekly_hours / 5 : 8; // Aproximación
                
                db.run(insertSql, [user_id, nowTime, location, notes, ip, is_late, late_minutes, status, scheduled_hours], function(err) {
                    if (err) {
                        console.error('Error creando entrada:', err);
                        return res.status(500).json({ error: 'Error al marcar entrada' });
                    }
                    res.json({ message: 'Entrada registrada correctamente', data: { id: this.lastID, is_late, late_minutes } });
                });
            }
        });
    });
});

// POST - Marcar salida (check-out)
app.post('/api/attendance/check-out', authenticateToken, (req, res) => {
    const { location, notes } = req.body;
    const user_id = req.user.id;
    const ip = req.ip || req.connection.remoteAddress;
    
    // Obtener registro de hoy
    const getSql = 'SELECT * FROM Attendance WHERE user_id = ? AND date = CURDATE()';
    
    db.get(getSql, [user_id], (err, attendance) => {
        if (err) {
            console.error('Error obteniendo asistencia:', err);
            return res.status(500).json({ error: 'Error al obtener asistencia' });
        }
        
        if (!attendance) {
            return res.status(400).json({ error: 'No has marcado entrada hoy' });
        }
        
        if (attendance.check_out_time) {
            return res.status(400).json({ error: 'Ya has marcado tu salida hoy' });
        }
        
        const now = new Date();
        
        // FIX: Convertir check_in_time de MySQL DATETIME a JavaScript Date correctamente
        // MySQL puede devolver Date object o string "2025-10-09 03:29:00"
        let check_in;
        if (attendance.check_in_time instanceof Date) {
            // Ya es un objeto Date
            check_in = attendance.check_in_time;
        } else if (typeof attendance.check_in_time === 'string') {
            // Es un string, necesitamos parsearlo como hora local
            const checkInStr = attendance.check_in_time.replace(' ', 'T');
            check_in = new Date(checkInStr);
        } else {
            console.error('Tipo inesperado para check_in_time:', typeof attendance.check_in_time);
            return res.status(500).json({ error: 'Error procesando hora de entrada' });
        }
        
        const worked_hours = (now - check_in) / (1000 * 60 * 60); // Horas trabajadas
        
        const updateSql = `
            UPDATE Attendance SET
                check_out_time = ?,
                check_out_location = ?,
                check_out_notes = ?,
                check_out_ip = ?,
                worked_hours = ?
            WHERE id = ?
        `;
        
        db.run(updateSql, [toMySQLDateTime(now), location, notes, ip, worked_hours.toFixed(2), attendance.id], function(err) {
            if (err) {
                console.error('Error marcando salida:', err);
                return res.status(500).json({ error: 'Error al marcar salida' });
            }
            res.json({ 
                message: 'Salida registrada correctamente',
                data: { worked_hours: worked_hours.toFixed(2) }
            });
        });
    });
});

// ===================================================================
// HORAS EXTRAS
// ===================================================================

// GET - Obtener horas extras
app.get('/api/overtime', authenticateToken, (req, res) => {
    const { user_id, status, date_from, date_to } = req.query;
    
    let sql = `
        SELECT o.*, u.username,
               requester.username as requested_by_name,
               approver.username as approved_by_name
        FROM Overtime o
        JOIN Users u ON o.user_id = u.id
        LEFT JOIN Users requester ON o.requested_by = requester.id
        LEFT JOIN Users approver ON o.approved_by = approver.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (user_id) {
        sql += ' AND o.user_id = ?';
        params.push(user_id);
    }
    
    if (status) {
        sql += ' AND o.status = ?';
        params.push(status);
    }
    
    if (date_from) {
        sql += ' AND o.date >= ?';
        params.push(date_from);
    }
    
    if (date_to) {
        sql += ' AND o.date <= ?';
        params.push(date_to);
    }
    
    sql += ' ORDER BY o.date DESC, o.start_time DESC';
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Error obteniendo horas extras:', err);
            return res.status(500).json({ error: 'Error al obtener horas extras' });
        }
        res.json({ message: 'success', data: rows });
    });
});

// POST - Registrar horas extras
app.post('/api/overtime', authenticateToken, (req, res) => {
    const { 
        user_id, date, start_time, end_time, type, description, reason,
        hourly_rate
    } = req.body;
    
    if (!user_id || !date || !start_time || !end_time) {
        return res.status(400).json({ error: 'Datos incompletos' });
    }
    
    // Calcular horas
    const start = new Date(`${date}T${start_time}`);
    const end = new Date(`${date}T${end_time}`);
    const hours = (end - start) / (1000 * 60 * 60);
    
    // Determinar multiplicador según tipo
    let multiplier = 1.5;
    if (type === 'night') multiplier = 2.0;
    if (type === 'holiday') multiplier = 2.0;
    if (type === 'sunday') multiplier = 1.8;
    
    const total_amount = hourly_rate ? (hours * hourly_rate * multiplier).toFixed(2) : 0;
    
    const sql = `
        INSERT INTO Overtime (
            user_id, date, start_time, end_time, hours,
            type, multiplier, description, reason,
            hourly_rate, total_amount, requested_by, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(sql, [
        user_id, date, start_time, end_time, hours.toFixed(2),
        type || 'regular', multiplier, description, reason,
        hourly_rate || 0, total_amount, req.user.id, 'pending'
    ], function(err) {
        if (err) {
            console.error('Error registrando horas extras:', err);
            return res.status(500).json({ error: 'Error al registrar horas extras' });
        }
        res.json({ message: 'success', data: { id: this.lastID, hours: hours.toFixed(2), total_amount } });
    });
});

// PUT - Aprobar/Rechazar horas extras
app.put('/api/overtime/:id/status', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const { status, rejection_reason } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' });
    }
    
    const sql = `
        UPDATE Overtime SET
            status = ?,
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP,
            rejection_reason = ?
        WHERE id = ?
    `;
    
    db.run(sql, [status, req.user.id, rejection_reason, req.params.id], function(err) {
        if (err) {
            console.error('Error actualizando estado de horas extras:', err);
            return res.status(500).json({ error: 'Error al actualizar estado' });
        }
        res.json({ message: 'success' });
    });
});

// ===================================================================
// SOLICITUDES DE PERMISO/VACACIONES
// ===================================================================

// GET - Obtener solicitudes de permiso
app.get('/api/leave-requests', authenticateToken, (req, res) => {
    const { user_id, status } = req.query;
    
    let sql = `
        SELECT lr.*, u.username,
               approver.username as approved_by_name,
               replacement.username as replacement_name
        FROM LeaveRequests lr
        JOIN Users u ON lr.user_id = u.id
        LEFT JOIN Users approver ON lr.approved_by = approver.id
        LEFT JOIN Users replacement ON lr.replacement_user_id = replacement.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (user_id) {
        sql += ' AND lr.user_id = ?';
        params.push(user_id);
    }
    
    if (status) {
        sql += ' AND lr.status = ?';
        params.push(status);
    }
    
    sql += ' ORDER BY lr.start_date DESC';
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Error obteniendo solicitudes de permiso:', err);
            return res.status(500).json({ error: 'Error al obtener solicitudes' });
        }
        res.json({ message: 'success', data: rows });
    });
});

// POST - Crear solicitud de permiso
app.post('/api/leave-requests', authenticateToken, (req, res) => {
    const {
        start_date, end_date, days_requested, type, reason,
        has_documentation, documentation_file, replacement_user_id
    } = req.body;
    
    if (!start_date || !end_date || !type) {
        return res.status(400).json({ error: 'Datos incompletos' });
    }
    
    const sql = `
        INSERT INTO LeaveRequests (
            user_id, start_date, end_date, days_requested,
            type, reason, has_documentation, documentation_file,
            replacement_user_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(sql, [
        req.user.id, start_date, end_date, days_requested || 1,
        type, reason, has_documentation || 0, documentation_file,
        replacement_user_id, 'pending'
    ], function(err) {
        if (err) {
            console.error('Error creando solicitud de permiso:', err);
            return res.status(500).json({ error: 'Error al crear solicitud' });
        }
        res.json({ message: 'success', data: { id: this.lastID } });
    });
});

// PUT - Aprobar/Rechazar solicitud de permiso
app.put('/api/leave-requests/:id/status', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const { status, rejection_reason } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' });
    }
    
    const sql = `
        UPDATE LeaveRequests SET
            status = ?,
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP,
            rejection_reason = ?
        WHERE id = ?
    `;
    
    db.run(sql, [status, req.user.id, rejection_reason, req.params.id], function(err) {
        if (err) {
            console.error('Error actualizando solicitud:', err);
            return res.status(500).json({ error: 'Error al actualizar solicitud' });
        }
        res.json({ message: 'success' });
    });
});

// ===================================================================
// ENDPOINTS ESPEC�?FICOS PARA APROBACI�"N/RECHAZO (ADMIN)
// ===================================================================

// PATCH - Aprobar horas extras (con ajuste manual de horas)
app.patch('/api/overtime/:id/approve', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const { hours_approved } = req.body;
    const overtimeId = req.params.id;
    
    // Validar que hours_approved sea un n�mero positivo
    if (!hours_approved || hours_approved <= 0) {
        return res.status(400).json({ error: 'Horas aprobadas debe ser mayor a 0' });
    }
    
    // Verificar que no se aprueben m�s horas de las solicitadas
    const checkSql = 'SELECT hours_requested FROM Overtime WHERE id = ?';
    
    db.get(checkSql, [overtimeId], (err, row) => {
        if (err) {
            console.error('Error verificando overtime:', err);
            return res.status(500).json({ error: 'Error al verificar horas extras' });
        }
        
        if (!row) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }
        
        if (hours_approved > row.hours_requested) {
            return res.status(400).json({ 
                error: `No puede aprobar m�s horas (${hours_approved}h) de las solicitadas (${row.hours_requested}h)` 
            });
        }
        
        // Aprobar con horas ajustadas
        const updateSql = `
            UPDATE Overtime SET
                status = 'approved',
                hours_approved = ?,
                approved_by = ?,
                approved_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        db.run(updateSql, [hours_approved, req.user.id, overtimeId], function(err) {
            if (err) {
                console.error('Error aprobando horas extras:', err);
                return res.status(500).json({ error: 'Error al aprobar horas extras' });
            }
            
            console.log(`? Horas extras aprobadas: ${hours_approved}h (ID: ${overtimeId}) por usuario ${req.user.id}`);
            res.json({ 
                message: 'success', 
                data: { 
                    id: overtimeId, 
                    hours_approved, 
                    status: 'approved' 
                } 
            });
        });
    });
});

// PATCH - Rechazar horas extras
app.patch('/api/overtime/:id/reject', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const { rejection_reason } = req.body;
    const overtimeId = req.params.id;
    
    const sql = `
        UPDATE Overtime SET
            status = 'rejected',
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP,
            rejection_reason = ?
        WHERE id = ?
    `;
    
    db.run(sql, [req.user.id, rejection_reason || 'Rechazado por administrador', overtimeId], function(err) {
        if (err) {
            console.error('Error rechazando horas extras:', err);
            return res.status(500).json({ error: 'Error al rechazar horas extras' });
        }
        
        console.log(`? Horas extras rechazadas (ID: ${overtimeId}) por usuario ${req.user.id}`);
        res.json({ message: 'success', data: { id: overtimeId, status: 'rejected' } });
    });
});

// PATCH - Aprobar permiso/vacaciones
app.patch('/api/leave-requests/:id/approve', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const leaveId = req.params.id;
    
    const sql = `
        UPDATE LeaveRequests SET
            status = 'approved',
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    
    db.run(sql, [req.user.id, leaveId], function(err) {
        if (err) {
            console.error('Error aprobando permiso:', err);
            return res.status(500).json({ error: 'Error al aprobar permiso' });
        }
        
        console.log(`? Permiso aprobado (ID: ${leaveId}) por usuario ${req.user.id}`);
        res.json({ message: 'success', data: { id: leaveId, status: 'approved' } });
    });
});

// PATCH - Rechazar permiso/vacaciones
app.patch('/api/leave-requests/:id/reject', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const { rejection_reason } = req.body;
    const leaveId = req.params.id;
    
    const sql = `
        UPDATE LeaveRequests SET
            status = 'rejected',
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP,
            rejection_reason = ?
        WHERE id = ?
    `;
    
    db.run(sql, [req.user.id, rejection_reason || 'Rechazado por administrador', leaveId], function(err) {
        if (err) {
            console.error('Error rechazando permiso:', err);
            return res.status(500).json({ error: 'Error al rechazar permiso' });
        }
        
        console.log(`? Permiso rechazado (ID: ${leaveId}) por usuario ${req.user.id}`);
        res.json({ message: 'success', data: { id: leaveId, status: 'rejected' } });
    });
});

// GET - Estad�sticas del d�a para administradores
app.get('/api/attendance/stats/today', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    
    const statsQueries = {
        // Empleados presentes (con check-in hoy)
        present: `SELECT COUNT(DISTINCT user_id) as count FROM Attendance WHERE DATE(check_in) = ?`,
        
        // Llegadas tarde (check-in despu�s de horario)
        late: `SELECT COUNT(DISTINCT a.user_id) as count 
               FROM Attendance a 
               JOIN EmployeeSchedules es ON a.user_id = es.user_id
               JOIN ShiftTypes st ON es.shift_type_id = st.id
               WHERE DATE(a.check_in) = ? 
               AND TIME(a.check_in) > st.start_time`,
        
        // Horas extras pendientes
        pending_overtime: `SELECT COUNT(*) as count FROM Overtime WHERE status = 'pending'`,
        
        // Permisos pendientes
        pending_leave: `SELECT COUNT(*) as count FROM LeaveRequests WHERE status = 'pending'`,
        
        // Total horas extras del mes
        overtime_hours: `SELECT IFNULL(SUM(hours_approved), 0) as total 
                         FROM Overtime 
                         WHERE status = 'approved' 
                         AND MONTH(date) = MONTH(CURDATE()) 
                         AND YEAR(date) = YEAR(CURDATE())`
    };
    
    const stats = {};
    let completed = 0;
    const total = Object.keys(statsQueries).length;
    
    Object.keys(statsQueries).forEach(key => {
        const params = statsQueries[key].includes('?') ? [today] : [];
        
        db.get(statsQueries[key], params, (err, row) => {
            if (err) {
                console.error(`Error en query ${key}:`, err);
                stats[key] = 0;
            } else {
                stats[key] = row.count || row.total || 0;
            }
            
            completed++;
            if (completed === total) {
                console.log('?? Estad�sticas del d�a generadas:', stats);
                res.json({ message: 'success', data: stats });
            }
        });
    });
});

console.log('✅ Rutas principales de asistencia registradas (shift-types, schedules, employee-schedules, attendance, summary, stats, check-in, check-out, overtime, leave-requests)');

// ===================================================================
// N�MINA CHILE - ENDPOINTS
// ===================================================================
try {
    const payrollRoutes = require('./routes/payroll-chile');
    payrollRoutes(app, db, authenticateToken, requireRole, toMySQLDateTime);
    console.log(' Rutas de N�mina Chile cargadas correctamente');
} catch (error) {
    console.warn(' No se pudieron cargar rutas de n�mina:', error.message);
}

// ===================================================================
// GESTIÓN DE PERÍODOS DE NÓMINA
// ===================================================================

// GET - Listar todos los períodos de nómina
app.get('/api/payroll-periods', authenticateToken, requireRole(['Admin', 'Manager', 'Finance']), async (req, res) => {
    try {
        const sql = `
            SELECT 
                pp.*,
                u1.username as closed_by_name,
                u2.username as approved_by_name
            FROM PayrollPeriods pp
            LEFT JOIN Users u1 ON pp.closed_by = u1.id
            LEFT JOIN Users u2 ON pp.approved_by = u2.id
            ORDER BY pp.start_date DESC
        `;
        
        db.all(sql, [], (err, periods) => {
            if (err) {
                console.error('❌ Error obteniendo períodos:', err);
                return res.status(500).json({ message: 'error', error: err.message });
            }
            
            console.log(`✅ Períodos de nómina obtenidos: ${periods.length}`);
            res.json({ message: 'success', data: periods });
        });
    } catch (error) {
        console.error('❌ Error en /api/payroll-periods:', error);
        res.status(500).json({ message: 'error', error: error.message });
    }
});

// POST - Cerrar período actual
app.post('/api/payroll-periods/close-current', authenticateToken, requireRole(['Admin', 'Manager']), async (req, res) => {
    try {
        const { period_name, start_date, end_date, notes } = req.body;
        const user_id = req.user.id;
        
        // Validar que no exista un período cerrado para esas fechas
        const checkSql = `
            SELECT * FROM PayrollPeriods 
            WHERE (start_date <= ? AND end_date >= ?) 
               OR (start_date <= ? AND end_date >= ?)
               OR (start_date >= ? AND end_date <= ?)
        `;
        
        db.get(checkSql, [start_date, start_date, end_date, end_date, start_date, end_date], async (err, existing) => {
            if (err) {
                console.error('❌ Error verificando período:', err);
                return res.status(500).json({ message: 'error', error: err.message });
            }
            
            if (existing) {
                return res.status(400).json({ 
                    message: 'error', 
                    error: 'Ya existe un período que se solapa con estas fechas' 
                });
            }
            
            // Calcular estadísticas del período
            const statsSql = `
                SELECT 
                    COUNT(DISTINCT user_id) as total_employees,
                    SUM(worked_hours) as total_hours,
                    SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as total_absences,
                    SUM(CASE WHEN is_late = 1 THEN 1 ELSE 0 END) as total_late
                FROM Attendance
                WHERE date >= ? AND date <= ?
            `;
            
            db.get(statsSql, [start_date, end_date], (err, stats) => {
                if (err) {
                    console.error('❌ Error calculando estadísticas:', err);
                    return res.status(500).json({ message: 'error', error: err.message });
                }
                
                // Calcular horas extras del período
                const overtimeSql = `
                    SELECT SUM(hours) as total_overtime
                    FROM Overtime
                    WHERE date >= ? AND date <= ? AND status = 'approved'
                `;
                
                db.get(overtimeSql, [start_date, end_date], (err, overtime) => {
                    if (err) {
                        console.error('❌ Error calculando horas extras:', err);
                        return res.status(500).json({ message: 'error', error: err.message });
                    }
                    
                    // Crear período
                    const insertSql = `
                        INSERT INTO PayrollPeriods (
                            period_name, start_date, end_date, status,
                            total_employees, total_hours_worked, total_overtime_hours,
                            total_absences, total_late_arrivals,
                            closed_by, closed_at, notes
                        ) VALUES (?, ?, ?, 'closed', ?, ?, ?, ?, ?, ?, datetime('now'), ?)
                    `;
                    
                    const params = [
                        period_name,
                        start_date,
                        end_date,
                        stats.total_employees || 0,
                        parseFloat(stats.total_hours || 0).toFixed(2),
                        parseFloat(overtime.total_overtime || 0).toFixed(2),
                        stats.total_absences || 0,
                        stats.total_late || 0,
                        user_id,
                        notes || null
                    ];
                    
                    db.run(insertSql, params, function(err) {
                        if (err) {
                            console.error('❌ Error creando período:', err);
                            return res.status(500).json({ message: 'error', error: err.message });
                        }
                        
                        const periodId = this.lastID;
                        
                        // Asignar período a registros de asistencia
                        const updateAttendanceSql = `
                            UPDATE Attendance 
                            SET payroll_period_id = ?
                            WHERE date >= ? AND date <= ?
                        `;
                        
                        db.run(updateAttendanceSql, [periodId, start_date, end_date], (err) => {
                            if (err) {
                                console.error('⚠️ Error asignando asistencias al período:', err);
                            }
                            
                            // Asignar período a horas extras aprobadas
                            const updateOvertimeSql = `
                                UPDATE Overtime 
                                SET payroll_period_id = ?
                                WHERE date >= ? AND date <= ? AND status = 'approved'
                            `;
                            
                            db.run(updateOvertimeSql, [periodId, start_date, end_date], (err) => {
                                if (err) {
                                    console.error('⚠️ Error asignando horas extras al período:', err);
                                }
                                
                                console.log(`✅ Período ${period_name} cerrado exitosamente (ID: ${periodId})`);
                                res.json({ 
                                    message: 'success', 
                                    data: { 
                                        id: periodId, 
                                        period_name,
                                        total_employees: stats.total_employees || 0,
                                        total_hours: parseFloat(stats.total_hours || 0).toFixed(2)
                                    } 
                                });
                            });
                        });
                    });
                });
            });
        });
    } catch (error) {
        console.error('❌ Error en /api/payroll-periods/close-current:', error);
        res.status(500).json({ message: 'error', error: error.message });
    }
});

// PATCH - Aprobar período
app.patch('/api/payroll-periods/:id/approve', authenticateToken, requireRole(['Admin']), (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const user_id = req.user.id;
        
        // Verificar que el período esté cerrado
        const checkSql = 'SELECT * FROM PayrollPeriods WHERE id = ?';
        
        db.get(checkSql, [id], (err, period) => {
            if (err) {
                console.error('❌ Error verificando período:', err);
                return res.status(500).json({ message: 'error', error: err.message });
            }
            
            if (!period) {
                return res.status(404).json({ message: 'error', error: 'Período no encontrado' });
            }
            
            if (period.status !== 'closed') {
                return res.status(400).json({ 
                    message: 'error', 
                    error: 'Solo se pueden aprobar períodos cerrados' 
                });
            }
            
            // Aprobar período
            const updateSql = `
                UPDATE PayrollPeriods
                SET status = 'approved',
                    approved_by = ?,
                    approved_at = datetime('now'),
                    notes = COALESCE(?, notes)
                WHERE id = ?
            `;
            
            db.run(updateSql, [user_id, notes, id], (err) => {
                if (err) {
                    console.error('❌ Error aprobando período:', err);
                    return res.status(500).json({ message: 'error', error: err.message });
                }
                
                console.log(`✅ Período ${id} aprobado por usuario ${user_id}`);
                res.json({ message: 'success', data: { id, status: 'approved' } });
            });
        });
    } catch (error) {
        console.error('❌ Error en /api/payroll-periods/:id/approve:', error);
        res.status(500).json({ message: 'error', error: error.message });
    }
});

// PATCH - Rechazar período
app.patch('/api/payroll-periods/:id/reject', authenticateToken, requireRole(['Admin']), (req, res) => {
    try {
        const { id } = req.params;
        const { rejection_reason } = req.body;
        
        if (!rejection_reason) {
            return res.status(400).json({ 
                message: 'error', 
                error: 'Debe proporcionar una razón de rechazo' 
            });
        }
        
        // Verificar que el período exista
        const checkSql = 'SELECT * FROM PayrollPeriods WHERE id = ?';
        
        db.get(checkSql, [id], (err, period) => {
            if (err) {
                console.error('❌ Error verificando período:', err);
                return res.status(500).json({ message: 'error', error: err.message });
            }
            
            if (!period) {
                return res.status(404).json({ message: 'error', error: 'Período no encontrado' });
            }
            
            // Rechazar período y liberar registros
            const updatePeriodSql = `
                UPDATE PayrollPeriods
                SET status = 'rejected',
                    rejection_reason = ?
                WHERE id = ?
            `;
            
            db.run(updatePeriodSql, [rejection_reason, id], (err) => {
                if (err) {
                    console.error('❌ Error rechazando período:', err);
                    return res.status(500).json({ message: 'error', error: err.message });
                }
                
                // Liberar registros de asistencia
                const freeAttendanceSql = 'UPDATE Attendance SET payroll_period_id = NULL WHERE payroll_period_id = ?';
                db.run(freeAttendanceSql, [id], (err) => {
                    if (err) {
                        console.error('⚠️ Error liberando asistencias:', err);
                    }
                    
                    // Liberar horas extras
                    const freeOvertimeSql = 'UPDATE Overtime SET payroll_period_id = NULL WHERE payroll_period_id = ?';
                    db.run(freeOvertimeSql, [id], (err) => {
                        if (err) {
                            console.error('⚠️ Error liberando horas extras:', err);
                        }
                        
                        console.log(`✅ Período ${id} rechazado. Registros liberados para corrección.`);
                        res.json({ message: 'success', data: { id, status: 'rejected' } });
                    });
                });
            });
        });
    } catch (error) {
        console.error('❌ Error en /api/payroll-periods/:id/reject:', error);
        res.status(500).json({ message: 'error', error: error.message });
    }
});

// GET - Obtener detalles de un período
app.get('/api/payroll-periods/:id/details', authenticateToken, requireRole(['Admin', 'Manager', 'Finance']), (req, res) => {
    try {
        const { id } = req.params;
        
        // Obtener información del período
        const periodSql = `
            SELECT 
                pp.*,
                u1.username as closed_by_name,
                u2.username as approved_by_name
            FROM PayrollPeriods pp
            LEFT JOIN Users u1 ON pp.closed_by = u1.id
            LEFT JOIN Users u2 ON pp.approved_by = u2.id
            WHERE pp.id = ?
        `;
        
        db.get(periodSql, [id], (err, period) => {
            if (err) {
                console.error('❌ Error obteniendo período:', err);
                return res.status(500).json({ message: 'error', error: err.message });
            }
            
            if (!period) {
                return res.status(404).json({ message: 'error', error: 'Período no encontrado' });
            }
            
            // Obtener resumen por empleado
            const summarySql = `
                SELECT 
                    u.id as user_id,
                    u.username,
                    COUNT(DISTINCT a.date) as days_worked,
                    SUM(a.worked_hours) as hours_worked,
                    SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absences,
                    SUM(CASE WHEN a.is_late = 1 THEN 1 ELSE 0 END) as late_arrivals,
                    COALESCE(SUM(ot.hours), 0) as overtime_hours,
                    COALESCE(SUM(ot.total_amount), 0) as overtime_amount
                FROM Users u
                LEFT JOIN Attendance a ON u.id = a.user_id AND a.payroll_period_id = ?
                LEFT JOIN Overtime ot ON u.id = ot.user_id AND ot.payroll_period_id = ? AND ot.status = 'approved'
                WHERE u.is_active = 1
                GROUP BY u.id, u.username
                HAVING days_worked > 0 OR overtime_hours > 0
            `;
            
            db.all(summarySql, [id, id], (err, summary) => {
                if (err) {
                    console.error('❌ Error obteniendo resumen:', err);
                    return res.json({ message: 'success', data: { period, summary: [] } });
                }
                
                res.json({ message: 'success', data: { period, summary } });
            });
        });
    } catch (error) {
        console.error('❌ Error en /api/payroll-periods/:id/details:', error);
        res.status(500).json({ message: 'error', error: error.message });
    }
});

// GET - Exportar período a CSV
app.get('/api/payroll-periods/:id/export', authenticateToken, requireRole(['Admin', 'Finance']), (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que el período esté aprobado
        const checkSql = 'SELECT * FROM PayrollPeriods WHERE id = ?';
        
        db.get(checkSql, [id], (err, period) => {
            if (err) {
                console.error('❌ Error verificando período:', err);
                return res.status(500).json({ message: 'error', error: err.message });
            }
            
            if (!period) {
                return res.status(404).json({ message: 'error', error: 'Período no encontrado' });
            }
            
            if (period.status !== 'approved') {
                return res.status(403).json({ 
                    message: 'error', 
                    error: 'Solo se pueden exportar períodos aprobados' 
                });
            }
            
            // Obtener datos para exportación
            const exportSql = `
                SELECT 
                    u.id as user_id,
                    u.username,
                    u.email,
                    COUNT(DISTINCT a.date) as dias_trabajados,
                    COALESCE(SUM(a.worked_hours), 0) as horas_regulares,
                    COALESCE(SUM(ot.hours), 0) as horas_extras,
                    COALESCE(SUM(ot.total_amount), 0) as monto_horas_extras,
                    SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as ausencias,
                    SUM(CASE WHEN a.is_late = 1 THEN 1 ELSE 0 END) as llegadas_tardes,
                    SUM(a.late_minutes) as minutos_tarde_total
                FROM Users u
                LEFT JOIN Attendance a ON u.id = a.user_id AND a.payroll_period_id = ?
                LEFT JOIN Overtime ot ON u.id = ot.user_id AND ot.payroll_period_id = ? AND ot.status = 'approved'
                WHERE u.is_active = 1
                GROUP BY u.id, u.username, u.email
                HAVING dias_trabajados > 0 OR horas_extras > 0
                ORDER BY u.username
            `;
            
            db.all(exportSql, [id, id], (err, data) => {
                if (err) {
                    console.error('❌ Error obteniendo datos de exportación:', err);
                    return res.status(500).json({ message: 'error', error: err.message });
                }
                
                // Generar CSV
                let csv = 'Usuario,Email,Días Trabajados,Horas Regulares,Horas Extras,Monto HH.EE,Ausencias,Tardanzas,Min. Tarde\n';
                
                data.forEach(row => {
                    csv += `"${row.username}","${row.email}",${row.dias_trabajados},${parseFloat(row.horas_regulares).toFixed(2)},`;
                    csv += `${parseFloat(row.horas_extras).toFixed(2)},${parseFloat(row.monto_horas_extras).toFixed(0)},`;
                    csv += `${row.ausencias},${row.llegadas_tardes},${row.minutos_tarde_total || 0}\n`;
                });
                
                // Enviar como descarga
                res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="nomina_${period.period_name.replace(/ /g, '_')}.csv"`);
                res.send('\uFEFF' + csv); // BOM para UTF-8
                
                console.log(`✅ Período ${id} exportado exitosamente`);
            });
        });
    } catch (error) {
        console.error('❌ Error en /api/payroll-periods/:id/export:', error);
        res.status(500).json({ message: 'error', error: error.message });
    }
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
        console.log('   ⏰ /api/attendance/* (Control de Asistencia)');
        console.log('   📅 /api/schedules/* (Horarios y Turnos)');
        console.log('   ⏳ /api/overtime/* (Horas Extras)');
        console.log('   📋 /api/leave-requests/* (Solicitudes de Permiso)');
        console.log('🚀 ========================================\n');
        
        try {
            console.log('🔄 Inicializando servicios de background...');
            console.log('✅ Servicios de background iniciados correctamente');
        } catch (error) {
            console.warn('⚠️  Warning: Algunos servicios de background no pudieron iniciarse:', error.message);
        }
    });
}

// ===================================================================
// MÓDULO DE ASISTENCIA Y CONTROL HORARIO - BLOQUE DUPLICADO COMENTADO
// ===================================================================
// NOTA: Las rutas de asistencia están ahora definidas ANTES del error handler (línea ~5030)
// Este bloque duplicado ha sido comentado para evitar conflictos
/*
console.log('🔄 Registrando rutas del módulo de asistencia...');

// ===================================================================
// TIPOS DE TURNO
// ===================================================================

// GET - Obtener todos los tipos de turno
app.get('/api/shift-types', authenticateToken, (req, res) => {
    const sql = 'SELECT * FROM ShiftTypes WHERE is_active = 1 ORDER BY name';
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error obteniendo tipos de turno:', err);
            return res.status(500).json({ error: 'Error al obtener tipos de turno' });
        }
        res.json({ message: 'success', data: rows });
    });
});

// POST - Crear tipo de turno
app.post('/api/shift-types', authenticateToken, requireRole(['Admin']), (req, res) => {
    const { name, description, color } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    const sql = `INSERT INTO ShiftTypes (name, description, color) VALUES (?, ?, ?)`;
    
    db.run(sql, [name, description, color || '#3B82F6'], function(err) {
        if (err) {
            console.error('Error creando tipo de turno:', err);
            return res.status(500).json({ error: 'Error al crear tipo de turno' });
        }
        res.json({ 
            message: 'success',
            data: { id: this.lastID, name, description, color }
        });
    });
});

// ===================================================================
// HORARIOS DE TRABAJO
// ===================================================================

// GET - Obtener todos los horarios
app.get('/api/work-schedules', authenticateToken, (req, res) => {
    const sql = `
        SELECT ws.*, st.name as shift_type_name, st.color as shift_type_color
        FROM WorkSchedules ws
        LEFT JOIN ShiftTypes st ON ws.shift_type_id = st.id
        WHERE ws.is_active = 1
        ORDER BY ws.name
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error obteniendo horarios:', err);
            return res.status(500).json({ error: 'Error al obtener horarios' });
        }
        res.json({ message: 'success', data: rows });
    });
});

// GET - Obtener horario por ID
app.get('/api/work-schedules/:id', authenticateToken, (req, res) => {
    const sql = `
        SELECT ws.*, st.name as shift_type_name
        FROM WorkSchedules ws
        LEFT JOIN ShiftTypes st ON ws.shift_type_id = st.id
        WHERE ws.id = ?
    `;
    
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            console.error('Error obteniendo horario:', err);
            return res.status(500).json({ error: 'Error al obtener horario' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Horario no encontrado' });
        }
        res.json({ message: 'success', data: row });
    });
});

// POST - Crear horario
app.post('/api/work-schedules', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const {
        name, description, shift_type_id,
        monday_enabled, monday_start, monday_end, monday_break_duration,
        tuesday_enabled, tuesday_start, tuesday_end, tuesday_break_duration,
        wednesday_enabled, wednesday_start, wednesday_end, wednesday_break_duration,
        thursday_enabled, thursday_start, thursday_end, thursday_break_duration,
        friday_enabled, friday_start, friday_end, friday_break_duration,
        saturday_enabled, saturday_start, saturday_end, saturday_break_duration,
        sunday_enabled, sunday_start, sunday_end, sunday_break_duration,
        weekly_hours, tolerance_minutes
    } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    const sql = `
        INSERT INTO WorkSchedules (
            name, description, shift_type_id,
            monday_enabled, monday_start, monday_end, monday_break_duration,
            tuesday_enabled, tuesday_start, tuesday_end, tuesday_break_duration,
            wednesday_enabled, wednesday_start, wednesday_end, wednesday_break_duration,
            thursday_enabled, thursday_start, thursday_end, thursday_break_duration,
            friday_enabled, friday_start, friday_end, friday_break_duration,
            saturday_enabled, saturday_start, saturday_end, saturday_break_duration,
            sunday_enabled, sunday_start, sunday_end, sunday_break_duration,
            weekly_hours, tolerance_minutes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
        name, description, shift_type_id,
        monday_enabled || 0, monday_start, monday_end, monday_break_duration || 0,
        tuesday_enabled || 0, tuesday_start, tuesday_end, tuesday_break_duration || 0,
        wednesday_enabled || 0, wednesday_start, wednesday_end, wednesday_break_duration || 0,
        thursday_enabled || 0, thursday_start, thursday_end, thursday_break_duration || 0,
        friday_enabled || 0, friday_start, friday_end, friday_break_duration || 0,
        saturday_enabled || 0, saturday_start, saturday_end, saturday_break_duration || 0,
        sunday_enabled || 0, sunday_start, sunday_end, sunday_break_duration || 0,
        weekly_hours || 0, tolerance_minutes || 15
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error creando horario:', err);
            return res.status(500).json({ error: 'Error al crear horario' });
        }
        res.json({ message: 'success', data: { id: this.lastID } });
    });
});

// PUT - Actualizar horario
app.put('/api/work-schedules/:id', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const {
        name, description, shift_type_id,
        monday_enabled, monday_start, monday_end, monday_break_duration,
        tuesday_enabled, tuesday_start, tuesday_end, tuesday_break_duration,
        wednesday_enabled, wednesday_start, wednesday_end, wednesday_break_duration,
        thursday_enabled, thursday_start, thursday_end, thursday_break_duration,
        friday_enabled, friday_start, friday_end, friday_break_duration,
        saturday_enabled, saturday_start, saturday_end, saturday_break_duration,
        sunday_enabled, sunday_start, sunday_end, sunday_break_duration,
        weekly_hours, tolerance_minutes
    } = req.body;
    
    const sql = `
        UPDATE WorkSchedules SET
            name = ?, description = ?, shift_type_id = ?,
            monday_enabled = ?, monday_start = ?, monday_end = ?, monday_break_duration = ?,
            tuesday_enabled = ?, tuesday_start = ?, tuesday_end = ?, tuesday_break_duration = ?,
            wednesday_enabled = ?, wednesday_start = ?, wednesday_end = ?, wednesday_break_duration = ?,
            thursday_enabled = ?, thursday_start = ?, thursday_end = ?, thursday_break_duration = ?,
            friday_enabled = ?, friday_start = ?, friday_end = ?, friday_break_duration = ?,
            saturday_enabled = ?, saturday_start = ?, saturday_end = ?, saturday_break_duration = ?,
            sunday_enabled = ?, sunday_start = ?, sunday_end = ?, sunday_break_duration = ?,
            weekly_hours = ?, tolerance_minutes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    
    const params = [
        name, description, shift_type_id,
        monday_enabled || 0, monday_start, monday_end, monday_break_duration || 0,
        tuesday_enabled || 0, tuesday_start, tuesday_end, tuesday_break_duration || 0,
        wednesday_enabled || 0, wednesday_start, wednesday_end, wednesday_break_duration || 0,
        thursday_enabled || 0, thursday_start, thursday_end, thursday_break_duration || 0,
        friday_enabled || 0, friday_start, friday_end, friday_break_duration || 0,
        saturday_enabled || 0, saturday_start, saturday_end, saturday_break_duration || 0,
        sunday_enabled || 0, sunday_start, sunday_end, sunday_break_duration || 0,
        weekly_hours || 0, tolerance_minutes || 15,
        req.params.id
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error actualizando horario:', err);
            return res.status(500).json({ error: 'Error al actualizar horario' });
        }
        res.json({ message: 'success' });
    });
});

// DELETE - Desactivar horario
app.delete('/api/work-schedules/:id', authenticateToken, requireRole(['Admin']), (req, res) => {
    const sql = 'UPDATE WorkSchedules SET is_active = 0 WHERE id = ?';
    
    db.run(sql, [req.params.id], function(err) {
        if (err) {
            console.error('Error desactivando horario:', err);
            return res.status(500).json({ error: 'Error al desactivar horario' });
        }
        res.json({ message: 'success' });
    });
});

// ===================================================================
// ASIGNACIÓN DE HORARIOS A EMPLEADOS
// ===================================================================

// GET - Obtener horarios de un empleado
app.get('/api/employee-schedules/:userId', authenticateToken, (req, res) => {
    const sql = `
        SELECT es.*, ws.name as schedule_name, ws.weekly_hours,
               u.username, st.name as shift_type_name
        FROM EmployeeSchedules es
        JOIN WorkSchedules ws ON es.schedule_id = ws.id
        JOIN Users u ON es.user_id = u.id
        LEFT JOIN ShiftTypes st ON ws.shift_type_id = st.id
        WHERE es.user_id = ?
        ORDER BY es.start_date DESC
    `;
    
    db.all(sql, [req.params.userId], (err, rows) => {
        if (err) {
            console.error('Error obteniendo horarios del empleado:', err);
            return res.status(500).json({ error: 'Error al obtener horarios' });
        }
        res.json({ message: 'success', data: rows });
    });
});

// GET - Obtener horario activo de un empleado
app.get('/api/employee-schedules/:userId/active', authenticateToken, (req, res) => {
    const sql = `
        SELECT es.*, ws.*, st.name as shift_type_name
        FROM EmployeeSchedules es
        JOIN WorkSchedules ws ON es.schedule_id = ws.id
        LEFT JOIN ShiftTypes st ON ws.shift_type_id = st.id
        WHERE es.user_id = ?
          AND es.is_active = 1
          AND CURDATE() >= es.start_date
          AND (es.end_date IS NULL OR CURDATE() <= es.end_date)
        ORDER BY es.start_date DESC
        LIMIT 1
    `;
    
    db.get(sql, [req.params.userId], (err, row) => {
        if (err) {
            console.error('Error obteniendo horario activo:', err);
            return res.status(500).json({ error: 'Error al obtener horario activo' });
        }
        res.json({ message: 'success', data: row });
    });
});

// POST - Asignar horario a empleado
app.post('/api/employee-schedules', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const { user_id, schedule_id, start_date, end_date, notes } = req.body;
    
    if (!user_id || !schedule_id || !start_date) {
        return res.status(400).json({ error: 'Datos incompletos' });
    }
    
    const sql = `
        INSERT INTO EmployeeSchedules (user_id, schedule_id, start_date, end_date, notes)
        VALUES (?, ?, ?, ?, ?)
    `;
    
    db.run(sql, [user_id, schedule_id, start_date, end_date, notes], function(err) {
        if (err) {
            console.error('Error asignando horario:', err);
            return res.status(500).json({ error: 'Error al asignar horario' });
        }
        res.json({ message: 'success', data: { id: this.lastID } });
    });
});

// ===================================================================
// ASISTENCIA
// ===================================================================

// GET - Obtener asistencias (con filtros)
app.get('/api/attendance', authenticateToken, (req, res) => {
    const { user_id, date_from, date_to, status } = req.query;
    
    let sql = `
        SELECT a.*, u.username, u.role_id,
               ws.name as schedule_name
        FROM Attendance a
        JOIN Users u ON a.user_id = u.id
        LEFT JOIN EmployeeSchedules es ON es.user_id = u.id 
            AND a.date BETWEEN es.start_date AND COALESCE(es.end_date, '9999-12-31')
            AND es.is_active = 1
        LEFT JOIN WorkSchedules ws ON es.schedule_id = ws.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (user_id) {
        sql += ' AND a.user_id = ?';
        params.push(user_id);
    }
    
    if (date_from) {
        sql += ' AND a.date >= ?';
        params.push(date_from);
    }
    
    if (date_to) {
        sql += ' AND a.date <= ?';
        params.push(date_to);
    }
    
    if (status) {
        sql += ' AND a.status = ?';
        params.push(status);
    }
    
    sql += ' ORDER BY a.date DESC, u.username';
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Error obteniendo asistencias:', err);
            return res.status(500).json({ error: 'Error al obtener asistencias' });
        }
        res.json({ message: 'success', data: rows });
    });
});

// GET - Obtener asistencia de hoy del usuario actual
app.get('/api/attendance/today', authenticateToken, (req, res) => {
    const sql = `
        SELECT a.*, ws.name as schedule_name,
               ws.tolerance_minutes
        FROM Attendance a
        LEFT JOIN EmployeeSchedules es ON es.user_id = a.user_id 
            AND a.date BETWEEN es.start_date AND COALESCE(es.end_date, '9999-12-31')
            AND es.is_active = 1
        LEFT JOIN WorkSchedules ws ON es.schedule_id = ws.id
        WHERE a.user_id = ? AND a.date = CURDATE()
    `;
    
    db.get(sql, [req.user.id], (err, row) => {
        if (err) {
            console.error('Error obteniendo asistencia de hoy:', err);
            return res.status(500).json({ error: 'Error al obtener asistencia' });
        }
        res.json({ message: 'success', data: row });
    });
});

// POST - Marcar entrada (check-in)
app.post('/api/attendance/check-in', authenticateToken, (req, res) => {
    const { location, notes } = req.body;
    const user_id = req.user.id;
    const ip = req.ip || req.connection.remoteAddress;
    
    // Verificar si ya marcó entrada hoy
    const checkSql = 'SELECT * FROM Attendance WHERE user_id = ? AND date = CURDATE()';
    
    db.get(checkSql, [user_id], (err, existing) => {
        if (err) {
            console.error('Error verificando asistencia:', err);
            return res.status(500).json({ error: 'Error al verificar asistencia' });
        }
        
        if (existing && existing.check_in_time) {
            return res.status(400).json({ 
                error: 'Ya has marcado tu entrada hoy',
                data: existing
            });
        }
        
        // Obtener horario del empleado para calcular tardanza
        const scheduleSql = `
            SELECT ws.*, 
                   CASE DAYOFWEEK(NOW())
                       WHEN 2 THEN ws.monday_start
                       WHEN 3 THEN ws.tuesday_start
                       WHEN 4 THEN ws.wednesday_start
                       WHEN 5 THEN ws.thursday_start
                       WHEN 6 THEN ws.friday_start
                       WHEN 7 THEN ws.saturday_start
                       WHEN 1 THEN ws.sunday_start
                   END as scheduled_start
            FROM EmployeeSchedules es
            JOIN WorkSchedules ws ON es.schedule_id = ws.id
            WHERE es.user_id = ?
              AND es.is_active = 1
              AND CURDATE() >= es.start_date
              AND (es.end_date IS NULL OR CURDATE() <= es.end_date)
            LIMIT 1
        `;
        
        db.get(scheduleSql, [user_id], (err, schedule) => {
            const now = new Date();
            const nowTime = now.toISOString();
            let is_late = 0;
            let late_minutes = 0;
            let status = 'present';
            
            if (schedule && schedule.scheduled_start) {
                const scheduledStart = new Date();
                const [hours, minutes] = schedule.scheduled_start.split(':');
                scheduledStart.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
                
                const tolerance = (schedule.tolerance_minutes || 15) * 60 * 1000;
                const diff = now - scheduledStart;
                
                if (diff > tolerance) {
                    is_late = 1;
                    late_minutes = Math.floor(diff / 60000);
                    status = 'late';
                }
            }
            
            if (existing) {
                // Actualizar registro existente
                const updateSql = `
                    UPDATE Attendance SET
                        check_in_time = ?,
                        check_in_location = ?,
                        check_in_notes = ?,
                        check_in_ip = ?,
                        is_late = ?,
                        late_minutes = ?,
                        status = ?
                    WHERE id = ?
                `;
                
                db.run(updateSql, [nowTime, location, notes, ip, is_late, late_minutes, status, existing.id], function(err) {
                    if (err) {
                        console.error('Error actualizando entrada:', err);
                        return res.status(500).json({ error: 'Error al marcar entrada' });
                    }
                    res.json({ message: 'Entrada registrada correctamente', data: { id: existing.id, is_late, late_minutes } });
                });
            } else {
                // Crear nuevo registro
                const insertSql = `
                    INSERT INTO Attendance (
                        user_id, date, check_in_time, check_in_location, check_in_notes, check_in_ip,
                        is_late, late_minutes, status, scheduled_hours
                    ) VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                
                const scheduled_hours = schedule ? schedule.weekly_hours / 5 : 8; // Aproximación
                
                db.run(insertSql, [user_id, nowTime, location, notes, ip, is_late, late_minutes, status, scheduled_hours], function(err) {
                    if (err) {
                        console.error('Error creando entrada:', err);
                        return res.status(500).json({ error: 'Error al marcar entrada' });
                    }
                    res.json({ message: 'Entrada registrada correctamente', data: { id: this.lastID, is_late, late_minutes } });
                });
            }
        });
    });
});

// POST - Marcar salida (check-out)
app.post('/api/attendance/check-out', authenticateToken, (req, res) => {
    const { location, notes } = req.body;
    const user_id = req.user.id;
    const ip = req.ip || req.connection.remoteAddress;
    
    // Obtener registro de hoy
    const getSql = 'SELECT * FROM Attendance WHERE user_id = ? AND date = DATE("now")';
    
    db.get(getSql, [user_id], (err, attendance) => {
        if (err) {
            console.error('Error obteniendo asistencia:', err);
            return res.status(500).json({ error: 'Error al obtener asistencia' });
        }
        
        if (!attendance) {
            return res.status(400).json({ error: 'No has marcado entrada hoy' });
        }
        
        if (attendance.check_out_time) {
            return res.status(400).json({ error: 'Ya has marcado tu salida hoy' });
        }
        
        const now = new Date();
        const check_in = new Date(attendance.check_in_time);
        const worked_hours = (now - check_in) / (1000 * 60 * 60); // Horas trabajadas
        
        const updateSql = `
            UPDATE Attendance SET
                check_out_time = ?,
                check_out_location = ?,
                check_out_notes = ?,
                check_out_ip = ?,
                worked_hours = ?
            WHERE id = ?
        `;
        
        db.run(updateSql, [toMySQLDateTime(now), location, notes, ip, worked_hours.toFixed(2), attendance.id], function(err) {
            if (err) {
                console.error('Error marcando salida:', err);
                return res.status(500).json({ error: 'Error al marcar salida' });
            }
            res.json({ 
                message: 'Salida registrada correctamente',
                data: { worked_hours: worked_hours.toFixed(2) }
            });
        });
    });
});

// ===================================================================
// HORAS EXTRAS
// ===================================================================

// GET - Obtener horas extras
app.get('/api/overtime', authenticateToken, (req, res) => {
    const { user_id, status, date_from, date_to } = req.query;
    
    let sql = `
        SELECT o.*, u.username,
               requester.username as requested_by_name,
               approver.username as approved_by_name
        FROM Overtime o
        JOIN Users u ON o.user_id = u.id
        LEFT JOIN Users requester ON o.requested_by = requester.id
        LEFT JOIN Users approver ON o.approved_by = approver.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (user_id) {
        sql += ' AND o.user_id = ?';
        params.push(user_id);
    }
    
    if (status) {
        sql += ' AND o.status = ?';
        params.push(status);
    }
    
    if (date_from) {
        sql += ' AND o.date >= ?';
        params.push(date_from);
    }
    
    if (date_to) {
        sql += ' AND o.date <= ?';
        params.push(date_to);
    }
    
    sql += ' ORDER BY o.date DESC, o.start_time DESC';
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Error obteniendo horas extras:', err);
            return res.status(500).json({ error: 'Error al obtener horas extras' });
        }
        res.json({ message: 'success', data: rows });
    });
});

// POST - Registrar horas extras
app.post('/api/overtime', authenticateToken, (req, res) => {
    const { 
        user_id, date, start_time, end_time, type, description, reason,
        hourly_rate
    } = req.body;
    
    if (!user_id || !date || !start_time || !end_time) {
        return res.status(400).json({ error: 'Datos incompletos' });
    }
    
    // Calcular horas
    const start = new Date(`${date}T${start_time}`);
    const end = new Date(`${date}T${end_time}`);
    const hours = (end - start) / (1000 * 60 * 60);
    
    // Determinar multiplicador según tipo
    let multiplier = 1.5;
    if (type === 'night') multiplier = 2.0;
    if (type === 'holiday') multiplier = 2.0;
    if (type === 'sunday') multiplier = 1.8;
    
    const total_amount = hourly_rate ? (hours * hourly_rate * multiplier).toFixed(2) : 0;
    
    const sql = `
        INSERT INTO Overtime (
            user_id, date, start_time, end_time, hours,
            type, multiplier, description, reason,
            hourly_rate, total_amount, requested_by, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(sql, [
        user_id, date, start_time, end_time, hours.toFixed(2),
        type || 'regular', multiplier, description, reason,
        hourly_rate || 0, total_amount, req.user.id, 'pending'
    ], function(err) {
        if (err) {
            console.error('Error registrando horas extras:', err);
            return res.status(500).json({ error: 'Error al registrar horas extras' });
        }
        res.json({ message: 'success', data: { id: this.lastID, hours: hours.toFixed(2), total_amount } });
    });
});

// PUT - Aprobar/Rechazar horas extras
app.put('/api/overtime/:id/status', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const { status, rejection_reason } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' });
    }
    
    const sql = `
        UPDATE Overtime SET
            status = ?,
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP,
            rejection_reason = ?
        WHERE id = ?
    `;
    
    db.run(sql, [status, req.user.id, rejection_reason, req.params.id], function(err) {
        if (err) {
            console.error('Error actualizando estado de horas extras:', err);
            return res.status(500).json({ error: 'Error al actualizar estado' });
        }
        res.json({ message: 'success' });
    });
});

// ===================================================================
// SOLICITUDES DE PERMISO/VACACIONES
// ===================================================================

// GET - Obtener solicitudes de permiso
app.get('/api/leave-requests', authenticateToken, (req, res) => {
    const { user_id, status } = req.query;
    
    let sql = `
        SELECT lr.*, u.username,
               approver.username as approved_by_name,
               replacement.username as replacement_name
        FROM LeaveRequests lr
        JOIN Users u ON lr.user_id = u.id
        LEFT JOIN Users approver ON lr.approved_by = approver.id
        LEFT JOIN Users replacement ON lr.replacement_user_id = replacement.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (user_id) {
        sql += ' AND lr.user_id = ?';
        params.push(user_id);
    }
    
    if (status) {
        sql += ' AND lr.status = ?';
        params.push(status);
    }
    
    sql += ' ORDER BY lr.start_date DESC';
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Error obteniendo solicitudes de permiso:', err);
            return res.status(500).json({ error: 'Error al obtener solicitudes' });
        }
        res.json({ message: 'success', data: rows });
    });
});

// POST - Crear solicitud de permiso
app.post('/api/leave-requests', authenticateToken, (req, res) => {
    const {
        start_date, end_date, days_requested, type, reason,
        has_documentation, documentation_file, replacement_user_id
    } = req.body;
    
    if (!start_date || !end_date || !type) {
        return res.status(400).json({ error: 'Datos incompletos' });
    }
    
    const sql = `
        INSERT INTO LeaveRequests (
            user_id, start_date, end_date, days_requested,
            type, reason, has_documentation, documentation_file,
            replacement_user_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(sql, [
        req.user.id, start_date, end_date, days_requested || 1,
        type, reason, has_documentation || 0, documentation_file,
        replacement_user_id, 'pending'
    ], function(err) {
        if (err) {
            console.error('Error creando solicitud de permiso:', err);
            return res.status(500).json({ error: 'Error al crear solicitud' });
        }
        res.json({ message: 'success', data: { id: this.lastID } });
    });
});

// PUT - Aprobar/Rechazar solicitud de permiso
app.put('/api/leave-requests/:id/status', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const { status, rejection_reason } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' });
    }
    
    const sql = `
        UPDATE LeaveRequests SET
            status = ?,
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP,
            rejection_reason = ?
        WHERE id = ?
    `;
    
    db.run(sql, [status, req.user.id, rejection_reason, req.params.id], function(err) {
        if (err) {
            console.error('Error actualizando solicitud:', err);
            return res.status(500).json({ error: 'Error al actualizar solicitud' });
        }
        res.json({ message: 'success' });
    });
});

// ===================================================================
// DÍAS FESTIVOS
// ===================================================================

// GET - Obtener días festivos
app.get('/api/holidays', authenticateToken, (req, res) => {
    const { year } = req.query;
    
    let sql = 'SELECT * FROM Holidays WHERE 1=1';
    const params = [];
    
    if (year) {
        sql += ' AND YEAR(date) = ?';
        params.push(year);
    }
    
    sql += ' ORDER BY date';
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Error obteniendo días festivos:', err);
            return res.status(500).json({ error: 'Error al obtener días festivos' });
        }
        res.json({ message: 'success', data: rows });
    });
});

// POST - Crear día festivo
app.post('/api/holidays', authenticateToken, requireRole(['Admin']), (req, res) => {
    const { name, date, type, is_paid, description } = req.body;
    
    if (!name || !date) {
        return res.status(400).json({ error: 'Nombre y fecha son requeridos' });
    }
    
    const sql = `
        INSERT INTO Holidays (name, date, type, is_paid, description)
        VALUES (?, ?, ?, ?, ?)
    `;
    
    db.run(sql, [name, date, type || 'national', is_paid !== false ? 1 : 0, description], function(err) {
        if (err) {
            console.error('Error creando día festivo:', err);
            return res.status(500).json({ error: 'Error al crear día festivo' });
        }
        res.json({ message: 'success', data: { id: this.lastID } });
    });
});

// ===================================================================
// REPORTES DE ASISTENCIA
// ===================================================================

// GET - Resumen de asistencia por empleado
app.get('/api/attendance/summary/:userId', authenticateToken, (req, res) => {
    const { month, year } = req.query;
    
    let sql = `
        SELECT 
            COUNT(*) as total_days,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
            SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
            SUM(CASE WHEN is_late = 1 THEN 1 ELSE 0 END) as late_days,
            SUM(late_minutes) as total_late_minutes,
            SUM(worked_hours) as total_worked_hours,
            AVG(worked_hours) as avg_worked_hours
        FROM Attendance
        WHERE user_id = ?
    `;
    
    const params = [req.params.userId];
    
    if (month && year) {
        sql += ' AND MONTH(date) = ? AND YEAR(date) = ?';
        params.push(month, year);
    }
    
    db.get(sql, params, (err, row) => {
        if (err) {
            console.error('Error obteniendo resumen de asistencia:', err);
            return res.status(500).json({ error: 'Error al obtener resumen' });
        }
        res.json({ message: 'success', data: row });
    });
});

// GET - Estadísticas generales de asistencia
app.get('/api/attendance/stats', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const sql = `
        SELECT 
            COUNT(DISTINCT user_id) as total_employees,
            COUNT(*) as total_records,
            SUM(CASE WHEN date = CURDATE() THEN 1 ELSE 0 END) as today_present,
            SUM(CASE WHEN date = CURDATE() AND check_in_time IS NOT NULL AND check_out_time IS NULL THEN 1 ELSE 0 END) as currently_working,
            SUM(CASE WHEN is_late = 1 THEN 1 ELSE 0 END) as total_late
        FROM Attendance
        WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `;
    
    db.get(sql, [], (err, row) => {
        if (err) {
            console.error('Error obteniendo estadísticas:', err);
            return res.status(500).json({ error: 'Error al obtener estadísticas' });
        }
        res.json({ message: 'success', data: row });
    });
});
*/
// FIN DEL BLOQUE DUPLICADO COMENTADO
// ===================================================================

// =====================================================
// ENDPOINTS DE INFORMES TÉCNICOS
// =====================================================

// Obtener datos completos para informe
app.get('/api/tickets/:id/informe-data', authenticateToken, (req, res) => {
    const ticketId = req.params.id;
    console.log('📄 Solicitando datos para informe del ticket ' + ticketId);
    
    const queries = {
        ticket: 'SELECT t.*, c.name as client_name, c.rut as client_rut, c.contact_name as client_contact, c.phone as client_phone, l.name as location_name, l.address as location_address, em.name as equipment_model, em.category as equipment_type, e.serial_number, u.username as technician_name FROM Tickets t LEFT JOIN Clients c ON t.client_id = c.id LEFT JOIN Locations l ON t.location_id = l.id LEFT JOIN Equipment e ON t.equipment_id = e.id LEFT JOIN EquipmentModels em ON e.model_id = em.id LEFT JOIN Users u ON t.assigned_technician_id = u.id WHERE t.id = ?',
        comments: 'SELECT tc.id, tc.ticket_id, tc.note AS comment_text, tc.author AS author_name, tc.created_at FROM TicketNotes tc WHERE tc.ticket_id = ? ORDER BY tc.created_at ASC',
        photos: 'SELECT id, photo_data AS photo_base64, created_at AS uploaded_at FROM TicketPhotos WHERE ticket_id = ? ORDER BY created_at ASC'
    };
    
    Promise.all([
        new Promise((resolve, reject) => db.get(queries.ticket, [ticketId], (err, row) => err ? reject(err) : resolve(row))),
        new Promise((resolve, reject) => db.all(queries.comments, [ticketId], (err, rows) => err ? reject(err) : resolve(rows || []))),
        new Promise((resolve, reject) => db.all(queries.photos, [ticketId], (err, rows) => err ? reject(err) : resolve(rows || [])))
    ])
    .then(([ticket, comments, photos]) => {
        if (!ticket) return res.status(404).json({ message: 'error', error: 'Ticket no encontrado' });
        console.log('✅ Datos obtenidos: ' + comments.length + ' comentarios, ' + photos.length + ' fotos');
        res.json({ message: 'success', data: { ticket, comments, photos } });
    })
    .catch(error => {
        console.error('❌ Error:', error);
        res.status(500).json({ message: 'error', error: error.message });
    });
});

// Registrar informe generado
app.post('/api/informes', authenticateToken, (req, res) => {
    const { ticket_id, diagnosis, solution, recommendations } = req.body;
    const sql = 'INSERT INTO InformesTecnicos (ticket_id, technician_id, diagnosis, solution, recommendations) VALUES (?, ?, ?, ?, ?)';
    
    db.run(sql, [ticket_id, req.user.id, diagnosis || null, solution || null, recommendations || null], function(err) {
        if (err) return res.status(500).json({ message: 'error', error: err.message });
        console.log('✅ Informe registrado: ' + this.lastID);
        res.json({ message: 'success', data: { id: this.lastID, ticket_id } });
    });
});

// Listar informes
app.get('/api/informes', authenticateToken, (req, res) => {
    const { ticket_id, date_from, date_to } = req.query;
    let sql = 'SELECT i.*, t.title as ticket_title, c.name as client_name, u.username as generated_by_name FROM InformesTecnicos i LEFT JOIN Tickets t ON i.ticket_id = t.id LEFT JOIN Clients c ON t.client_id = c.id LEFT JOIN Users u ON i.generated_by = u.id WHERE 1=1';
    const params = [];
    
    if (ticket_id) { sql += ' AND i.ticket_id = ?'; params.push(ticket_id); }
    if (date_from) { sql += ' AND i.generated_at >= ?'; params.push(date_from); }
    if (date_to) { sql += ' AND i.generated_at <= ?'; params.push(date_to); }
    sql += ' ORDER BY i.generated_at DESC';
    
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ message: 'error', error: err.message });
        res.json({ message: 'success', data: rows || [] });
    });
});

// Obtener informe específico
app.get('/api/informes/:id', authenticateToken, (req, res) => {
    const sql = 'SELECT i.*, t.title as ticket_title, c.name as client_name, u.username as generated_by_name FROM InformesTecnicos i LEFT JOIN Tickets t ON i.ticket_id = t.id LEFT JOIN Clients c ON t.client_id = c.id LEFT JOIN Users u ON i.generated_by = u.id WHERE i.id = ?';
    
    db.get(sql, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ message: 'error', error: err.message });
        if (!row) return res.status(404).json({ message: 'error', error: 'Informe no encontrado' });
        res.json({ message: 'success', data: row });
    });
});

// Marcar como enviado
// Subir PDF generado
app.post('/api/informes/:id/pdf', authenticateToken, uploadReports.single('pdf'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'error', error: 'No se subió ningún archivo PDF' });
    }
    
    const informeId = req.params.id;
    const filename = req.file.filename;
    
    // Actualizar registro con el nombre del archivo físico
    const sql = 'UPDATE InformesTecnicos SET filename = ? WHERE id = ?';
    
    db.run(sql, [filename, informeId], function(err) {
        if (err) {
            console.error('❌ Error actualizando informe con PDF:', err);
            return res.status(500).json({ message: 'error', error: err.message });
        }
        
        console.log(`✅ PDF subido para informe ${informeId}: ${filename}`);
        res.json({ 
            message: 'success', 
            data: { 
                id: informeId, 
                filename: filename,
                path: `/uploads/reports/${filename}`
            } 
        });
    });
});

// Marcar como enviado y ENVIAR CORREO REAL
app.patch('/api/informes/:id/enviar', authenticateToken, async (req, res) => {
    const informeId = req.params.id;
    const { client_email } = req.body;
    
    if (!client_email) {
        return res.status(400).json({ message: 'error', error: 'Email del cliente es requerido' });
    }

    try {
        // 1. Obtener datos del informe para el correo
        const informe = await new Promise((resolve, reject) => {
            const sql = `
                SELECT i.*, t.title as ticket_title, c.name as client_name 
                FROM InformesTecnicos i 
                LEFT JOIN Tickets t ON i.ticket_id = t.id 
                LEFT JOIN Clients c ON t.client_id = c.id 
                WHERE i.id = ?
            `;
            db.get(sql, [informeId], (err, row) => {
                if (err) reject(err);
                else if (!row) reject(new Error('Informe no encontrado'));
                else resolve(row);
            });
        });

        // 2. Configurar transporte de correo
        // Si no hay variables de entorno, usar configuración de prueba o error
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
            console.warn('⚠️ SMTP no configurado. Simulando envío.');
            // Simulación (fallback a comportamiento anterior)
            const sql = 'UPDATE InformesTecnicos SET sent_to_client = TRUE, sent_at = CURRENT_TIMESTAMP, client_email = ? WHERE id = ?';
            db.run(sql, [client_email, informeId], function(err) {
                if (err) return res.status(500).json({ message: 'error', error: err.message });
                res.json({ message: 'success', warning: 'SMTP no configurado, envío simulado', data: { id: informeId, sent: true } });
            });
            return;
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // 3. Preparar adjunto
        const pdfPath = path.join(__dirname, '../uploads/reports/', informe.filename);
        const attachments = [];
        
        const fs = require('fs');
        if (fs.existsSync(pdfPath)) {
            attachments.push({
                filename: `Informe_Tecnico_${informe.ticket_id}.pdf`,
                path: pdfPath
            });
        } else {
            console.warn(`⚠️ PDF no encontrado en disco: ${pdfPath}`);
        }

        // 4. Enviar correo
        const mailOptions = {
            from: process.env.SMTP_FROM || '"GymTec ERP" <noreply@gymtecerp.com>',
            to: client_email,
            subject: `Informe Técnico - Ticket #${informe.ticket_id} - ${informe.client_name}`,
            text: `Estimado cliente,\n\nAdjunto encontrará el informe técnico correspondiente al servicio realizado (Ticket #${informe.ticket_id}).\n\nAtentamente,\nEquipo GymTec`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Informe Técnico de Servicio</h2>
                    <p>Estimado cliente,</p>
                    <p>Adjunto encontrará el informe técnico detallado correspondiente al servicio realizado.</p>
                    <ul>
                        <li><strong>Ticket:</strong> #${informe.ticket_id}</li>
                        <li><strong>Título:</strong> ${informe.ticket_title}</li>
                        <li><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</li>
                    </ul>
                    <p>Si tiene alguna duda, por favor contáctenos.</p>
                    <br>
                    <p>Atentamente,<br><strong>Equipo GymTec</strong></p>
                </div>
            `,
            attachments: attachments
        };

        await transporter.sendMail(mailOptions);
        console.log(`📧 Correo enviado a ${client_email}`);

        // 5. Actualizar estado en BD
        const sqlUpdate = 'UPDATE InformesTecnicos SET sent_to_client = TRUE, sent_at = CURRENT_TIMESTAMP, client_email = ? WHERE id = ?';
        
        db.run(sqlUpdate, [client_email, informeId], function(err) {
            if (err) return res.status(500).json({ message: 'error', error: err.message });
            console.log('✅ Informe ' + informeId + ' marcado como enviado');
            res.json({ message: 'success', data: { id: informeId, sent: true } });
        });

    } catch (error) {
        console.error('❌ Error enviando correo:', error);
        res.status(500).json({ message: 'error', error: 'Error al enviar correo: ' + error.message });
    }
});

// ===================================================================
// CATCH-ALL 404 HANDLER - DEBE IR ANTES DEL ERROR HANDLER
// ===================================================================

app.use('*', (req, res) => {
    console.log(`⚠️  404 - Endpoint no encontrado: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        error: 'Endpoint no encontrado',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// ===================================================================
// ERROR HANDLER - DEBE IR AL FINAL DESPUÉS DE TODAS LAS RUTAS
// ===================================================================

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
// PROCESS HANDLERS
// ===================================================================

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

// ===================================================================
// INICIAR SERVIDOR
// ===================================================================

startServer();



