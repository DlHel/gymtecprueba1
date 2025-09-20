const mysql = require('mysql2/promise');

// Configuración de la base de datos MySQL
const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp',
    charset: 'utf8mb4'
};

async function checkTables() {
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('✅ Conectado a MySQL');
        
        // Verificar tablas de notificaciones
        const [tables] = await connection.execute("SHOW TABLES LIKE 'Notification%'");
        console.log('\n📊 Tablas de notificaciones encontradas:');
        if (tables.length === 0) {
            console.log('❌ No se encontraron tablas de notificaciones');
            console.log('💡 Ejecutar: node database/setup-mysql.js para crear las tablas');
        } else {
            tables.forEach(table => {
                console.log(`✅ ${Object.values(table)[0]}`);
            });
        }
        
        // Si existen, verificar contenido de templates
        if (tables.length > 0) {
            try {
                const [templates] = await connection.execute('SELECT COUNT(*) as count FROM NotificationTemplates');
                console.log(`\n📝 Templates encontrados: ${templates[0].count}`);
                
                const [queue] = await connection.execute('SELECT COUNT(*) as count FROM NotificationQueue');
                console.log(`📮 Items en cola: ${queue[0].count}`);
                
                const [logs] = await connection.execute('SELECT COUNT(*) as count FROM NotificationLog');
                console.log(`📋 Logs registrados: ${logs[0].count}`);
            } catch (error) {
                console.log(`❌ Error accediendo a datos: ${error.message}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error conectando a la base de datos:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkTables();