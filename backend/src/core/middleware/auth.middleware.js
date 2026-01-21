/**
 * GYMTEC ERP - Middleware de Autenticación Centralizado
 * 
 * REGLA: Todos los módulos deben importar authenticateToken de aquí.
 * PROHIBIDO: Copiar/pegar esta función en archivos de módulos.
 */

const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Middleware para verificar token JWT
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            error: 'Token de acceso requerido',
            code: 'MISSING_TOKEN'
        });
    }

    jwt.verify(token, config.JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    error: 'Token expirado',
                    code: 'TOKEN_EXPIRED'
                });
            }
            return res.status(401).json({
                error: 'Token inválido',
                code: 'INVALID_TOKEN'
            });
        }
        req.user = user;
        next();
    });
}

/**
 * Middleware para verificar roles
 * @param {string[]} roles - Array de roles permitidos
 */
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

module.exports = {
    authenticateToken,
    requireRole
};
