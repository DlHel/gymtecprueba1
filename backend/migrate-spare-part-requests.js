const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

console.log('🔧 Agregando tabla SparePartRequests...');

// Configuración de conexión
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
});

const createTableSQL = `
CREATE TABLE IF NOT EXISTS \`SparePartRequests\` (
    \`id\` INT(11) NOT NULL AUTO_INCREMENT,
    \`ticket_id\` INT(11) NOT NULL,
    \`spare_part_name\` VARCHAR(200) NOT NULL,
    \`quantity_needed\` INT(11) NOT NULL DEFAULT 1,
    \`priority\` ENUM('Baja', 'Media', 'Alta', 'Crítica') DEFAULT 'Media',
    \`description\` TEXT,
    \`justification\` TEXT,
    \`requested_by\` VARCHAR(100),
    \`status\` ENUM('pendiente', 'aprobada', 'rechazada', 'completada') DEFAULT 'pendiente',
    \`approved_by\` VARCHAR(100) NULL,
    \`approved_at\` TIMESTAMP NULL,
    \`notes\` TEXT,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    FOREIGN KEY (\`ticket_id\`) REFERENCES \`Tickets\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX \`idx_spare_part_requests_ticket\` (\`ticket_id\`),
    INDEX \`idx_spare_part_requests_status\` (\`status\`),
    INDEX \`idx_spare_part_requests_priority\` (\`priority\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

db.query(createTableSQL, (err, result) => {
    if (err) {
        console.error('❌ Error creando tabla:', err.message);
        process.exit(1);
    }
    
    console.log('✅ Tabla SparePartRequests creada exitosamente');
    
    // Verificar que la tabla existe
    db.query('DESCRIBE SparePartRequests', (err, rows) => {
        if (err) {
            console.error('❌ Error verificando tabla:', err.message);
        } else {
            console.log('📋 Estructura de la tabla:');
            rows.forEach(row => {
                console.log(`   • ${row.Field}: ${row.Type} ${row.Null === 'NO' ? 'NOT NULL' : ''}`);
            });
        }
        
        db.end();
        console.log('\n🎉 Migración completada. Ahora se pueden guardar las solicitudes de repuestos.');
    });
});
