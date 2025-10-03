const mysql = require('mysql2/promise');

(async () => {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gymtec_erp'
        });

        console.log('=== ANÁLISIS DE TABLAS DE INVENTARIO ===\n');

        // Listar todas las tablas
        const [allTables] = await conn.query('SHOW TABLES');
        console.log('📋 Tablas en la base de datos:');
        const tableNames = allTables.map(t => Object.values(t)[0]);
        
        // Filtrar tablas relacionadas con inventario
        const inventoryTables = tableNames.filter(t => 
            t.toLowerCase().includes('inventory') || 
            t.toLowerCase().includes('purchase') || 
            t.toLowerCase().includes('supplier') ||
            t.toLowerCase().includes('movement')
        );
        
        console.log('\n📦 Tablas relacionadas con inventario:');
        inventoryTables.forEach(t => console.log('  ✅', t));

        // Verificar tablas específicas que necesitamos
        console.log('\n=== VERIFICACIÓN DE TABLAS NECESARIAS ===\n');
        
        const tablesToCheck = [
            'Inventory',
            'InventoryMovements', 
            'InventoryCategories',
            'PurchaseOrders',
            'PurchaseOrderItems',
            'Suppliers',
            'TechnicianInventory',
            'InventoryAssignments'
        ];

        for(const table of tablesToCheck) {
            try {
                const [result] = await conn.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`${table.padEnd(25)} ✅ Existe (${result[0].count} registros)`);
                
                // Mostrar estructura
                const [columns] = await conn.query(`SHOW COLUMNS FROM ${table}`);
                console.log(`  Columnas: ${columns.map(c => c.Field).join(', ')}`);
                console.log('');
            } catch(err) {
                console.log(`${table.padEnd(25)} ❌ No existe`);
            }
        }

        await conn.end();
    } catch(err) {
        console.error('❌ Error:', err.message);
    }
})();
