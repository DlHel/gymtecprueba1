// Script para agregar unit_price a inventory (tabla base de SpareParts)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });
const dbAdapter = require('./db-adapter');

console.log('🔄 Ejecutando migración: agregar unit_price a inventory...');

// Primero verificar la estructura actual de inventory
dbAdapter.all('DESCRIBE inventory', [], (err, cols) => {
    if (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
    
    console.log('Columnas actuales de inventory:');
    const colNames = cols.map(c => c.Field);
    colNames.forEach(c => console.log(`  - ${c}`));
    
    if (colNames.includes('unit_price')) {
        console.log('\n✅ La columna unit_price ya existe en inventory');
        verifyView();
        return;
    }
    
    // Agregar unit_price a inventory
    console.log('\n➕ Agregando columna unit_price a inventory...');
    dbAdapter.run('ALTER TABLE inventory ADD COLUMN unit_price DECIMAL(10,2) DEFAULT 0', [], function(err) {
        if (err) {
            console.error('❌ Error agregando unit_price:', err.message);
            process.exit(1);
        }
        
        console.log('✅ Columna unit_price agregada a inventory');
        
        // Ahora actualizar la vista SpareParts para incluir unit_price
        updateView();
    });
});

function updateView() {
    console.log('\n🔄 Actualizando vista SpareParts para incluir unit_price...');
    
    const createViewSQL = `
        CREATE OR REPLACE VIEW spareparts AS 
        SELECT 
            i.id AS id,
            i.item_name AS name,
            i.item_code AS sku,
            i.current_stock AS current_stock,
            i.minimum_stock AS minimum_stock,
            i.unit_price AS unit_price,
            i.created_at AS created_at,
            i.updated_at AS updated_at
        FROM inventory i 
        WHERE i.category_id = 1
    `;
    
    dbAdapter.run(createViewSQL, [], function(err) {
        if (err) {
            console.error('❌ Error actualizando vista:', err.message);
            process.exit(1);
        }
        
        console.log('✅ Vista SpareParts actualizada');
        verifyView();
    });
}

function verifyView() {
    console.log('\n🔍 Verificando estructura final de SpareParts...');
    dbAdapter.all('DESCRIBE SpareParts', [], (err, cols) => {
        if (err) {
            console.error('❌ Error:', err.message);
            process.exit(1);
        }
        
        console.log('Columnas finales de SpareParts:');
        cols.forEach(c => console.log(`  - ${c.Field}: ${c.Type}`));
        
        console.log('\n🎉 Migración completada exitosamente');
        process.exit(0);
    });
}
