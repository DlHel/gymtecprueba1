const db = require('../db-adapter');
const { generateToken, hashPassword, verifyPassword, JWT_SECRET } = require('../middleware/auth');
const { verifyAccessToken } = require('../core/middleware/auth.middleware');
const { normalizeRole, normalizeStatus } = require('../core/auth/identity');

/**
 * Servicio de Autenticación
 */
class AuthService {
    // Exportar JWT_SECRET para uso en otras partes
    static get JWT_SECRET() {
        return JWT_SECRET;
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
                    const storedPassword = user.password || '';

                    if (!storedPassword) {
                        return reject({
                            code: 'INVALID_PASSWORD_STATE',
                            message: 'La cuenta no tiene una contraseña válida configurada'
                        });
                    }
                    
                    // Detectar si la contraseña está hasheada o en texto plano
                    if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$')) {
                        // Contraseña ya está hasheada
                        isValidPassword = await verifyPassword(password, storedPassword);
                    } else {
                        // Contraseña en texto plano - verificar directamente y migrar
                        if (password === storedPassword) {
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

                    // NOTA: La columna last_login no existe en la tabla Users actual
                    // Comentado para evitar errores - descomentar cuando se agregue la columna
                    /*
                    const updateSql = `UPDATE Users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`;
                    db.run(updateSql, [user.id], (updateErr) => {
                        if (updateErr) {
                            console.warn('⚠️ Error actualizando último login:', updateErr.message);
                        }
                    });
                    */

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
        const { username, email, password, role = 'Technician', status = 'Activo' } = userData;
        let hashedPassword;

        try {
            hashedPassword = await hashPassword(password);
        } catch (error) {
            throw {
                code: 'HASH_ERROR',
                message: 'Error al procesar contraseña',
                details: error.message
            };
        }

        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO Users (username, email, password, role, status) 
                VALUES (?, ?, ?, ?, ?)
            `;
            
            const params = [
                username,
                email,
                hashedPassword,
                normalizeRole(role),
                normalizeStatus(status) || 'Activo'
            ];

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
            return verifyAccessToken(token);
        } catch (error) {
            throw {
                code: 'TOKEN_INVALID',
                message: 'Token inválido o expirado'
            };
        }
    }
}

module.exports = AuthService;
