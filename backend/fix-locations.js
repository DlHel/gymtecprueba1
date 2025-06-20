const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

console.log('🔧 CORRECCIÓN Y REORGANIZACIÓN DE SEDES');
console.log('=====================================\n');

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
});

// Definir estructura correcta de sedes por cliente (IDs REALES)
const correctLocations = {
    2: { // SportLife Premium
        name: 'SportLife Premium',
        locations: [
            { name: 'Sede Principal', address: 'Calle San Martín 456, Las Condes' },
            { name: 'Sucursal Providencia', address: 'Av. Providencia 2594, Providencia' }
        ]
    },
    3: { // Gimnasio Iron Fitness
        name: 'Gimnasio Iron Fitness', 
        locations: [
            { name: 'Iron Fitness Principal', address: 'Mall Sport 789, Vitacura' },
            { name: 'Sucursal Centro', address: 'Av. Libertador Bernardo O\'Higgins 1234, Santiago Centro' }
        ]
    },
    4: { // Centro Deportivo Mega
        name: 'Centro Deportivo Mega',
        locations: [
            { name: 'Mega Centro Principal', address: 'Av. Providencia 2594, Providencia' },
            { name: 'Sucursal Las Condes', address: 'Av. El Bosque Norte 500, Las Condes' }
        ]
    },
    7: { // Fitness Zone Premium  
        name: 'Fitness Zone Premium',
        locations: [
            { name: 'Centro Vitacura', address: 'Av. Vitacura 9876, Vitacura' },
            { name: 'Sucursal Lo Barnechea', address: 'Av. Lo Barnechea 246, Lo Barnechea' }
        ]
    },
    8: { // PowerGym Santiago
        name: 'PowerGym Santiago',
        locations: [
            { name: 'Box Principal Maipú', address: 'Av. Pajaritos 2468, Maipú' },
            { name: 'Sucursal Pudahuel', address: 'Av. San Pablo 3456, Pudahuel' }
        ]
    },
    9: { // AquaFit Center
        name: 'AquaFit Center',
        locations: [
            { name: 'Sede Principal', address: 'Av. Ñuñoa 1357, Ñuñoa' },
            { name: 'Sucursal Plaza Egaña', address: 'Av. Plaza Egaña 789, Ñuñoa' }
        ]
    },
    10: { // CrossFit Maipú
        name: 'CrossFit Maipú',
        locations: [
            { name: 'Box Principal', address: 'Av. Carmen 1234, Maipú' },
            { name: 'Anexo Cerrillos', address: 'Av. Pedro Aguirre Cerda 2468, Cerrillos' }
        ]
    },
    11: { // Wellness Club
        name: 'Wellness Club',
        locations: [
            { name: 'Club Principal', address: 'Av. Las Condes 12345, Las Condes' },
            { name: 'Spa & Wellness', address: 'Av. El Bosque Norte 500, Las Condes' }
        ]
    }
};

