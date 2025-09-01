const db = require('./src/db-adapter');

console.log('🔍 Verificando tablas relacionadas con checklist...');

// Buscar todas las tablas
db.all('SHOW TABLES', [], (err, rows) => {
    if (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
    
    console.log('📋 Todas las tablas:');
    const tables = rows.map(row => Object.values(row)[0]);
    
    // Filtrar tablas relacionadas con checklist
    const checklistTables = tables.filter(table => 
        table.toLowerCase().includes('checklist') || 
        table.toLowerCase().includes('ticket')
    );
    
    console.log('🎯 Tablas relacionadas con checklist/tickets:');
    checklistTables.forEach(table => {
        console.log(`- ${table}`);
    });
    
    if (checklistTables.length === 0) {
        console.log('❌ No se encontraron tablas de checklist');
        console.log('💡 Puede que necesitemos crear la funcionalidad');
    }
    
    process.exit(0);
});
