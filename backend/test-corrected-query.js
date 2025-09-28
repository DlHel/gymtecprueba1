const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
});

console.log('🧪 PROBANDO CONSULTA CORREGIDA\n');

// Probar la consulta exacta que está en el servidor
const exactQuery = `
    SELECT 
        e.id,
        COALESCE(NULLIF(e.name, ''), em.name) as name,
        COALESCE(NULLIF(e.type, ''), 'Equipment') as type,
        COALESCE(NULLIF(e.brand, ''), em.brand) as brand,
        COALESCE(NULLIF(e.model, ''), em.model_code, em.name) as model,
        COALESCE(NULLIF(e.serial_number, ''), 'S/N no disponible') as serial_number,
        e.custom_id,
        COALESCE(em.category, 'Sin categoría') as category,
        CASE 
            WHEN ce.equipment_id IS NOT NULL THEN true 
            ELSE false 
        END as is_in_contract
    FROM Equipment e
    LEFT JOIN EquipmentModels em ON e.model_id = em.id
    LEFT JOIN contract_equipment ce ON e.id = ce.equipment_id AND ce.contract_id = ?
    WHERE e.location_id = ?
    ORDER BY COALESCE(NULLIF(e.name, ''), em.name)
    LIMIT 10
`;

// Probar con location_id = 1 (sin contract_id)
connection.query(exactQuery, [null, 1], (err, results) => {
    if (err) {
        console.error('❌ Error en consulta:', err.message);
        connection.end();
        return;
    }
    
    console.log('✅ RESULTADO DE LA CONSULTA CORREGIDA (Location ID: 1)');
    console.log('='.repeat(80));
    
    if (results.length === 0) {
        console.log('⚠️  No se encontraron equipos para location_id = 1');
        
        // Probar con otra location
        connection.query('SELECT DISTINCT location_id FROM Equipment LIMIT 3', (err, locations) => {
            if (err) {
                console.error('❌ Error obteniendo locations:', err.message);
                connection.end();
                return;
            }
            
            console.log('\n📍 Locations disponibles:');
            locations.forEach(loc => {
                console.log(`   - Location ID: ${loc.location_id}`);
            });
            
            if (locations.length > 0) {
                const testLocationId = locations[0].location_id;
                console.log(`\n🧪 Probando con Location ID: ${testLocationId}`);
                
                connection.query(exactQuery, [null, testLocationId], (err, results) => {
                    if (err) {
                        console.error('❌ Error en segunda consulta:', err.message);
                    } else {
                        console.log('✅ RESULTADO CON DATOS:');
                        results.forEach((row, index) => {
                            console.log(`\n${index + 1}. Equipment ID: ${row.id}`);
                            console.log(`   📝 Nombre: ${row.name}`);
                            console.log(`   🏷️  Tipo: ${row.type}`);
                            console.log(`   🏭 Marca: ${row.brand}`);
                            console.log(`   🔧 Modelo: ${row.model}`);
                            console.log(`   📟 S/N: ${row.serial_number}`);
                            console.log(`   🗂️  Categoría: ${row.category}`);
                            console.log(`   📋 En Contrato: ${row.is_in_contract}`);
                        });
                    }
                    connection.end();
                });
            } else {
                connection.end();
            }
        });
    } else {
        results.forEach((row, index) => {
            console.log(`\n${index + 1}. Equipment ID: ${row.id}`);
            console.log(`   📝 Nombre: ${row.name}`);
            console.log(`   🏷️  Tipo: ${row.type}`);
            console.log(`   🏭 Marca: ${row.brand}`);
            console.log(`   🔧 Modelo: ${row.model}`);
            console.log(`   📟 S/N: ${row.serial_number}`);
            console.log(`   🗂️  Categoría: ${row.category}`);
            console.log(`   📋 En Contrato: ${row.is_in_contract}`);
        });
        connection.end();
    }
});