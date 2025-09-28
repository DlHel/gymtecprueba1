const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
});

console.log('🔍 DIAGNÓSTICO DE DATOS DE EQUIPOS\n');

// 1. Verificar estructura de tablas
console.log('=== 1. VERIFICANDO ESTRUCTURA DE TABLAS ===');
connection.query('DESCRIBE Equipment', (err, results) => {
    if (err) {
        console.error('❌ Error al describir Equipment:', err.message);
        return;
    }
    console.log('✅ Estructura Equipment:');
    results.forEach(col => {
        console.log(`   - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // 2. Verificar estructura EquipmentModels
    console.log('\n=== 2. VERIFICANDO ESTRUCTURA EQUIPMENTMODELS ===');
    connection.query('DESCRIBE EquipmentModels', (err, results) => {
        if (err) {
            console.error('❌ Error al describir EquipmentModels:', err.message);
            return;
        }
        console.log('✅ Estructura EquipmentModels:');
        results.forEach(col => {
            console.log(`   - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
        
        // 3. Verificar datos de muestra
        console.log('\n=== 3. VERIFICANDO DATOS DE MUESTRA ===');
        const sampleQuery = `
            SELECT e.id, e.name, e.type, e.brand, e.model, e.serial_number, e.custom_id, e.model_id,
                   em.id as model_table_id, em.name as model_name, em.brand as model_brand, em.category
            FROM Equipment e
            LEFT JOIN EquipmentModels em ON e.model_id = em.id
            LIMIT 5
        `;
        
        connection.query(sampleQuery, (err, results) => {
            if (err) {
                console.error('❌ Error al obtener datos de muestra:', err.message);
                return;
            }
            
            console.log('✅ Datos de muestra (primeros 5 equipos):');
            results.forEach((row, index) => {
                console.log(`\n   Equipo ${index + 1}:`);
                console.log(`     - Equipment.id: ${row.id}`);
                console.log(`     - Equipment.name: ${row.name || 'NULL'}`);
                console.log(`     - Equipment.type: ${row.type || 'NULL'}`);
                console.log(`     - Equipment.brand: ${row.brand || 'NULL'}`);
                console.log(`     - Equipment.model: ${row.model || 'NULL'}`);
                console.log(`     - Equipment.serial_number: ${row.serial_number || 'NULL'}`);
                console.log(`     - Equipment.model_id: ${row.model_id || 'NULL'}`);
                console.log(`     - EquipmentModels.id: ${row.model_table_id || 'NULL'}`);
                console.log(`     - EquipmentModels.name: ${row.model_name || 'NULL'}`);
                console.log(`     - EquipmentModels.brand: ${row.model_brand || 'NULL'}`);
                console.log(`     - EquipmentModels.category: ${row.category || 'NULL'}`);
            });
            
            // 4. Verificar totales
            console.log('\n=== 4. VERIFICANDO TOTALES ===');
            connection.query('SELECT COUNT(*) as total_equipment FROM Equipment', (err, results) => {
                if (err) {
                    console.error('❌ Error al contar equipos:', err.message);
                    return;
                }
                console.log(`✅ Total equipos: ${results[0].total_equipment}`);
                
                connection.query('SELECT COUNT(*) as total_models FROM EquipmentModels', (err, results) => {
                    if (err) {
                        console.error('❌ Error al contar modelos:', err.message);
                        return;
                    }
                    console.log(`✅ Total modelos: ${results[0].total_models}`);
                    
                    // 5. Verificar equipos sin modelo
                    console.log('\n=== 5. VERIFICANDO EQUIPOS SIN MODELO ===');
                    connection.query('SELECT COUNT(*) as sin_modelo FROM Equipment WHERE model_id IS NULL', (err, results) => {
                        if (err) {
                            console.error('❌ Error al contar equipos sin modelo:', err.message);
                            return;
                        }
                        console.log(`⚠️  Equipos sin model_id: ${results[0].sin_modelo}`);
                        
                        // 6. Probar la consulta exacta del endpoint
                        console.log('\n=== 6. PROBANDO CONSULTA EXACTA DEL ENDPOINT ===');
                        const exactQuery = `
                            SELECT e.id, e.name, e.type, e.brand, e.model, e.serial_number, e.custom_id,
                                   em.category,
                                   CASE WHEN ce.equipment_id IS NOT NULL THEN true ELSE false END as is_in_contract
                            FROM Equipment e
                            LEFT JOIN EquipmentModels em ON e.model_id = em.id
                            LEFT JOIN ContractEquipment ce ON e.id = ce.equipment_id
                            WHERE e.location_id = 1
                            ORDER BY e.name ASC
                            LIMIT 3
                        `;
                        
                        connection.query(exactQuery, (err, results) => {
                            if (err) {
                                console.error('❌ Error en consulta exacta:', err.message);
                            } else {
                                console.log('✅ Resultado consulta exacta (location_id=1):');
                                console.log(JSON.stringify(results, null, 2));
                            }
                            
                            connection.end();
                            console.log('\n🔍 DIAGNÓSTICO COMPLETADO');
                        });
                    });
                });
            });
        });
    });
});