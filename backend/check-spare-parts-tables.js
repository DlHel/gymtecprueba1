const db = require('./src/db-adapter');

console.log('🔍 Verificando estructura de tabla ticketspareparts...\n');

db.all('DESCRIBE ticketspareparts', [], (err, columns) => {
    if (err) {
        console.log('❌ Error con tabla ticketspareparts:', err.message);
    } else {
        console.log('\n📋 ESTRUCTURA DE ticketspareparts:');
        console.table(columns.map(col => ({
            Field: col.Field,
            Type: col.Type,
            Null: col.Null,
            Key: col.Key,
            Default: col.Default
        })));
    }
    
    // También verificar tabla spareparts
    db.all('DESCRIBE spareparts', [], (err, columns2) => {
        if (err) {
            console.log('❌ Error con tabla spareparts:', err.message);
        } else {
            console.log('\n📋 ESTRUCTURA DE spareparts:');
            console.table(columns2.map(col => ({
                Field: col.Field,
                Type: col.Type,
                Null: col.Null,
                Key: col.Key,
                Default: col.Default
            })));
        }
        
        process.exit(0);
    });
});
