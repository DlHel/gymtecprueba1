const mysql = require('mysql2/promise');

async function checkTableStructures() {
    console.log('🔍 VERIFICANDO - Estructura de Tablas');
    console.log('=' .repeat(50));
    
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gymtec_erp'
        });
        
        console.log('✅ Conectado a MySQL');
        
        // 1. Verificar tabla Users
        console.log('\n📋 Estructura tabla Users:');
        const [usersStructure] = await connection.execute('DESCRIBE Users');
        usersStructure.forEach(col => {
            console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
        });
        
        // 2. Verificar tabla Equipment
        console.log('\n📋 Estructura tabla Equipment:');
        const [equipmentStructure] = await connection.execute('DESCRIBE Equipment');
        equipmentStructure.forEach(col => {
            console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
        });
        
        // 3. Verificar tabla NotificationQueue
        console.log('\n📋 Estructura tabla NotificationQueue:');
        try {
            const [queueStructure] = await connection.execute('DESCRIBE NotificationQueue');
            queueStructure.forEach(col => {
                console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
            });
        } catch (error) {
            console.log('❌ Tabla NotificationQueue no existe o tiene problemas');
        }
        
        // 4. Listar todas las tablas del sistema
        console.log('\n📋 Tablas existentes en gymtec_erp:');
        const [tables] = await connection.execute('SHOW TABLES');
        tables.forEach(table => {
            console.log(`   - ${Object.values(table)[0]}`);
        });
        
    } catch (error) {
        console.error('❌ ERROR:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkTableStructures();