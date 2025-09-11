const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

// Configuración modular
const { config, validateConfig } = require('./config/server');
const { setupRoutes } = require('./routes/index');

// Middleware de seguridad avanzada (2025 standards)
const { securityMiddleware, logger, performanceMonitor, errorLogger } = require('./middleware/security');
const { setupRateLimiting, suspiciousActivityTracker } = require('./middleware/rateLimiter');

/**
 * Servidor Express Modular - Gymtec ERP v2.0
 * @bitacora: Arquitectura modular + seguridad avanzada implementadas
 * 
 * ANTES: server-clean.js con 2,827 líneas monolíticas
 * DESPUÉS: server-modular.js con ~150 líneas + módulos organizados + seguridad 2025
 * 
 * NUEVAS CARACTERÍSTICAS v2.0:
 * ✅ Helmet para headers de seguridad
 * ✅ Rate limiting avanzado anti-fuerza bruta
 * ✅ Logging estructurado con Winston
 * ✅ Monitoreo de performance
 * ✅ Detección de actividad sospechosa
 * ✅ Manejo robusto de errores
 */

console.log('🚀 Iniciando Gymtec ERP Server - Arquitectura Modular v2.0');
console.log('� Seguridad Enterprise 2025 habilitada');
console.log('�📅 Refactorización completada:', new Date().toISOString());

// ===================================================================
// VALIDACIÓN DE CONFIGURACIÓN
// ===================================================================

try {
    validateConfig();
    logger.info('Configuration validated successfully', { 
        environment: config.server.environment,
        port: config.server.port 
    });
} catch (error) {
    console.error('💥 Error de configuración:', error.message);
    process.exit(1);
}

// ===================================================================
// INICIALIZACIÓN DE EXPRESS
// ===================================================================

const app = express();
const PORT = config.server.port;

logger.info('⚙️ Configurando middleware básico...');

// ===================================================================
// MIDDLEWARE DE SEGURIDAD AVANZADA (PRIMERO)
// ===================================================================

// Configurar seguridad antes que todo
securityMiddleware(app);

// Rate limiting y detección de actividad sospechosa
setupRateLimiting(app);
app.use(suspiciousActivityTracker);

// Performance monitoring
app.use(performanceMonitor);

console.log('✅ Middleware de seguridad configurado');
logger.info('Security middleware configured', { 
    helmet: true, 
    rateLimit: true, 
    activityTracking: true,
    performanceMonitoring: true
});

// ===================================================================
// MIDDLEWARE BÁSICO
// ===================================================================

// CORS
app.use(cors(config.cors));

// Parseo de JSON y URL-encoded (con límites de configuración)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Archivos estáticos
app.use(express.static(config.staticPaths.frontend));
app.use('/uploads', express.static(config.staticPaths.uploads));

logger.info('✅ Middleware básico configurado');

// ===================================================================
// CONFIGURACIÓN DE MULTER (Upload de archivos) - MEJORADA
// ===================================================================

logger.info('📁 Configurando sistema de archivos...');

// Validación de tipos de archivo mejorada
const allowedImageMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const allowedDocumentMimes = [
    'application/pdf', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
];

// Storage para modelos/equipos con validación mejorada
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, config.upload.modelsPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const sanitizedName = file.fieldname.replace(/[^a-zA-Z0-9]/g, '_');
        cb(null, sanitizedName + '-' + uniqueSuffix + extension);
    }
});

// Configuración para imágenes con validación estricta
const upload = multer({ 
    storage: storage,
    limits: { 
        fileSize: config.upload.maxFileSize,
        files: 5, // máximo 5 archivos por request
        fieldSize: 1024 * 1024 // 1MB para campos de texto
    },
    fileFilter: (req, file, cb) => {
        const extname = config.upload.allowedImageTypes.includes(
            path.extname(file.originalname).toLowerCase().slice(1)
        );
        const mimetype = allowedImageMimes.includes(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            const error = new Error(`Tipo de archivo no permitido: ${file.mimetype}. Solo se permiten: ${config.upload.allowedImageTypes.join(', ')}`);
            error.code = 'INVALID_FILE_TYPE';
            cb(error);
        }
    }
});

// Configuración para documentos/manuales con validación estricta
const uploadManuals = multer({ 
    storage: multer.memoryStorage(),
    limits: { 
        fileSize: config.upload.maxFileSize,
        files: 1, // solo un manual por request
        fieldSize: 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const extname = config.upload.allowedDocumentTypes.includes(
            path.extname(file.originalname).toLowerCase().slice(1)
        );
        const mimetype = allowedDocumentMimes.includes(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            const error = new Error(`Tipo de documento no permitido: ${file.mimetype}. Solo se permiten: ${config.upload.allowedDocumentTypes.join(', ')}`);
            error.code = 'INVALID_DOCUMENT_TYPE';
            cb(error);
        }
    }
});

// Hacer disponibles globalmente
app.locals.upload = upload;
app.locals.uploadManuals = uploadManuals;

