/**
 * GYMTEC ERP - Módulo de Usuarios
 * Extraído de server-clean.js para arquitectura modular
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../../db-adapter');
const { authenticateToken } = require('../../core/middleware/auth.middleware');

// ===================================================================
// RUTAS DE USUARIOS
// ===================================================================

// GET all users with optional role filter
router.get('/users', authenticateToken, (req, res) => {
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

// GET current user (me)
router.get('/users/me', authenticateToken, (req, res) => {
    console.log(`👤 GET /api/users/me - Usuario: ${req.user.username}`);
    const sql = `SELECT id, username, email, role, status, created_at FROM Users WHERE id = ?`;
    db.get(sql, [req.user.id], (err, row) => {
        if (err) {
            console.error('❌ Error al obtener usuario:', err);
            return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        console.log(`✅ Usuario obtenido: ${row.username}`);
        res.json({ message: 'success', data: row });
    });
});

// POST create new user
router.post('/users', authenticateToken, async (req, res) => {
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
router.put('/users/:id', authenticateToken, async (req, res) => {
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
router.delete('/users/:id', authenticateToken, (req, res) => {
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

module.exports = router;
