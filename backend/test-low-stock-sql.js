const db = require('./src/db-adapter');

console.log('🔍 Probando consulta SQL del endpoint...');

const sql = `
    SELECT 
        i.*,
        ic.name as category_name,
        l.name as location_name,
        ps.company_name as primary_supplier_name,
        (i.minimum_stock - i.current_stock) as reorder_needed,
        CASE 
            WHEN i.current_stock = 0 THEN 'out_of_stock'
            WHEN i.current_stock <= (i.minimum_stock * 0.5) THEN 'critical'
            ELSE 'low'
        END as urgency_level
    FROM Inventory i
    LEFT JOIN InventoryCategories ic ON i.category_id = ic.id
    LEFT JOIN Locations l ON i.location_id = l.id
    LEFT JOIN Suppliers ps ON i.primary_supplier_id = ps.id
    WHERE i.is_active = 1 AND i.current_stock <= i.minimum_stock
    ORDER BY 
        CASE 
            WHEN i.current_stock = 0 THEN 1
            WHEN i.current_stock <= (i.minimum_stock * 0.5) THEN 2
            ELSE 3
        END ASC,
        i.current_stock ASC`;

db.all(sql, [], (err, rows) => {
    if (err) {
        console.error('❌ Error en consulta:', err);
        process.exit(1);
    }
    
    console.log(`📦 Resultados: ${rows.length} items encontrados`);
    
    if (rows.length > 0) {
        rows.forEach(row => {
            console.log(`- ${row.item_name}: stock=${row.current_stock}, min=${row.minimum_stock}, urgency=${row.urgency_level}`);
        });
    } else {
        console.log('❌ No se encontraron items con stock bajo');
    }
    
    process.exit(0);
});
