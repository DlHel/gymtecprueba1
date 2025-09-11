const express = require('express');
const router = express.Router();
const db = require('../db-adapter');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * GYMTEC ERP - API DE USUARIOS
 *
 * Endpoints implementados:
 * ✅ GET /api/users - Listar usuarios con filtros
 * ✅ GET /api/users/:id - Obtener usuario por ID
 * ✅ POST /api/users - Crear nuevo usuario
 * ✅ PUT /api/users/:id - Actualizar usuario
 * ✅ DELETE /api/users/:id - Eliminar usuario
 * ✅ GET /api/users/profile - Obtener perfil del usuario actual
 * ✅ PUT /api/users/profile - Actualizar perfil del usuario actual
 */

// ===================================================================
// MIDDLEWARE DE AUTENTICACIÓN
// ===================================================================

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

const requireRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
};

// ===================================================================
// ENDPOINT DE PRUEBA (SIN AUTENTICACIÓN)
// ===================================================================

/**
 * @route GET /api/users/test
 * @desc Endpoint de prueba sin autenticación
 */
router.get('/test', (req, res) => {
    res.json({
        message: 'Users API is working!',
        timestamp: new Date().toISOString(),
        endpoints: [
            'GET /api/users',
            'GET /api/users?role=technician',
            'GET /api/users/:id',
            'POST /api/users',
            'PUT /api/users/:id',
            'DELETE /api/users/:id'
        ]
    });
});

// ===================================================================
// GESTIÓN DE USUARIOS
// ===================================================================

/**
 * @route GET /api/users
 * @desc Obtener lista de usuarios con filtros
 */
