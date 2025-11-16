const mysql = require('mysql2/promise');

async function testSerialNumber() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'gymtec_erp'
    });

    console.log('\n========================================');
    console.log('🔍 TEST: serial_number en location_id = 7');
    console.log('========================================\n');

    try {
        const [rows] = await connection.execute(`
            SELECT 
                e.id,
                e.serial_number as original_serial,
                e.custom_id,
                COALESCE(NULLIF(e.serial_number, ''), e.custom_id, 'N/A') as computed_serial,
                em.name as model_name
            FROM Equipment e
            LEFT JOIN EquipmentModels em ON e.model_id = em.id
            WHERE e.location_id = 7
            LIMIT 5
        `);
        
        console.log('Primeros 5 equipos de location_id = 7:\n');
        rows.forEach((row, idx) => {
            console.log(`${idx + 1}. Equipo ID: ${row.id}`);
            console.log(`   ├─ Original serial_number: "${row.original_serial || 'NULL'}"`);
            console.log(`   ├─ custom_id: ${row.custom_id}`);
            console.log(`   ├─ Computed serial (COALESCE): ${row.computed_serial}`);
            console.log(`   └─ Modelo: ${row.model_name}\n`);
        });

        console.log('========================================');
        console.log('✅ Test completado');
        console.log('========================================\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

testSerialNumber();
