const db = require('../db-adapter');
const { generateToken, hashPassword, verifyPassword, JWT_SECRET } = require('../middleware/auth');

/**
 * Servicio de Autenticación
 */
class AuthService {
    // Exportar JWT_SECRET para uso en otras partes
    static get JWT_SECRET() {
        return JWT_SECRET;
    }
    
    // Exportar JWT_EXPIRES_IN para uso en otras partes
    static get JWT_EXPIRES_IN() {
        return process.env.JWT_EXPIRES_IN || '10h';
    }
    
    /**
     * Realizar login de usuario
     */
    static async login(username, password) {
        return new Promise((resolve, reject) => {
            // Buscar usuario por username o email
            const sql = `
                SELECT id, username, email, password, role, status 
                FROM Users 
                WHERE (username = ? OR email = ?) AND status = 'Activo'
            `;
            
            db.get(sql, [username, username], async (err, user) => {
                if (err) {
                    return reject({
                        code: 'DATABASE_ERROR',
                        message: 'Error al consultar usuario',
                        details: err.message
                    });
                }

                if (!user) {
                    return reject({
                        code: 'USER_NOT_FOUND',
                        message: 'Usuario no encontrado o inactivo'
                    });
                }

                try {
                    // Verificar contraseña
                    let isValidPassword = false;
                    
                    // Detectar si la contraseña está hasheada o en texto plano
                    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
                        // Contraseña ya está hasheada
                        isValidPassword = await verifyPassword(password, user.password);
                    } else {
                        // Contraseña en texto plano - verificar directamente y migrar
                        if (password === user.password) {
                            isValidPassword = true;
                            
                            // Migrar contraseña a hash
                            console.log(`🔄 Migrando contraseña a hash para usuario: ${user.username}`);
                            const hashedPassword = await hashPassword(password);
                            const updateSql = `UPDATE Users SET password = ? WHERE id = ?`;
                            db.run(updateSql, [hashedPassword, user.id], (updateErr) => {
                                if (updateErr) {
                                    console.warn('⚠️ Error migrando contraseña:', updateErr.message);
                                } else {
                                    console.log(`✅ Contraseña migrada exitosamente para: ${user.username}`);
                                }
                            });
                        }
                    }
                    
                    if (!isValidPassword) {
                        return reject({
                            code: 'INVALID_PASSWORD',
                            message: 'Contraseña incorrecta'
                        });
                    }

                    // Generar token
                    const token = generateToken(user);

                    // Actualizar último login
                    const updateSql = `UPDATE Users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`;
                    db.run(updateSql, [user.id], (updateErr) => {
                        if (updateErr) {
                            console.warn('⚠️ Error actualizando último login:', updateErr.message);
                        }
                    });

                    // Retornar datos del usuario (sin contraseña) y token
                    resolve({
                        token,
                        user: {
                            id: user.id,
                            username: user.username,
                            email: user.email,
                            role: user.role,
                            status: user.status
                        }
                    });

                } catch (error) {
                    reject({
                        code: 'AUTH_ERROR',
                        message: 'Error en autenticación',
                        details: error.message
                    });
                }
            });
        });
    }

    /**
     * Registrar nuevo usuario
     */
    static async register(userData) {
        const { username, email, password, role = 'Técnico', status = 'Activo' } = userData;

        return new Promise(async (resolve, reject) => {
            try {
                // Hash de la contraseña
                const hashedPassword = await hashPassword(password);

                const sql = `
                    INSERT INTO Users (username, email, password, role, status) 
                    VALUES (?, ?, ?, ?, ?)
                `;
                
                const params = [username, email, hashedPassword, role, status];

                db.run(sql, params, function(err) {
                    if (err) {
                        if (err.message.includes('UNIQUE constraint failed')) {
                            return reject({
                                code: 'USER_EXISTS',
                                message: 'El usuario o email ya existe'
                            });
                        }
                        return reject({
                            code: 'DATABASE_ERROR',
                            message: 'Error al crear usuario',
                            details: err.message
                        });
                    }

                    resolve({
                        id: this.lastID,
                        username,
                        email,
                        role,
                        status
                    });
                });

            } catch (error) {
                reject({
                    code: 'HASH_ERROR',
                    message: 'Error al procesar contraseña',
                    details: error.message
                });
            }
        });
    }

    /**
     * Cambiar contraseña de usuario
     */
    static async changePassword(userId, currentPassword, newPassword) {
        return new Promise((resolve, reject) => {
            // Obtener usuario actual
            const sql = `SELECT password FROM Users WHERE id = ? AND status = 'Activo'`;
            
            db.get(sql, [userId], async (err, user) => {
                if (err) {
                    return reject({
                        code: 'DATABASE_ERROR',
                        message: 'Error al consultar usuario'
                    });
                }

                if (!user) {
                    return reject({
                        code: 'USER_NOT_FOUND',
                        message: 'Usuario no encontrado'
                    });
                }

                try {
                    // Verificar contraseña actual
                    const isValidCurrentPassword = await verifyPassword(currentPassword, user.password);
                    
                    if (!isValidCurrentPassword) {
                        return reject({
                            code: 'INVALID_CURRENT_PASSWORD',
                            message: 'Contraseña actual incorrecta'
                        });
                    }

                    // Hash de la nueva contraseña
                    const hashedNewPassword = await hashPassword(newPassword);

                    // Actualizar contraseña
                    const updateSql = `UPDATE Users SET password = ? WHERE id = ?`;
                    db.run(updateSql, [hashedNewPassword, userId], function(updateErr) {
                        if (updateErr) {
                            return reject({
                                code: 'UPDATE_ERROR',
                                message: 'Error al actualizar contraseña'
                            });
                        }

                        resolve({
                            message: 'Contraseña actualizada exitosamente'
                        });
                    });

                } catch (error) {
                    reject({
                        code: 'HASH_ERROR',
                        message: 'Error al procesar nueva contraseña'
                    });
                }
            });
        });
    }

    /**
     * Verificar token y obtener usuario
     */
    static async verifyToken(token) {
        try {
            const jwt = require('jsonwebtoken');
            const { JWT_SECRET } = require('../middleware/auth');
            
            const decoded = jwt.verify(token, JWT_SECRET);
            return decoded;
        } catch (error) {
            throw {
                code: 'TOKEN_INVALID',
                message: 'Token inválido o expirado'
            };
        }
    }
}

module.exports = AuthService;
