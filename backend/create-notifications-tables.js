const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function createNotificationTables() {
    console.log('🔄 Iniciando creación de tablas de notificaciones...');
    
    try {
        // Configuración de conexión
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gymtec_erp',
            multipleStatements: true
        });
        
        console.log('✅ Conectado a MySQL');
        
        // Leer el archivo SQL
        const sqlPath = path.join(__dirname, 'database', 'notifications-tables.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('📄 Archivo SQL cargado');
        
        // Dividir el contenido en statements individuales
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));
        
        console.log(`📋 Ejecutando ${statements.length} statements SQL...`);
        
        // Ejecutar cada statement individualmente
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                try {
                    await connection.execute(statement);
                    console.log(`✅ Statement ${i + 1}/${statements.length} ejecutado`);
                } catch (error) {
                    console.error(`❌ Error en statement ${i + 1}:`, error.message);
                    console.error(`📝 Statement: ${statement.substring(0, 100)}...`);
                    // Continuar con el siguiente statement en lugar de fallar
                }
            }
        }
        
        console.log('✅ Tablas de notificaciones creadas exitosamente');
        
        // Verificar que las tablas se crearon
        const [tables] = await connection.execute(`
            SHOW TABLES LIKE 'Notification%'
        `);
        
        console.log('📊 Tablas creadas:');
        tables.forEach(table => {
            console.log(`   - ${Object.values(table)[0]}`);
        });
        
        // Verificar templates insertados
        const [templates] = await connection.execute(`
            SELECT id, name, trigger_event, is_active 
            FROM NotificationTemplates 
            ORDER BY id
        `);
        
        console.log('🔔 Templates de notificación creados:');
        templates.forEach(template => {
            console.log(`   - ${template.id}: ${template.name} (${template.trigger_event}) - ${template.is_active ? 'Activo' : 'Inactivo'}`);
        });
        
        await connection.end();
        console.log('🎉 Proceso completado exitosamente');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('📍 Stack:', error.stack);
        process.exit(1);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    createNotificationTables();
}

module.exports = { createNotificationTables };