const mysql = require('mysql2');

console.log('🔧 CORRECCIÓN SIMPLE: SEDES Y EQUIPOS');
console.log('=====================================\n');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gymtec_erp'
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

// Función helper para promisificar queries
function queryPromise(sql, params = []) {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

async function fixLocationsAndEquipment() {
    try {
        console.log('📡 Conectando a MySQL...');
        await queryPromise('SELECT 1');
        console.log('✅ Conectado exitosamente\n');
        
        // 1. OBTENER MODELOS DISPONIBLES
        console.log('📋 Obteniendo modelos disponibles...');
        const models = await queryPromise('SELECT id, name FROM equipmentmodels ORDER BY id');
        console.log(`   ✅ ${models.length} modelos disponibles\n`);
        
        // 2. CREAR UBICACIONES CORRECTAS
        console.log('🏗️ Creando estructura correcta de ubicaciones...');
        
        let totalCreated = 0;
        const locationMap = {}; // Para mapear client_id a location_ids
        
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
                
                // Mapear ubicaciones para crear equipos
                locationMap[clientId] = locationMap[clientId] || [];
                locationMap[clientId].push(newLocationId);
                
                totalCreated++;
            }
            console.log('');
        }
        
        console.log(`✅ Creadas ${totalCreated} ubicaciones correctas\n`);
        
        // 3. CREAR EQUIPOS PARA CADA UBICACIÓN
        console.log('🏋️ Creando equipos para cada ubicación...');
        
        let totalEquipment = 0;
        let customIdCounter = 1;
        
        for (const [clientId, locationIds] of Object.entries(locationMap)) {
            const clientName = correctLocations[clientId].name;
            console.log(`   🏢 ${clientName}:`);
            
            for (let locIndex = 0; locIndex < locationIds.length; locIndex++) {
                const locationId = locationIds[locIndex];
                const locationName = correctLocations[clientId].locations[locIndex].name;
                
                // Crear 5-8 equipos por ubicación
                const equipmentCount = Math.floor(Math.random() * 4) + 5; // 5-8 equipos
                
                for (let i = 0; i < equipmentCount; i++) {
                    const randomModel = models[Math.floor(Math.random() * models.length)];
                    const customId = `EQ-${customIdCounter.toString().padStart(3, '0')}`;
                    
                    const statuses = ['Activo', 'Mantenimiento', 'Fuera de Servicio'];
                    const conditions = ['Excelente', 'Bueno', 'Regular', 'Necesita Mantenimiento'];
                    
                    const status = statuses[Math.floor(Math.random() * statuses.length)];
                    const condition = conditions[Math.floor(Math.random() * conditions.length)];
                    
                    await queryPromise(`
                        INSERT INTO equipment (
                            custom_id, model_id, location_id, status, condition, 
                            purchase_date, warranty_expiry, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                    `, [
                        customId,
                        randomModel.id,
                        locationId,
                        status,
                        condition,
                        '2023-01-01',
                        '2025-01-01'
                    ]);
                    
                    customIdCounter++;
                    totalEquipment++;
                }
                
                console.log(`      • ${locationName}: ${equipmentCount} equipos creados`);
            }
            console.log('');
        }
        
        console.log(`✅ Creados ${totalEquipment} equipos en total\n`);
        
        // 4. VERIFICAR RESULTADO FINAL
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
        
        console.log('📊 RESULTADO FINAL:');
        finalCheck.forEach(client => {
            console.log(`   🏢 ${client.client_name}: ${client.location_count} ubicaciones, ${client.equipment_count} equipos`);
        });
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ CORRECCIÓN COMPLETA FINALIZADA');
        console.log(`   • ${totalCreated} ubicaciones creadas`);
        console.log(`   • ${totalEquipment} equipos creados`);
        console.log('   • Estructura coherente y realista');
        
    } catch (error) {
        console.error('❌ Error durante corrección:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        connection.end();
        console.log('\n🔐 Conexión cerrada');
    }
}

fixLocationsAndEquipment(); 