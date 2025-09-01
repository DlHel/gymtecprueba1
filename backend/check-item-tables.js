const db = require('./src/db-adapter');

console.log('🔍 Verificando tablas de items de checklist...');

db.all('SHOW TABLES', [], (err, rows) => {
    if (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
    
    const tables = rows.map(row => Object.values(row)[0]);
    
    console.log('🎯 Tablas con "item" en el nombre:');
    const itemTables = tables.filter(table => 
        table.toLowerCase().includes('item')
    );
    
    itemTables.forEach(table => {
        console.log(`- ${table}`);
    });
    
    process.exit(0);
});
