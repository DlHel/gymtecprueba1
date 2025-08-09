const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Clave secreta para JWT (en producción debe estar en variables de entorno)
const JWT_SECRET = process.env.JWT_SECRET || 'gymtec_secret_key_2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Middleware para verificar token JWT
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            error: 'Token de acceso requerido',
            code: 'TOKEN_REQUIRED'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                error: 'Token inválido o expirado',
                code: 'TOKEN_INVALID'
            });
        }
        
        req.user = user;
        next();
    });
};

/**
 * Middleware para verificar roles específicos
 */
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Usuario no autenticado',
                code: 'USER_NOT_AUTHENTICATED'
            });
        }

        const userRole = req.user.role;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ 
                error: 'Permisos insuficientes',
                code: 'INSUFFICIENT_PERMISSIONS',
                required: allowedRoles,
                current: userRole
            });
        }

        next();
    };
};

/**
 * Generar token JWT
 */
const generateToken = (user) => {
    const payload = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
    };

    return jwt.sign(payload, JWT_SECRET, { 
        expiresIn: JWT_EXPIRES_IN 
    });
};

/**
 * Hash de contraseña
 */
const hashPassword = async (password) => {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
};

/**
 * Verificar contraseña
 */
const verifyPassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

/**
 * Middleware opcional - continúa si hay token válido, sino continúa sin usuario
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            req.user = null;
        } else {
            req.user = user;
        }
        next();
    });
};

module.exports = {
    authenticateToken,
    requireRole,
    generateToken,
    hashPassword,
    verifyPassword,
    optionalAuth,
    JWT_SECRET
};
