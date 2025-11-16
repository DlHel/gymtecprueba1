const mysql = require('mysql2/promise');

async function showDatabaseData() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'gymtec_erp'
    });

    console.log('\n========================================');
    console.log('📊 DATOS EN LA BASE DE DATOS GYMTEC_ERP');
    console.log('========================================\n');

    try {
        // Obtener todas las tablas
        const [tables] = await connection.execute('SHOW TABLES');
        
        console.log(`Total de tablas: ${tables.length}\n`);

        // Para cada tabla, contar registros
        for (const tableRow of tables) {
            const tableName = tableRow[`Tables_in_gymtec_erp`];
            
            try {
                const [countResult] = await connection.execute(`SELECT COUNT(*) as count FROM \`${tableName}\``);
                const count = countResult[0].count;
                
                console.log(`📋 ${tableName.padEnd(35)} → ${count.toString().padStart(5)} registros`);
                
                // Mostrar algunos datos de ejemplo para tablas principales
                if (count > 0 && ['Users', 'Clients', 'Locations', 'Equipment', 'Tickets', 'EquipmentModels'].includes(tableName)) {
                    const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\` LIMIT 3`);
                    console.log(`   └─ Ejemplo: ${JSON.stringify(rows[0], null, 0).substring(0, 100)}...`);
                }
            } catch (err) {
                console.log(`📋 ${tableName.padEnd(35)} → ERROR: ${err.message}`);
            }
        }

        console.log('\n========================================');
        console.log('✅ Análisis completado');
        console.log('========================================\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

showDatabaseData();
