const db = require('./src/db-adapter');

console.log('🔍 Verificando estructura de tabla TicketPhotos...\n');

db.all('DESCRIBE TicketPhotos', [], (err, columns) => {
    if (err) {
        console.log('❌ Error con tabla TicketPhotos:', err.message);
    } else {
        console.log('\n📋 ESTRUCTURA DE TicketPhotos:');
        console.table(columns.map(col => ({
            Field: col.Field,
            Type: col.Type,
            Null: col.Null,
            Key: col.Key,
            Default: col.Default
        })));
    }
    
    // También verificar si hay registros
    db.all('SELECT COUNT(*) as count FROM TicketPhotos', [], (err, countResult) => {
        if (err) {
            console.error('❌ Error contando registros:', err.message);
        } else {
            console.log(`\n📊 Total de fotos en TicketPhotos: ${countResult[0].count}`);
        }
        process.exit(0);
    });
});
