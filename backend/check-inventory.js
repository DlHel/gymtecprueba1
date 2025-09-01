const db = require('./src/db-adapter');

console.log('🔍 Verificando inventario...');

// Verificar si hay datos en Inventory
db.all('SELECT COUNT(*) as count FROM Inventory', [], (err, rows) => {
    if (err) {
        console.error('❌ Error:', err);
        return;
    }
    
    const count = rows[0].count;
    console.log(`📦 Registros en Inventory: ${count}`);
    
    if (count === 0) {
        console.log('🆕 Creando datos de inventario de prueba...');
        
        // Crear algunos elementos de inventario
        const insertSql = `
            INSERT INTO Inventory (item_code, item_name, description, current_stock, minimum_stock, unit_cost, category_id, location_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const testItems = [
            ['BELT001', 'Correa de caminadora', 'Repuesto para caminadoras modelo X', 2, 5, 45.99, 1, 1],
            ['OIL001', 'Aceite hidráulico', 'Aceite para equipos hidráulicos', 1, 3, 25.50, 1, 1],
            ['CABLE001', 'Cable de acero', 'Cable de acero inoxidable 5mm', 0, 2, 15.75, 1, 1],
            ['FILTER001', 'Filtro de aire', 'Filtro de aire para compresores', 1, 4, 8.99, 1, 1]
        ];
        
        let completed = 0;
        testItems.forEach((item, index) => {
            db.run(insertSql, item, (err) => {
                if (err) {
                    console.error(`❌ Error insertando item ${index + 1}:`, err);
                } else {
                    console.log(`✅ Item ${index + 1} creado: ${item[1]}`);
                }
                
                completed++;
                if (completed === testItems.length) {
                    console.log('✅ Datos de inventario creados!');
                    process.exit(0);
                }
            });
        });
    } else {
        // Ver algunos registros existentes
        db.all('SELECT * FROM Inventory LIMIT 5', [], (err, rows) => {
            if (err) {
                console.error('❌ Error:', err);
            } else {
                console.log('📦 Primeros 5 registros:', rows);
            }
            process.exit(0);
        });
    }
});
