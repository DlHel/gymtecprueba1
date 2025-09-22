// Crear Tabla de Notificaciones para SLA - Corrección Final
const mysql = require('mysql2');
require('dotenv').config({ path: '../config.env' });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
};

async function createNotificationQueue() {
    let connection;
    
    try {
        connection = mysql.createConnection(dbConfig);
        
        console.log('🔧 Creando tabla notification_queue para sistema SLA...');

        // Crear tabla de cola de notificaciones
        const createNotificationQueueTable = `
            CREATE TABLE IF NOT EXISTS notification_queue (
                id INT AUTO_INCREMENT PRIMARY KEY,
                type VARCHAR(100) NOT NULL,
                recipient_type VARCHAR(100) NOT NULL,
                recipient_id INT NULL,
                message TEXT NOT NULL,
                priority ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
                data JSON NULL,
                status ENUM('pending', 'sent', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
                attempts INT DEFAULT 0,
                max_attempts INT DEFAULT 3,
                sent_at TIMESTAMP NULL,
                failed_at TIMESTAMP NULL,
                error_message TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                INDEX idx_type (type),
                INDEX idx_recipient (recipient_type, recipient_id),
                INDEX idx_status (status),
                INDEX idx_priority (priority),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;

        await executeQuery(connection, createNotificationQueueTable);
        console.log('✅ Tabla notification_queue creada');

        // Corregir columna en sla_action_log
        const fixActionLogColumn = `
            ALTER TABLE sla_action_log 
            CHANGE COLUMN executed_at executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        `;

        try {
            await executeQuery(connection, fixActionLogColumn);
            console.log('✅ Columna created_at agregada a sla_action_log');
        } catch (error) {
            if (!error.message.includes('Duplicate column name')) {
                console.warn('⚠️  Error corrigiendo sla_action_log:', error.message);
            } else {
                console.log('ℹ️  Columna created_at ya existe en sla_action_log');
            }
        }

        // Crear tabla de configuración de notificaciones
        const createNotificationSettings = `
            CREATE TABLE IF NOT EXISTS notification_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                notification_type VARCHAR(100) NOT NULL,
                method ENUM('email', 'sms', 'push', 'in_app') NOT NULL,
                enabled BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                UNIQUE KEY unique_user_type_method (user_id, notification_type, method),
                INDEX idx_user_id (user_id),
                INDEX idx_type (notification_type),
                INDEX idx_enabled (enabled),
                
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;

        await executeQuery(connection, createNotificationSettings);
        console.log('✅ Tabla notification_settings creada');

        // Insertar configuraciones por defecto para notificaciones SLA
        const insertDefaultSettings = `
            INSERT IGNORE INTO notification_settings (user_id, notification_type, method, enabled)
            SELECT 
                u.id,
                'sla_violation',
                'email',
                TRUE
            FROM users u 
            WHERE u.role IN ('Admin', 'Supervisor')
        `;

        await executeQuery(connection, insertDefaultSettings);
        console.log('✅ Configuraciones de notificación por defecto insertadas');

        // Verificar estructura
        console.log('\n📊 Verificando estructura de nuevas tablas...');
        
        const tables = ['notification_queue', 'notification_settings'];
        
        for (const table of tables) {
            const describeResult = await executeQuery(connection, `DESCRIBE ${table}`);
            console.log(`\n📋 Estructura de ${table}:`);
            describeResult.forEach(col => {
                console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Extra}`);
            });
        }

        console.log('\n✅ Sistema de notificaciones SLA completado');
        console.log('\n📈 Funcionalidades añadidas:');
        console.log('  • Cola de notificaciones con retry automático');
        console.log('  • Configuración personalizada por usuario');
        console.log('  • Soporte para múltiples métodos de notificación');
        console.log('  • Tracking de estado y errores');
        console.log('  • Log completo de acciones corregido');

    } catch (error) {
        console.error('❌ Error creando sistema de notificaciones:', error);
        throw error;
    } finally {
        if (connection) {
            connection.end();
        }
    }
}

function executeQuery(connection, sql) {
    return new Promise((resolve, reject) => {
        connection.query(sql, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

// Ejecutar si se llama directamente
if (require.main === module) {
    createNotificationQueue()
        .then(() => {
            console.log('\n🎉 Sistema de notificaciones SLA completo');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Error fatal:', error);
            process.exit(1);
        });
}

module.exports = { createNotificationQueue };