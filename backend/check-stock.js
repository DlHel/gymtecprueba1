const db = require('./src/db-adapter');

console.log('🔍 Verificando stock actual...');

db.all('SELECT item_name, current_stock, minimum_stock FROM Inventory', [], (err, rows) => {
    if (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
    
    console.log('📦 Items de inventario:');
    rows.forEach(row => {
        const isLowStock = row.current_stock <= row.minimum_stock;
        const status = isLowStock ? '⚠️ STOCK BAJO' : '✅ OK';
        console.log(`${row.item_name}: stock=${row.current_stock}, min=${row.minimum_stock} ${status}`);
    });
    
    process.exit(0);
});
