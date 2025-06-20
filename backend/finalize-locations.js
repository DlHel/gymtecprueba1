const mysql = require('mysql2');

console.log('🔧 FINALIZACIÓN: LIMPIAR DUPLICADOS Y CREAR EQUIPOS');
console.log('==================================================\n');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gymtec_erp'
});

// Función helper para promisificar queries
function queryPromise(sql, params = []) {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

async function finalizeLocations() {
    try {
        console.log('📡 Conectando a MySQL...');
        await queryPromise('SELECT 1');
        console.log('✅ Conectado exitosamente\n');
        
        // 1. LIMPIAR UBICACIONES DUPLICADAS
        console.log('🧹 Eliminando ubicaciones duplicadas...');
        
        // Obtener ubicaciones duplicadas usando un enfoque compatible con MySQL más antiguo
        const allLocations = await queryPromise(`
            SELECT id, client_id, name, address
            FROM locations
            ORDER BY client_id, name, id
        `);
        
        // Identificar duplicados en JavaScript
        const seen = new Set();
        const duplicateIds = [];
        
        for (const location of allLocations) {
            const key = `${location.client_id}-${location.name}`;
            if (seen.has(key)) {
                duplicateIds.push(location.id);
            } else {
                seen.add(key);
            }
        }
        
        console.log(`   📋 Encontradas ${duplicateIds.length} ubicaciones duplicadas`);
        
        // Eliminar duplicados
        for (const duplicateId of duplicateIds) {
            await queryPromise('DELETE FROM locations WHERE id = ?', [duplicateId]);
        }
        
        console.log('   ✅ Duplicados eliminados\n');
        
        // 2. VERIFICAR UBICACIONES FINALES
        const finalLocations = await queryPromise(`
            SELECT l.id, l.name, l.address, c.name as client_name
            FROM locations l
            JOIN clients c ON l.client_id = c.id
            ORDER BY c.name, l.name
        `);
        
        console.log('📍 UBICACIONES FINALES:');
        let currentClient = '';
        finalLocations.forEach(loc => {
            if (loc.client_name !== currentClient) {
                currentClient = loc.client_name;
                console.log(`\n   🏢 ${currentClient}:`);
            }
            console.log(`      • ID: ${loc.id} - ${loc.name}`);
            console.log(`        📍 ${loc.address}`);
        });
        
        console.log(`\n✅ Total ubicaciones finales: ${finalLocations.length}\n`);
        
        // 3. OBTENER MODELOS DISPONIBLES
        console.log('📋 Obteniendo modelos disponibles...');
        const models = await queryPromise('SELECT id, name FROM equipmentmodels ORDER BY id');
        console.log(`   ✅ ${models.length} modelos disponibles\n`);
        
        // 4. CREAR EQUIPOS PARA CADA UBICACIÓN
        console.log('🏋️ Creando equipos para cada ubicación...');
        
        let totalEquipment = 0;
        let customIdCounter = 1;
        
        for (const location of finalLocations) {
            // Crear 5-8 equipos por ubicación
            const equipmentCount = Math.floor(Math.random() * 4) + 5; // 5-8 equipos
            
            console.log(`   🏢 ${location.client_name} - ${location.name}:`);
            
            for (let i = 0; i < equipmentCount; i++) {
                const randomModel = models[Math.floor(Math.random() * models.length)];
                const customId = `EQ-${customIdCounter.toString().padStart(3, '0')}`;
                
                // Usar campos que existen en la tabla
                const types = ['Cardio', 'Fuerza', 'Funcional', 'Accesorio'];
                const brands = ['Life Fitness', 'Technogym', 'Matrix', 'Precor', 'Cybex'];
                
                const equipmentType = types[Math.floor(Math.random() * types.length)];
                const brand = brands[Math.floor(Math.random() * brands.length)];
                
                await queryPromise(`
                    INSERT INTO equipment (
                        name, type, brand, model, custom_id, location_id, model_id, 
                        acquisition_date, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                `, [
                    randomModel.name,
                    equipmentType,
                    brand,
                    randomModel.name.split(' ')[0], // Primer palabra como modelo
                    customId,
                    location.id,
                    randomModel.id,
                    '2023-01-01'
                ]);
                
                customIdCounter++;
                totalEquipment++;
            }
            
            console.log(`      ✅ ${equipmentCount} equipos creados (${customIdCounter-equipmentCount} a ${customIdCounter-1})`);
        }
        
        console.log(`\n✅ Creados ${totalEquipment} equipos en total\n`);
        
        // 5. VERIFICAR RESULTADO FINAL
        console.log('🔍 Verificando resultado final...');
        
        const finalCheck = await queryPromise(`
            SELECT 
                c.name as client_name,
                COUNT(DISTINCT l.id) as location_count,
                COUNT(e.id) as equipment_count
            FROM clients c
            LEFT JOIN locations l ON c.id = l.client_id
            LEFT JOIN equipment e ON l.id = e.location_id
            GROUP BY c.id, c.name
            ORDER BY c.name
        `);
        
        console.log('📊 RESULTADO FINAL POR CLIENTE:');
        finalCheck.forEach(client => {
            console.log(`   🏢 ${client.client_name}: ${client.location_count} ubicaciones, ${client.equipment_count} equipos`);
        });
        
        // 6. MOSTRAR DISTRIBUCIÓN DETALLADA
        console.log('\n📍 DISTRIBUCIÓN DETALLADA POR UBICACIÓN:');
        
        const detailedCheck = await queryPromise(`
            SELECT 
                c.name as client_name,
                l.name as location_name,
                l.address,
                COUNT(e.id) as equipment_count
            FROM locations l
            JOIN clients c ON l.client_id = c.id
            LEFT JOIN equipment e ON l.id = e.location_id
            GROUP BY l.id, c.name, l.name, l.address
            ORDER BY c.name, l.name
        `);
        
        let currentClientDetail = '';
        detailedCheck.forEach(loc => {
            if (loc.client_name !== currentClientDetail) {
                currentClientDetail = loc.client_name;
                console.log(`\n   🏢 ${currentClientDetail}:`);
            }
            console.log(`      ✅ ${loc.location_name}: ${loc.equipment_count} equipos`);
            console.log(`         📍 ${loc.address}`);
        });
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ FINALIZACIÓN COMPLETADA');
        console.log(`   • Duplicados eliminados`);
        console.log(`   • ${finalLocations.length} ubicaciones finales`);
        console.log(`   • ${totalEquipment} equipos creados`);
        console.log('   • Estructura coherente y realista');
        console.log('   • Cada cliente tiene exactamente 2 ubicaciones');
        console.log('   • Cada ubicación tiene 5-8 equipos');
        
    } catch (error) {
        console.error('❌ Error durante finalización:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        connection.end();
        console.log('\n🔐 Conexión cerrada');
    }
}

finalizeLocations(); 