const mysql = require('mysql2/promise');

const config = {
    host: 'localhost',
    user: 'root', 
    password: '',
    database: 'gymtec_erp'
};

async function checkDatabaseStructure() {
    console.log('🔍 Verificando estructura de la base de datos...\n');
    
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('✅ Conectado a la base de datos\n');

        // Listar todas las tablas
        console.log('📋 1. Tablas existentes:');
        const tables = await connection.execute('SHOW TABLES');
        console.log(`Total de tablas: ${tables[0].length}`);
        tables[0].forEach((table, index) => {
            console.log(`  ${index + 1}. ${Object.values(table)[0]}`);
        });
        console.log('');

        // Verificar si existe la tabla maintenancetasks
        const maintenanceExists = tables[0].find(table => 
            Object.values(table)[0] === 'maintenancetasks'
        );

        if (maintenanceExists) {
            console.log('📋 2. Estructura de maintenancetasks:');
            const structure = await connection.execute('DESCRIBE maintenancetasks');
            console.table(structure[0]);

            console.log('\n📋 3. Contenido de maintenancetasks:');
            const content = await connection.execute('SELECT * FROM maintenancetasks LIMIT 5');
            console.log(`Registros encontrados: ${content[0].length}`);
            if (content[0].length > 0) {
                console.table(content[0]);
            }
        } else {
            console.log('❌ La tabla maintenancetasks no existe');
        }

        // Verificar tabla assignmentdecisionlog
        const assignmentLogExists = tables[0].find(table => 
            Object.values(table)[0] === 'assignmentdecisionlog'
        );

        if (assignmentLogExists) {
            console.log('\n📋 4. Estructura de assignmentdecisionlog:');
            const logStructure = await connection.execute('DESCRIBE assignmentdecisionlog');
            console.table(logStructure[0]);
        } else {
            console.log('\n❌ La tabla assignmentdecisionlog no existe');
        }

        // Verificar técnicos en la tabla users
        console.log('\n📋 5. Técnicos en users:');
        const users = await connection.execute('SELECT id, username, role, specialization, max_daily_tasks FROM users WHERE role = "technician"');
        console.log(`Técnicos encontrados: ${users[0].length}`);
        if (users[0].length > 0) {
            console.table(users[0]);
        }

        console.log('\n✅ Verificación completada');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkDatabaseStructure();