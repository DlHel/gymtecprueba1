// Script para cargar precios de ejemplo en repuestos
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });
const dbAdapter = require('./db-adapter');

console.log('💰 Cargando precios de ejemplo para repuestos...');

// Primero obtener todos los repuestos actuales
dbAdapter.all('SELECT id, name, sku, unit_price FROM SpareParts', [], (err, parts) => {
    if (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
    
    console.log(`📋 Encontrados ${parts.length} repuestos\n`);
    
    // Precios de ejemplo basados en tipos comunes de repuestos de gimnasio
    const priceMap = {
        'LUBE': 15000,    // Kit de lubricación
        'BELT': 45000,    // Correas
        'MOTOR': 250000,  // Motores
        'BOARD': 180000,  // Placas/tarjetas electrónicas
        'CABLE': 25000,   // Cables
        'SENSOR': 35000,  // Sensores
        'PULLEY': 28000,  // Poleas
        'BEARING': 18000, // Rodamientos
        'GRIP': 12000,    // Agarres/mangos
        'PEDAL': 22000,   // Pedales
        'SEAT': 55000,    // Asientos
        'DISPLAY': 85000, // Displays
        'PAD': 15000,     // Almohadillas
        'ROLLER': 32000,  // Rodillos
        'SPRING': 20000,  // Resortes
    };
    
    let updated = 0;
    let pending = parts.length;
    
    if (parts.length === 0) {
        console.log('⚠️ No hay repuestos para actualizar');
        process.exit(0);
    }
    
    parts.forEach(part => {
        // Buscar precio basado en SKU o nombre
        let price = 10000; // Precio por defecto
        
        for (const [key, value] of Object.entries(priceMap)) {
            if ((part.sku && part.sku.toUpperCase().includes(key)) || 
                (part.name && part.name.toUpperCase().includes(key))) {
                price = value;
                break;
            }
        }
        
        // Agregar variación aleatoria ±20%
        const variation = 0.8 + Math.random() * 0.4;
        price = Math.round(price * variation);
        
        // Actualizar en la tabla inventory (la tabla base)
        dbAdapter.run(
            'UPDATE inventory SET unit_price = ? WHERE id = ?',
            [price, part.id],
            function(err) {
                if (err) {
                    console.error(`  ❌ Error actualizando ${part.name}:`, err.message);
                } else if (this.changes > 0) {
                    console.log(`  ✅ ${part.name}: $${price.toLocaleString('es-CL')}`);
                    updated++;
                }
                
                pending--;
                if (pending === 0) {
                    console.log(`\n🎉 Actualización completada: ${updated} repuestos con precio`);
                    
                    // Verificar
                    dbAdapter.all('SELECT name, sku, unit_price FROM SpareParts ORDER BY name', [], (err, final) => {
                        if (!err) {
                            console.log('\n📊 Precios finales:');
                            final.forEach(p => {
                                console.log(`  ${p.name}: $${(p.unit_price || 0).toLocaleString('es-CL')}`);
                            });
                        }
                        process.exit(0);
                    });
                }
            }
        );
    });
});
