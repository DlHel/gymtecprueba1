const mysql = require('mysql2/promise');

async function showEquipmentData() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'gymtec_erp'
    });

    console.log('\n========================================');
    console.log('🔧 TABLA EQUIPMENT - ANÁLISIS COMPLETO');
    console.log('========================================\n');

    try {
        // 1. Estructura de la tabla
        console.log('📋 ESTRUCTURA DE LA TABLA:\n');
        const [columns] = await connection.execute('DESCRIBE Equipment');
        columns.forEach(col => {
            console.log(`   ${col.Field.padEnd(25)} | ${col.Type.padEnd(20)} | ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} | Default: ${col.Default || 'NULL'}`);
        });

        // 2. Cantidad total
        const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM Equipment');
        console.log(`\n📊 TOTAL DE EQUIPOS: ${countResult[0].total}\n`);

        // 3. Primeros 10 registros con información completa
        console.log('📝 PRIMEROS 10 EQUIPOS (con modelo y ubicación):\n');
        const [equipmentRows] = await connection.execute(`
            SELECT 
                e.id,
                e.name,
                e.type,
                e.brand,
                e.model,
                e.serial_number,
                e.custom_id,
                e.location_id,
                e.model_id,
                l.name as location_name,
                c.name as client_name,
                em.name as model_name,
                em.brand as model_brand,
                em.category as model_category
            FROM Equipment e
            LEFT JOIN Locations l ON e.location_id = l.id
            LEFT JOIN Clients c ON l.client_id = c.id
            LEFT JOIN EquipmentModels em ON e.model_id = em.id
            LIMIT 10
        `);

        equipmentRows.forEach((eq, idx) => {
            console.log(`${idx + 1}. ID: ${eq.id}`);
            console.log(`   ├─ Nombre: "${eq.name || '(VACÍO)'}"`);
            console.log(`   ├─ Tipo: ${eq.type || '(sin tipo)'}`);
            console.log(`   ├─ Marca: ${eq.brand || '(sin marca)'}`);
            console.log(`   ├─ Modelo: ${eq.model || '(sin modelo)'}`);
            console.log(`   ├─ Serial: ${eq.serial_number || '(sin serial)'}`);
            console.log(`   ├─ Custom ID: ${eq.custom_id || '(sin custom_id)'}`);
            console.log(`   ├─ Cliente: ${eq.client_name || '(sin cliente)'}`);
            console.log(`   ├─ Sede: ${eq.location_name || '(sin sede)'}`);
            console.log(`   ├─ Modelo BD: ${eq.model_name || '(sin modelo en BD)'}`);
            console.log(`   ├─ Marca Modelo: ${eq.model_brand || '(sin marca)'}`);
            console.log(`   └─ Categoría: ${eq.model_category || '(sin categoría)'}\n`);
        });

        // 4. Estadísticas de campos vacíos
        console.log('📊 ESTADÍSTICAS DE CAMPOS:\n');
        
        const [nameStats] = await connection.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN name IS NULL OR name = '' THEN 1 ELSE 0 END) as vacios,
                SUM(CASE WHEN name IS NOT NULL AND name != '' THEN 1 ELSE 0 END) as con_valor
            FROM Equipment
        `);
        console.log(`   name:          ${nameStats[0].con_valor} con valor, ${nameStats[0].vacios} vacíos`);

        const [typeStats] = await connection.execute(`
            SELECT 
                SUM(CASE WHEN type IS NULL THEN 1 ELSE 0 END) as vacios,
                SUM(CASE WHEN type IS NOT NULL THEN 1 ELSE 0 END) as con_valor
            FROM Equipment
        `);
        console.log(`   type:          ${typeStats[0].con_valor} con valor, ${typeStats[0].vacios} vacíos`);

        const [brandStats] = await connection.execute(`
            SELECT 
                SUM(CASE WHEN brand IS NULL THEN 1 ELSE 0 END) as vacios,
                SUM(CASE WHEN brand IS NOT NULL THEN 1 ELSE 0 END) as con_valor
            FROM Equipment
        `);
        console.log(`   brand:         ${brandStats[0].con_valor} con valor, ${brandStats[0].vacios} vacíos`);

        const [serialStats] = await connection.execute(`
            SELECT 
                SUM(CASE WHEN serial_number IS NULL OR serial_number = '' THEN 1 ELSE 0 END) as vacios,
                SUM(CASE WHEN serial_number IS NOT NULL AND serial_number != '' THEN 1 ELSE 0 END) as con_valor
            FROM Equipment
        `);
        console.log(`   serial_number: ${serialStats[0].con_valor} con valor, ${serialStats[0].vacios} vacíos`);

        const [modelIdStats] = await connection.execute(`
            SELECT 
                SUM(CASE WHEN model_id IS NULL THEN 1 ELSE 0 END) as vacios,
                SUM(CASE WHEN model_id IS NOT NULL THEN 1 ELSE 0 END) as con_valor
            FROM Equipment
        `);
        console.log(`   model_id:      ${modelIdStats[0].con_valor} con valor, ${modelIdStats[0].vacios} vacíos`);

        // 5. Equipos por cliente
        console.log('\n\n📍 EQUIPOS POR CLIENTE:\n');
        const [clientStats] = await connection.execute(`
            SELECT 
                c.name as client_name,
                COUNT(e.id) as cantidad_equipos
            FROM Clients c
            LEFT JOIN Locations l ON c.id = l.client_id
            LEFT JOIN Equipment e ON l.id = e.location_id
            GROUP BY c.id, c.name
            ORDER BY cantidad_equipos DESC
        `);
        clientStats.forEach(stat => {
            console.log(`   ${stat.client_name.padEnd(30)} → ${stat.cantidad_equipos} equipos`);
        });

        console.log('\n========================================');
        console.log('✅ Análisis completado');
        console.log('========================================\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

showEquipmentData();
