const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');

/**
 * Sistema de Logging Estructurado - Gymtec ERP
 * Implementa mejores prácticas 2025 para logging y monitoreo
 */

// Configuración de Winston Logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.prettyPrint()
    ),
    defaultMeta: { 
        service: 'gymtec-erp',
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development'
    },
    transports: [
        // Console transport con colores para desarrollo
        new winston.transports.Console({
            level: 'debug',
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
                winston.format.printf(({ level, message, timestamp, ...meta }) => {
                    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
                })
            )
        }),
        
        // File transport para errores
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        }),
        
        // File transport para todas las operaciones
        new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 10,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        })
    ]
});

/**
 * Configuración de Helmet para seguridad
 */
const helmetConfig = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https:", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        }
    },
    crossOriginEmbedderPolicy: false, // Permitir embeds necesarios
    referrerPolicy: { policy: "no-referrer" }
};

/**
 * Configuración de Morgan para HTTP logging
 */
const morganFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms';

const morganStream = {
    write: (message) => {
        logger.info(message.trim(), { type: 'http_request' });
    }
};

/**
 * Middleware de seguridad avanzada
 */
const securityMiddleware = (app) => {
    // Helmet para headers de seguridad
    app.use(helmet(helmetConfig));
    
    // Deshabilitar X-Powered-By
    app.disable('x-powered-by');
    
    // Morgan para HTTP logging
    app.use(morgan(morganFormat, { stream: morganStream }));
    
    // Trust proxy para rate limiting y IP correctas
    app.set('trust proxy', 1);
    
    // Logging de inicio de seguridad
    logger.info('Security middleware initialized', {
        helmet: 'enabled',
        rateLimit: 'configured',
        httpLogging: 'enabled',
        xPoweredBy: 'disabled'
    });
};

/**
 * Middleware de logging personalizado para operaciones críticas
 */
const operationLogger = (operation) => {
    return (req, res, next) => {
        const startTime = Date.now();
        
        // Log de inicio de operación
        logger.info(`Operation started: ${operation}`, {
            operation,
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user?.id,
            timestamp: new Date().toISOString()
        });
        
        // Interceptar respuesta para logging
        const originalSend = res.send;
        res.send = function(data) {
            const duration = Date.now() - startTime;
            
            logger.info(`Operation completed: ${operation}`, {
                operation,
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                userId: req.user?.id,
                success: res.statusCode < 400
            });
            
            originalSend.call(this, data);
        };
        
        next();
    };
};

/**
 * Error logger middleware
 */
const errorLogger = (err, req, res, next) => {
    logger.error('Application error occurred', {
        error: {
            message: err.message,
            stack: err.stack,
            name: err.name
        },
        request: {
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user?.id
        },
        timestamp: new Date().toISOString()
    });
    
    next(err);
};

/**
 * Performance monitoring middleware
 */
const performanceMonitor = (req, res, next) => {
    const startTime = process.hrtime.bigint();
    
    res.on('finish', () => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        
        if (duration > 1000) { // Log slow requests (>1s)
            logger.warn('Slow request detected', {
                method: req.method,
                url: req.url,
                duration: `${duration.toFixed(2)}ms`,
                statusCode: res.statusCode,
                userId: req.user?.id
            });
        }
    });
    
    next();
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    
    logger.info(`📥 Request: ${req.method} ${req.url}`, {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });
    
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.info(`📤 Response: ${req.method} ${req.url} - ${res.statusCode}`, {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userId: req.user?.id
        });
    });
    
    next();
};

/**
 * Error monitoring middleware
 */
const errorMonitor = (err, req, res, next) => {
    logger.error('💥 Error detected', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userId: req.user?.id,
        timestamp: new Date().toISOString()
    });
    
    next(err);
};

/**
 * Utility functions for security
 */
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    
    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .replace(/[<>]/g, ''); // Remove angle brackets
};

const isValidFileType = (filename, allowedTypes) => {
    const extension = filename.split('.').pop().toLowerCase();
    return allowedTypes.includes(extension);
};

const isValidFileSize = (size, maxSize) => {
    return size <= maxSize;
};

/**
 * CORS options
 */
const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = [
            'http://localhost:8080',
            'http://127.0.0.1:8080'
        ];
        
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

module.exports = {
    logger,
    securityMiddleware,
    operationLogger,
    errorLogger,
    performanceMonitor,
    helmetConfig,
    requestLogger,
    errorMonitor,
    sanitizeInput,
    isValidFileType,
    isValidFileSize,
    corsOptions
};
