// Script para cambiar unit_price a INT (sin decimales para pesos chilenos)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });
const dbAdapter = require('./db-adapter');

console.log('🔄 Cambiando unit_price a INT (sin decimales)...');

// Cambiar tipo de columna
dbAdapter.run('ALTER TABLE inventory MODIFY COLUMN unit_price INT DEFAULT 0', [], function(err) {
    if (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
    
    console.log('✅ Columna unit_price cambiada a INT');
    
    // Actualizar la vista SpareParts
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
    
    dbAdapter.run(createViewSQL, [], function(err2) {
        if (err2) {
            console.error('❌ Error actualizando vista:', err2.message);
        } else {
            console.log('✅ Vista actualizada');
        }
        
        // Verificar
        dbAdapter.all('DESCRIBE inventory', [], (err3, cols) => {
            if (!err3) {
                const unitPrice = cols.find(c => c.Field === 'unit_price');
                console.log(`\n📊 unit_price ahora es: ${unitPrice ? unitPrice.Type : 'no encontrado'}`);
            }
            console.log('\n🎉 Listo - Los precios ahora son enteros (pesos chilenos)');
            process.exit(0);
        });
    });
});
