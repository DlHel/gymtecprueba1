const path = require('path');

/**
 * Configuración Centralizada del Servidor
 * @bitacora: Configuración modular y centralizada
 */

const config = {
    // Configuración del servidor
    server: {
        port: process.env.PORT || 3000,
        environment: process.env.NODE_ENV || 'development'
    },

    // Configuración de base de datos
    database: {
        type: process.env.DB_TYPE || 'mysql',
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        name: process.env.DB_NAME || 'gymtec_erp',
        port: process.env.DB_PORT || 3306
    },

    // Configuración JWT
    jwt: {
        secret: process.env.JWT_SECRET || 'gymtec_secret_key_2024',
        expiresIn: process.env.JWT_EXPIRES_IN || '10h'
    },

    // Configuración de archivos
    upload: {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedImageTypes: ['jpeg', 'jpg', 'png', 'gif'],
        allowedDocumentTypes: ['pdf', 'doc', 'docx'],
        uploadsPath: path.join(__dirname, '../../uploads'),
        modelsPath: path.join(__dirname, '../../uploads/models/')
    },

    // Configuración de CORS
    cors: {
        origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:8080'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    },

    // Configuración de logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        enableConsole: process.env.ENABLE_CONSOLE_LOG !== 'false',
        enableFile: process.env.ENABLE_FILE_LOG === 'true',
        logDirectory: path.join(__dirname, '../../logs')
    },

    // Configuración de seguridad
    security: {
        bcryptSaltRounds: 12,
        rateLimitWindow: 15 * 60 * 1000, // 15 minutos
        rateLimitMax: 100, // máximo 100 requests por ventana
        helmetConfig: {
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                }
            }
        }
    },

    // Rutas estáticas
    staticPaths: {
        frontend: path.join(__dirname, '../../../frontend'),
        uploads: path.join(__dirname, '../../uploads')
    }
};

/**
 * Validar configuración crítica
 */
function validateConfig() {
    const criticalConfigs = [
        { key: 'jwt.secret', value: config.jwt.secret },
        { key: 'database.name', value: config.database.name }
    ];

    const missing = criticalConfigs.filter(item => !item.value);
    
    if (missing.length > 0) {
        console.error('❌ Configuraciones críticas faltantes:', missing.map(item => item.key));
        throw new Error('Configuración crítica faltante');
    }

    console.log('✅ Configuración validada correctamente');
    console.log(`🏃 Servidor configurado para entorno: ${config.server.environment}`);
    console.log(`🗄️ Base de datos: ${config.database.type}://${config.database.host}:${config.database.port}/${config.database.name}`);
}

/**
 * Obtener configuración por entorno
 */
function getEnvironmentConfig() {
    const env = config.server.environment;
    
    switch (env) {
        case 'production':
            return {
                ...config,
                logging: { ...config.logging, level: 'error' },
                security: { ...config.security, rateLimitMax: 50 }
            };
        case 'development':
            return {
                ...config,
                logging: { ...config.logging, level: 'debug' },
                security: { ...config.security, rateLimitMax: 200 }
            };
        case 'test':
            return {
                ...config,
                database: { ...config.database, name: config.database.name + '_test' },
                logging: { ...config.logging, level: 'warn' }
            };
        default:
            return config;
    }
}

module.exports = {
    config: getEnvironmentConfig(),
    validateConfig,
    raw: config
};
