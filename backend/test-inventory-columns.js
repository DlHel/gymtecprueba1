const mysql = require('mysql2/promise');

(async () => {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gymtec_erp'
        });

        console.log('=== ANÁLISIS TABLA INVENTORY ===\n');

        // Verificar columna is_active
        const [columns] = await conn.query("SHOW COLUMNS FROM Inventory LIKE 'is_active'");
        
        if (columns.length > 0) {
            console.log('✅ Columna is_active EXISTE');
            console.table(columns);
            
            const [data] = await conn.query('SELECT id, item_code, item_name, is_active FROM Inventory');
            console.log('\n📊 Valores de is_active en los registros:');
            console.table(data);
        } else {
            console.log('❌ Columna is_active NO EXISTE');
            
            const [allData] = await conn.query('SELECT * FROM Inventory LIMIT 1');
            console.log('\n📋 Columnas disponibles en la tabla:');
            console.log(Object.keys(allData[0]).join(', '));
            
            console.log('\n📦 Todos los registros sin filtro:');
            const [all] = await conn.query('SELECT id, item_code, item_name, current_stock FROM Inventory');
            console.table(all);
        }

        await conn.end();
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
})();
