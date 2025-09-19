const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AuthService = require('../services/authService');

/**
 * Controlador de Autenticación
 * @bitacora: Módulo separado para manejo de autenticación
 */
class AuthController {
    
    /**
     * Login de usuarios
     */
    static async login(req, res) {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                error: 'Username y contraseña son requeridos',
                code: 'MISSING_CREDENTIALS'
            });
        }

        try {
            const sql = 'SELECT * FROM Users WHERE username = ?';
            
            const db = require('../db-adapter');
            
            // Usar callback correctamente
            db.get(sql, [username], async (err, user) => {
                try {
                    if (err) {
                        console.error('❌ Error de base de datos en login:', err);
                        return res.status(500).json({ 
                            error: 'Error interno del servidor', 
                            code: 'DATABASE_ERROR' 
                        });
                    }

                    if (!user) {
                        console.log('❌ Usuario no encontrado:', username);
                        return res.status(401).json({ 
                            error: 'Credenciales inválidas', 
                            code: 'INVALID_CREDENTIALS' 
                        });
                    }

                    console.log('🔍 Usuario encontrado:', user.username, 'ID:', user.id);

                    const isPasswordValid = await bcrypt.compare(password, user.password);
                    if (!isPasswordValid) {
                        console.log('❌ Contraseña incorrecta para usuario:', username);
                        return res.status(401).json({ 
                            error: 'Credenciales inválidas', 
                            code: 'INVALID_CREDENTIALS' 
                        });
                    }

                    const token = jwt.sign(
                        { 
                            id: user.id, 
                            username: user.username, 
                            role: user.role 
                        },
                        AuthService.JWT_SECRET,
                        { expiresIn: AuthService.JWT_EXPIRES_IN }
                    );

                    console.log('✅ Login exitoso:', user.username, 'Token generado');

                    res.json({
                        message: 'Login exitoso',
                        token,
                        user: {
                            id: user.id,
                            username: user.username,
                            role: user.role,
                            email: user.email
                        }
                    });
                } catch (innerError) {
                    console.error('❌ Error interno en login callback:', innerError);
                    res.status(500).json({ 
                        error: 'Error interno del servidor', 
                        code: 'INTERNAL_ERROR' 
                    });
                }
            });
        } catch (error) {
            console.error('❌ Error en login:', error);
            res.status(500).json({ 
                error: 'Error interno del servidor', 
                code: 'INTERNAL_ERROR' 
            });
        }
    }

    /**
     * Logout de usuarios
     */
    static async logout(req, res) {
        console.log('📤 Logout request from user:', req.user?.username);
        res.json({ 
            message: 'Logout exitoso',
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Verificar token
     */
    static async verify(req, res) {
        res.json({ 
            message: 'Token válido', 
            user: req.user,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Cambiar contraseña
     */
    static async changePassword(req, res) {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                error: 'Contraseña actual y nueva contraseña son requeridas',
                code: 'MISSING_PASSWORDS'
            });
        }

        try {
            const db = require('../db-adapter');
            
            // Verificar contraseña actual
            db.get('SELECT password FROM Users WHERE id = ?', [userId], async (err, user) => {
                if (err) {
                    console.error('❌ Error verificando contraseña actual:', err);
                    return res.status(500).json({ 
                        error: 'Error interno del servidor', 
                        code: 'DATABASE_ERROR' 
                    });
                }

                if (!user) {
                    return res.status(404).json({ 
                        error: 'Usuario no encontrado', 
                        code: 'USER_NOT_FOUND' 
                    });
                }

                const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
                if (!isCurrentPasswordValid) {
                    return res.status(401).json({ 
                        error: 'Contraseña actual incorrecta', 
                        code: 'INVALID_CURRENT_PASSWORD' 
                    });
                }

                // Hashear nueva contraseña
                const hashedNewPassword = await bcrypt.hash(newPassword, 12);

                // Actualizar contraseña
                db.run('UPDATE Users SET password = ? WHERE id = ?', [hashedNewPassword, userId], function(err) {
                    if (err) {
                        console.error('❌ Error actualizando contraseña:', err);
                        return res.status(500).json({ 
                            error: 'Error interno del servidor', 
                            code: 'DATABASE_ERROR' 
                        });
                    }

                    console.log('✅ Contraseña actualizada para usuario ID:', userId);
                    res.json({ 
                        message: 'Contraseña actualizada exitosamente',
                        timestamp: new Date().toISOString()
                    });
                });
            });
        } catch (error) {
            console.error('❌ Error en cambio de contraseña:', error);
            res.status(500).json({ 
                error: 'Error interno del servidor', 
                code: 'INTERNAL_ERROR' 
            });
        }
    }
}

module.exports = AuthController;