logger.info('✅ Sistema de archivos configurado con validación mejorada');

// ===================================================================
// CONFIGURACIÓN DE RUTAS MODULARES
// ===================================================================

logger.info('🛣️ Configurando sistema de rutas...');
setupRoutes(app);

// ===================================================================
// MIDDLEWARE DE ERROR GLOBAL MEJORADO
// ===================================================================

// Error logger middleware
app.use(errorLogger);

// Manejo de errores Multer específico
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        logger.error('Multer error occurred', {
            code: error.code,
            field: error.field,
            message: error.message,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    error: 'Archivo demasiado grande',
                    maxSize: `${config.upload.maxFileSize / (1024 * 1024)}MB`,
                    code: 'FILE_TOO_LARGE',
                    timestamp: new Date().toISOString()
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    error: 'Demasiados archivos',
                    code: 'TOO_MANY_FILES',
                    timestamp: new Date().toISOString()
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    error: 'Campo de archivo inesperado',
                    code: 'UNEXPECTED_FILE',
                    timestamp: new Date().toISOString()
                });
            default:
                return res.status(400).json({
                    error: 'Error en la subida de archivo',
                    code: 'UPLOAD_ERROR',
                    timestamp: new Date().toISOString()
                });
        }
    }
    
    // Errores de validación de archivos personalizados
    if (error.code === 'INVALID_FILE_TYPE' || error.code === 'INVALID_DOCUMENT_TYPE') {
        logger.warn('Invalid file type uploaded', {
            error: error.message,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        return res.status(400).json({
            error: error.message,
            code: error.code,
            timestamp: new Date().toISOString()
        });
    }
    
    // Error general
    logger.error('Unhandled application error', {
        error: {
            message: error.message,
            stack: error.stack,
            name: error.name
        },
        request: {
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        }
    });
    
    // No exponer stack trace en producción
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
        ...(isDevelopment && { stack: error.stack })
    });
});

// ===================================================================
// MANEJO DE RUTAS NO ENCONTRADAS MEJORADO
// ===================================================================

app.use('*', (req, res) => {
    logger.warn('Route not found', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    
    res.status(404).json({
        error: 'Endpoint no encontrado',
        method: req.method,
        path: req.originalUrl,
        code: 'ENDPOINT_NOT_FOUND',
        timestamp: new Date().toISOString(),
        suggestion: 'Verifica la URL y método HTTP'
    });
});

// ===================================================================
// INICIO DEL SERVIDOR CON LOGGING AVANZADO
// ===================================================================

const server = app.listen(PORT, () => {
    const startupInfo = {
        timestamp: new Date().toISOString(),
        port: PORT,
        environment: config.server.environment,
        database: config.database.type,
        jwtExpiration: config.jwt.expiresIn,
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid
    };
    
    logger.info('🎉 GYMTEC ERP SERVER STARTED SUCCESSFULLY', startupInfo);
    
    console.log('');
    console.log('🎉 ================================');
    console.log('🏆 GYMTEC ERP SERVER v2.0 INICIADO');
    console.log('🎉 ================================');
    console.log(`🌐 Servidor: http://localhost:${PORT}`);
    console.log(`📊 Entorno: ${config.server.environment}`);
    console.log(`🗄️ Base de datos: ${config.database.type}`);
    console.log(`🔐 JWT expiration: ${config.jwt.expiresIn}`);
    console.log(`🛡️ Seguridad: Enterprise 2025`);
    console.log('🎉 ================================');
    console.log('');
    console.log('📋 REFACTORIZACIÓN + SEGURIDAD COMPLETADA:');
    console.log('   ✅ Arquitectura modular implementada');
    console.log('   ✅ Controladores separados');
    console.log('   ✅ Middleware organizado');
    console.log('   ✅ Configuración centralizada');
    console.log('   ✅ Rutas modulares');
    console.log('   � Helmet security headers');
    console.log('   🔒 Rate limiting anti-brute force');
    console.log('   🔒 Structured logging con Winston');
    console.log('   🔒 Performance monitoring');
    console.log('   🔒 Suspicious activity detection');
    console.log('   �📉 Reducción: ~95% en líneas del servidor principal');
    console.log('');
});

// ===================================================================
// MANEJO GRACEFUL DE CIERRE CON LOGGING
// ===================================================================

const gracefulShutdown = (signal) => {
    logger.info(`${signal} signal received, starting graceful shutdown`);
    
    server.close((err) => {
        if (err) {
            logger.error('Error during server shutdown', { error: err.message });
            process.exit(1);
        }
        
        logger.info('Server closed successfully');
        
        // Cerrar transports de logging
        logger.end();
        
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
    });
    
    // Forzar cierre después de 10 segundos
    setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { 
        error: error.message, 
        stack: error.stack 
    });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { 
        reason: reason, 
        promise: promise 
    });
    process.exit(1);
});

module.exports = app;
