const db = require('./src/db-adapter');

console.log('🔍 Verificando equipos por sede...\n');

// Verificar cuántas sedes hay
db.all('SELECT id, name FROM Locations ORDER BY name', [], (err, locations) => {
    if (err) {
        console.log('❌ Error obteniendo sedes:', err.message);
        process.exit(1);
    }
    
    console.log(`📍 Total de sedes: ${locations.length}`);
    console.log('Sedes disponibles:');
    locations.forEach(loc => {
        console.log(`  - ${loc.id}: ${loc.name}`);
    });
    
    if (locations.length === 0) {
        console.log('❌ No hay sedes en la base de datos');
        process.exit(0);
    }
    
    // Tomar la primera sede como ejemplo
    const firstLocation = locations[0];
    console.log(`\n🔍 Verificando equipos en sede: ${firstLocation.name} (ID: ${firstLocation.id})`);
    
    // Consulta igual al endpoint
    const sql = `
        SELECT 
            e.id,
            e.name,
            e.type,
            e.brand,
            e.model,
            e.serial_number,
            e.activo,
            em.category,
            em.subcategory
        FROM Equipment e
        LEFT JOIN EquipmentModels em ON e.model_id = em.id
        WHERE e.location_id = ? AND e.activo = true
        ORDER BY e.name
    `;
    
    db.all(sql, [firstLocation.id], (err, equipment) => {
        if (err) {
            console.log('❌ Error obteniendo equipos:', err.message);
        } else {
            console.log(`\n📊 RESULTADO:`);
            console.log(`✅ Equipos activos en ${firstLocation.name}: ${equipment.length}`);
            
            if (equipment.length > 0) {
                console.log('\nPrimeros 5 equipos:');
                equipment.slice(0, 5).forEach((equip, idx) => {
                    console.log(`  ${idx + 1}. ${equip.name || 'Sin nombre'} (${equip.type || 'Sin tipo'}) - ${equip.brand || 'Sin marca'}`);
                });
                
                if (equipment.length > 5) {
                    console.log(`  ... y ${equipment.length - 5} equipos más`);
                }
            }
            
            // También verificar equipos inactivos
            db.all(sql.replace('e.activo = true', 'e.activo = false'), [firstLocation.id], (err, inactiveEquipment) => {
                if (!err) {
                    console.log(`\n⚠️ Equipos inactivos en ${firstLocation.name}: ${inactiveEquipment.length}`);
                    console.log(`📈 Total equipos (activos + inactivos): ${equipment.length + inactiveEquipment.length}`);
                }
                process.exit(0);
            });
        }
    });
});