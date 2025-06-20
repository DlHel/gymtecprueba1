const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

console.log('🏢 ANÁLISIS DETALLADO DE SEDES/UBICACIONES');
console.log('==========================================\n');

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
});

async function analyzeLocations() {
    return new Promise((resolve, reject) => {
        console.log('📡 Conectando a MySQL...');
        
        connection.connect((err) => {
            if (err) {
                console.error('❌ Error de conexión:', err.message);
                reject(err);
                return;
            }
            
            console.log('✅ Conectado exitosamente\n');
            
            // 1. Contar total de ubicaciones
            connection.query('SELECT COUNT(*) as count FROM locations', (err, results) => {
                if (err) {
                    console.error('❌ Error al contar ubicaciones:', err.message);
                    connection.end();
                    reject(err);
                    return;
                }
                
                console.log('📊 ANÁLISIS GENERAL:');
                console.log(`   📍 Total de ubicaciones: ${results[0].count}\n`);
                
                // 2. Ubicaciones por cliente
                const query2 = `
                    SELECT 
                        c.id as client_id,
                        c.name as client_name,
                        c.rut as client_rut,
                        COUNT(l.id) as location_count
                    FROM clients c
                    LEFT JOIN locations l ON c.id = l.client_id
                    GROUP BY c.id, c.name, c.rut
                    ORDER BY location_count DESC, c.name
                `;
                
                connection.query(query2, (err, clientResults) => {
                    if (err) {
                        console.error('❌ Error al obtener ubicaciones por cliente:', err.message);
                        connection.end();
                        reject(err);
                        return;
                    }
                    
                    console.log('👥 UBICACIONES POR CLIENTE:');
                    clientResults.forEach(client => {
                        console.log(`   🏢 ${client.client_name} (${client.client_rut || 'Sin RUT'}): ${client.location_count} ubicaciones`);
                    });
                    
                    console.log('\n');
                    
                    // 3. Detalle de ubicaciones
                    connection.query(`
                        SELECT 
                            l.id, 
                            l.name, 
                            l.address, 
                            c.name as client_name
                        FROM locations l
                        LEFT JOIN clients c ON l.client_id = c.id
                        ORDER BY c.name, l.name
                    `, (err, locationDetails) => {
                        if (err) {
                            console.error('❌ Error al obtener detalles de ubicaciones:', err.message);
                            connection.end();
                            reject(err);
                            return;
                        }
                        
                        console.log('📍 DETALLE DE TODAS LAS UBICACIONES:');
                        let currentClient = '';
                        locationDetails.forEach(loc => {
                            if (loc.client_name !== currentClient) {
                                currentClient = loc.client_name;
                                console.log(`\n   🏢 ${currentClient}:`);
                            }
                            console.log(`      • ID: ${loc.id} - ${loc.name}`);
                            console.log(`        📍 ${loc.address || 'Sin dirección'}`);
                        });
                        
                        // 4. Equipos por ubicación
                        connection.query(`
                            SELECT 
                                l.id as location_id,
                                l.name as location_name,
                                c.name as client_name,
                                COUNT(e.id) as equipment_count
                            FROM locations l
                            LEFT JOIN clients c ON l.client_id = c.id
                            LEFT JOIN equipment e ON l.id = e.location_id
                            GROUP BY l.id, l.name, c.name
                            ORDER BY equipment_count DESC, c.name, l.name
                        `, (err, equipmentResults) => {
                            if (err) {
                                console.error('❌ Error al obtener equipos por ubicación:', err.message);
                                connection.end();
                                reject(err);
                                return;
                            }
                            
                            console.log('\n\n🏋️ EQUIPOS POR UBICACIÓN:');
                            equipmentResults.forEach(loc => {
                                const status = loc.equipment_count === 0 ? '❌ Sin equipos' : 
                                              loc.equipment_count < 3 ? '⚠️  Pocos equipos' : 
                                              '✅ Bien equipada';
                                console.log(`   ${status} ${loc.location_name} (${loc.client_name}): ${loc.equipment_count} equipos`);
                            });
                            
                            // 5. Resumen
                            const locationsWithEquipment = equipmentResults.filter(l => l.equipment_count > 0).length;
                            const locationsWithoutEquipment = equipmentResults.filter(l => l.equipment_count === 0).length;
                            
                            console.log('\n' + '='.repeat(60));
                            console.log('📋 RESUMEN:');
                            console.log(`   📊 Total ubicaciones: ${equipmentResults.length}`);
                            console.log(`   🏋️ Con equipos: ${locationsWithEquipment}`);
                            console.log(`   ❌ Sin equipos: ${locationsWithoutEquipment}`);
                            
                            const avgLocationsPerClient = (equipmentResults.length / clientResults.length).toFixed(1);
                            console.log(`   📈 Promedio ubicaciones por cliente: ${avgLocationsPerClient}`);
                            
                            console.log('\n✅ Análisis completado');
                            
                            connection.end();
                            resolve();
                        });
                    });
                });
            });
        });
    });
}

analyzeLocations().catch(err => {
    console.error('❌ Error general:', err.message);
    process.exit(1);
}); 