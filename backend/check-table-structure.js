const db = require('./src/db-adapter');

console.log('🔍 Verificando estructura de tablas importantes...\n');

const tables = ['Locations', 'Clients', 'Equipment', 'EquipmentModels'];

tables.forEach(tableName => {
    db.all(`DESCRIBE ${tableName}`, [], (err, columns) => {
        if (err) {
            console.log(`❌ Error con tabla ${tableName}:`, err.message);
        } else {
            console.log(`\n📋 ESTRUCTURA DE ${tableName}:`);
            console.table(columns.map(col => ({
                Field: col.Field,
                Type: col.Type,
                Null: col.Null,
                Key: col.Key
            })));
        }
    });
});

setTimeout(() => process.exit(0), 2000);