router.get('/', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
    try {
        const {
            role,
            status = 'active',
            search,
            page = 1,
            limit = 50
        } = req.query;

        let sql = `
            SELECT
                id,
                username,
                email,
                first_name,
                last_name,
                role,
                status,
                created_at,
                updated_at,
                last_login
            FROM Users
            WHERE 1=1
        `;

        const params = [];

        if (role) {
            sql += ' AND role = ?';
            params.push(role);
        }

        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }

        if (search) {
            sql += ' AND (username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        sql += ' ORDER BY created_at DESC';

        // Paginación
        const offset = (parseInt(page) - 1) * parseInt(limit);
        sql += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const users = await db.all(sql, params);

        // Contar total para paginación
        let countSql = 'SELECT COUNT(*) as total FROM Users WHERE 1=1';
        const countParams = [];

        if (role) {
            countSql += ' AND role = ?';
            countParams.push(role);
        }

        if (status) {
            countSql += ' AND status = ?';
            countParams.push(status);
        }

        if (search) {
            countSql += ' AND (username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        const countResult = await db.get(countSql, countParams);
        const total = countResult ? countResult.total : 0;

        res.json({
            message: 'success',
            data: users || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * @route GET /api/users/:id
 * @desc Obtener usuario por ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Los usuarios solo pueden ver su propio perfil, admins pueden ver todos
        if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.id != id) {
            return res.status(403).json({ error: 'No tienes permisos para ver este usuario' });
        }

        const sql = `
            SELECT
                id,
                username,
                email,
                first_name,
                last_name,
                role,
                status,
                created_at,
                updated_at,
                last_login
            FROM Users
            WHERE id = ?
        `;

        const user = await db.get(sql, [id]);

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({
            message: 'success',
            data: user
        });

    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * @route POST /api/users
 * @desc Crear nuevo usuario
 */
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const {
            username,
            email,
            password,
            first_name,
            last_name,
            role = 'technician'
        } = req.body;

        // Validaciones
        if (!username || !email || !password) {
            return res.status(400).json({
                error: 'Campos requeridos faltantes',
                details: 'username, email y password son obligatorios'
            });
        }

        // Verificar si el usuario ya existe
        const existingUser = await db.get('SELECT id FROM Users WHERE username = ? OR email = ?', [username, email]);
        if (existingUser) {
            return res.status(400).json({
                error: 'Usuario ya existe',
                details: 'El username o email ya están registrados'
            });
        }

        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO Users
            (username, email, password_hash, first_name, last_name, role, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
        `;

        const result = await db.run(sql, [username, email, hashedPassword, first_name, last_name, role]);

        res.status(201).json({
            message: 'Usuario creado exitosamente',
            data: {
                id: result.lastID,
                username,
                email,
                first_name,
                last_name,
                role
            }
        });

    } catch (error) {
        console.error('Error creando usuario:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * @route PUT /api/users/:id
 * @desc Actualizar usuario
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            username,
            email,
            first_name,
            last_name,
            role,
            status
        } = req.body;

        // Los usuarios solo pueden actualizar su propio perfil, admins pueden actualizar todos
        if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.id != id) {
            return res.status(403).json({ error: 'No tienes permisos para actualizar este usuario' });
        }

        // Los no-admins no pueden cambiar roles
        if (req.user.role !== 'admin' && role && role !== req.user.role) {
            return res.status(403).json({ error: 'No tienes permisos para cambiar roles' });
        }

        const sql = `
            UPDATE Users
            SET username = ?, email = ?, first_name = ?, last_name = ?, role = ?, status = ?, updated_at = NOW()
            WHERE id = ?
        `;

        const params = [username, email, first_name, last_name, role, status, id];
        await db.run(sql, params);

        res.json({
            message: 'Usuario actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * @route DELETE /api/users/:id
 * @desc Eliminar usuario (soft delete)
 */
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;

        // No permitir eliminar al propio usuario
        if (req.user.id == id) {
            return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
        }

        const sql = 'UPDATE Users SET status = "inactive", updated_at = NOW() WHERE id = ?';
        await db.run(sql, [id]);

        res.json({
            message: 'Usuario eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * @route GET /api/users/profile
 * @desc Obtener perfil del usuario actual
 */
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const sql = `
            SELECT
                id,
                username,
                email,
                first_name,
                last_name,
                role,
                status,
                created_at,
                updated_at,
                last_login
            FROM Users
            WHERE id = ?
        `;

        const user = await db.get(sql, [req.user.id]);

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({
            message: 'success',
            data: user
        });

    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * @route PUT /api/users/profile
 * @desc Actualizar perfil del usuario actual
 */
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            email
        } = req.body;

        const sql = `
            UPDATE Users
            SET first_name = ?, last_name = ?, email = ?, updated_at = NOW()
            WHERE id = ?
        `;

        await db.run(sql, [first_name, last_name, email, req.user.id]);

        res.json({
            message: 'Perfil actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * @route GET /api/users/technicians
 * @desc Obtener lista simplificada de técnicos (acceso más permisivo para service-tickets)
 */
router.get('/technicians', async (req, res) => {
    try {
        console.log('🔍 GET /api/users/technicians - Sin autenticación requerida para debug');
        
        const sql = `
            SELECT 
                id,
                username,
                email,
                role
            FROM Users 
            WHERE role = 'Tecnico' 
            AND status = 'Activo'
            ORDER BY username
        `;
        
        const technicians = await db.all(sql);
        
        console.log(`✅ Encontrados ${technicians.length} técnicos`);
        
        res.json({
            message: 'Técnicos obtenidos exitosamente',
            data: technicians
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo técnicos:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * @route GET /api/users/test-auth
 * @desc Test de autenticación sin middleware (temporal)
 */
router.get('/test-auth', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        console.log('🧪 TEST-AUTH - Authorization header:', authHeader ? 'Present' : 'Missing');
        console.log('🧪 TEST-AUTH - Token:', token ? token.substring(0, 20) + '...' : 'Missing');
        
        res.json({
            message: 'Test de autenticación',
            hasAuthHeader: !!authHeader,
            hasToken: !!token,
            tokenPreview: token ? token.substring(0, 20) + '...' : null
        });
        
    } catch (error) {
        console.error('❌ Error en test-auth:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

module.exports = router;
