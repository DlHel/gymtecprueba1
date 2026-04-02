/**
 * GYMTEC ERP - Configuración Centralizada
 * 
 * REGLA: Todos los módulos deben importar configuración de aquí.
 * PROHIBIDO: Definir JWT_SECRET o DB_CONFIG en archivos de módulos.
 */

const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../../config.env') });

const config = {
    // JWT
    JWT_SECRET: process.env.JWT_SECRET || 'gymtec_secret_key_2024',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
    
    // Base de datos
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_USER: process.env.DB_USER || 'root',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_NAME: process.env.DB_NAME || 'gymtec_erp',
    DB_PORT: process.env.DB_PORT || 3306,
    
    // Servidor
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // Uploads
    UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    
    // Email (SMTP)
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM || '"GymTec ERP" <noreply@gymtecerp.com>'
};

const insecureJwtSecrets = new Set([
    'gymtec_secret_key_2024',
    'change-this-jwt-secret'
]);

// Validar configuración crítica
if (!config.JWT_SECRET || insecureJwtSecrets.has(config.JWT_SECRET)) {
    if (config.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET inseguro o placeholder. Define un secreto real antes de iniciar en producción.');
    }

    console.warn('⚠️  ADVERTENCIA: Usando JWT_SECRET por defecto. Cambiar en producción.');
}

module.exports = config;