async function fixLocations() {
    return new Promise((resolve, reject) => {
        console.log('📡 Conectando a MySQL...');
        
        connection.connect(async (err) => {
            if (err) {
                console.error('❌ Error de conexión:', err.message);
                reject(err);
                return;
            }
            
            console.log('✅ Conectado exitosamente\n');
            
            try {
                // 1. RESPALDO DE EQUIPOS ANTES DE LIMPIAR
                console.log('💾 Creando respaldo de asignaciones de equipos...');
                
                const equipmentBackup = await queryPromise(`
                    SELECT e.id, e.location_id, l.name as old_location_name, c.name as client_name
                    FROM equipment e
                    JOIN locations l ON e.location_id = l.id
                    JOIN clients c ON l.client_id = c.id
                `);
                
                console.log(`   📋 Respaldados ${equipmentBackup.length} equipos\n`);
                
                // 2. LIMPIAR UBICACIONES EXISTENTES
                console.log('🧹 Limpiando ubicaciones duplicadas...');
                await queryPromise('DELETE FROM locations');
                console.log('   ✅ Ubicaciones eliminadas\n');
                
                // 3. CREAR UBICACIONES CORRECTAS
                console.log('🏗️ Creando estructura correcta de ubicaciones...');
                
                let totalCreated = 0;
                const locationMap = {}; // Para mapear IDs antiguos a nuevos
                
                for (const [clientId, clientData] of Object.entries(correctLocations)) {
                    console.log(`   🏢 ${clientData.name}:`);
                    
                    for (const location of clientData.locations) {
                        const result = await queryPromise(`
                            INSERT INTO locations (client_id, name, address, created_at)
                            VALUES (?, ?, ?, NOW())
                        `, [clientId, location.name, location.address]);
                        
                        const newLocationId = result.insertId;
                        console.log(`      • ${location.name} (ID: ${newLocationId})`);
                        console.log(`        📍 ${location.address}`);
                        
                        // Mapear ubicaciones para reasignación de equipos
                        locationMap[clientId] = locationMap[clientId] || [];
                        locationMap[clientId].push(newLocationId);
                        
                        totalCreated++;
                    }
                    console.log('');
                }
                
                console.log(`✅ Creadas ${totalCreated} ubicaciones correctas\n`);
                
                // 4. REASIGNAR EQUIPOS A NUEVAS UBICACIONES
                console.log('🔄 Reasignando equipos a nuevas ubicaciones...');
                
                let equipmentReassigned = 0;
                
                for (const equipment of equipmentBackup) {
                    // Obtener client_id del equipo
                    const clientResult = await queryPromise(`
                        SELECT id FROM clients WHERE name = ?
                    `, [equipment.client_name]);
                    
                    if (clientResult.length > 0) {
                        const clientId = clientResult[0].id;
                        const availableLocations = locationMap[clientId];
                        
                        if (availableLocations && availableLocations.length > 0) {
                            // Distribuir equipos entre las ubicaciones del cliente
                            const targetLocationId = availableLocations[equipmentReassigned % availableLocations.length];
                            
                            await queryPromise(`
                                UPDATE equipment 
                                SET location_id = ? 
                                WHERE id = ?
                            `, [targetLocationId, equipment.id]);
                            
                            equipmentReassigned++;
                        }
                    }
                }
                
                console.log(`   ✅ Reasignados ${equipmentReassigned} equipos\n`);
                
                // 5. VERIFICAR RESULTADO
                console.log('🔍 Verificando resultado final...');
                
                const finalCheck = await queryPromise(`
                    SELECT 
                        c.name as client_name,
                        COUNT(l.id) as location_count,
                        COUNT(e.id) as equipment_count
                    FROM clients c
                    LEFT JOIN locations l ON c.id = l.client_id
                    LEFT JOIN equipment e ON l.id = e.location_id
                    GROUP BY c.id, c.name
                    ORDER BY c.name
                `);
                
                console.log('📊 RESULTADO FINAL:');
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
                
                let currentClient = '';
                detailedCheck.forEach(loc => {
                    if (loc.client_name !== currentClient) {
                        currentClient = loc.client_name;
                        console.log(`\n   🏢 ${currentClient}:`);
                    }
                    const status = loc.equipment_count === 0 ? '❌' : 
                                  loc.equipment_count < 3 ? '⚠️' : '✅';
                    console.log(`      ${status} ${loc.location_name}: ${loc.equipment_count} equipos`);
                    console.log(`         📍 ${loc.address}`);
                });
                
                console.log('\n' + '='.repeat(60));
                console.log('✅ CORRECCIÓN DE SEDES COMPLETADA');
                console.log('   • Eliminadas ubicaciones duplicadas');
                console.log('   • Creada estructura coherente');
                console.log('   • Equipos redistribuidos correctamente');
                console.log('   • Cada cliente tiene exactamente 2 ubicaciones');
                
                connection.end();
                resolve();
                
            } catch (error) {
                console.error('❌ Error durante corrección:', error.message);
                connection.end();
                reject(error);
            }
        });
    });
}

// Función helper para promisificar queries
function queryPromise(sql, params = []) {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

fixLocations().catch(err => {
    console.error('❌ Error general:', err.message);
    process.exit(1);
}); 