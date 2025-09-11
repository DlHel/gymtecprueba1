const rateLimit = require('express-rate-limit');

/**
 * Rate Limiting Avanzado - Gymtec ERP
 * Implementa mejores prácticas 2025 para prevenir ataques
 */

// Función helper para logging seguro
const safeLog = (message, data = {}) => {
    try {
        const { logger } = require('./security');
        if (logger && logger.warn) {
            logger.warn(message, data);
        } else {
            console.warn(message, data);
        }
    } catch (error) {
        console.warn(message, data);
    }
};

/**
 * Rate limiting para autenticación - Previene ataques de fuerza bruta
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 intentos por IP en ventana de tiempo
    message: {
        error: 'Demasiados intentos de autenticación',
        code: 'RATE_LIMIT_AUTH',
        retryAfter: 15 * 60, // 15 minutos en segundos
        timestamp: new Date().toISOString()
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        safeLog('Authentication rate limit exceeded', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            method: req.method,
            url: req.url,
            timestamp: new Date().toISOString()
        });
        
        res.status(429).json({
            error: 'Demasiados intentos de autenticación',
            code: 'RATE_LIMIT_AUTH',
            retryAfter: Math.round(req.rateLimit.resetTime / 1000),
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Rate limiting general para API
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP
    message: {
        error: 'Demasiadas solicitudes, intenta más tarde',
        code: 'RATE_LIMIT_API',
        retryAfter: 15 * 60,
        timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        safeLog('API rate limit exceeded', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            method: req.method,
            url: req.url,
            timestamp: new Date().toISOString()
        });
        
        res.status(429).json({
            error: 'Demasiadas solicitudes, intenta más tarde',
            code: 'RATE_LIMIT_API',
            retryAfter: Math.round(req.rateLimit.resetTime / 1000),
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Rate limiting específico para uploads
 */
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // máximo 10 uploads por IP
    message: {
        error: 'Demasiados archivos subidos, intenta más tarde',
        code: 'RATE_LIMIT_UPLOAD',
        retryAfter: 15 * 60,
        timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        safeLog('Upload rate limit exceeded', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            method: req.method,
            url: req.url,
            timestamp: new Date().toISOString()
        });
        
        res.status(429).json({
            error: 'Demasiados archivos subidos, intenta más tarde',
            code: 'RATE_LIMIT_UPLOAD',
            retryAfter: Math.round(req.rateLimit.resetTime / 1000),
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Rate limiting para operaciones de escritura (POST, PUT, DELETE)
 */
const writeLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 20, // máximo 20 operaciones de escritura por IP
    message: {
        error: 'Demasiadas operaciones de escritura, intenta más tarde',
        code: 'RATE_LIMIT_WRITE',
        retryAfter: 5 * 60,
        timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Solo aplicar a operaciones de escritura
        return !['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
    },
    handler: (req, res) => {
        safeLog('Write operations rate limit exceeded', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            method: req.method,
            url: req.url,
            timestamp: new Date().toISOString()
        });
        
        res.status(429).json({
            error: 'Demasiadas operaciones de escritura, intenta más tarde',
            code: 'RATE_LIMIT_WRITE',
            retryAfter: Math.round(req.rateLimit.resetTime / 1000),
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Configuración de rate limiting por rutas
 */
const setupRateLimiting = (app) => {
    // Rate limiting general para todas las rutas API
    app.use('/api', apiLimiter);
    
    // Rate limiting específico para autenticación
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/register', authLimiter);
    app.use('/api/auth/change-password', authLimiter);
    
    // Rate limiting para uploads
    app.use('/api/*/upload', uploadLimiter);
    app.use('/api/models/upload', uploadLimiter);
    
    // Rate limiting para operaciones de escritura
    app.use('/api', writeLimiter);
    
    console.log('✅ Rate limiting configured');
};

/**
 * Middleware para tracking de intentos sospechosos
 */
const suspiciousActivityTracker = (req, res, next) => {
    const suspiciousPatterns = [
        /\.\.(\/|\\)/,  // Path traversal
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // XSS
        /(\%27)|(\')|(\-\-)|(\%23)|(#)/i, // SQL injection
        /(\%3C)|(<)/i, // HTML injection
        /(\%3E)|(>)/i  // HTML injection
    ];
    
    const userInput = JSON.stringify({
        url: req.url,
        body: req.body,
        query: req.query,
        params: req.params
    });
    
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userInput));
    
    if (isSuspicious) {
        safeLog('Suspicious activity detected', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            method: req.method,
            url: req.url,
            body: req.body,
            query: req.query,
            timestamp: new Date().toISOString(),
            severity: 'HIGH'
        });
    }
    
    next();
};

module.exports = {
    authLimiter,
    apiLimiter,
    uploadLimiter,
    writeLimiter,
    setupRateLimiting,
    suspiciousActivityTracker
};
