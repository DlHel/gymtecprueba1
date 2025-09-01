const db = require('./src/db-adapter');

console.log('🔍 Verificando estructura de tabla Inventory...');

db.all('DESCRIBE Inventory', [], (err, rows) => {
    if (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    } 
    
    console.log('📋 Estructura de tabla Inventory:');
    console.log('Field\t\tType\t\tNull\tKey\tDefault');
    console.log('------------------------------------------------');
    rows.forEach(row => {
        console.log(`${row.Field}\t\t${row.Type}\t\t${row.Null}\t${row.Key}\t${row.Default || 'NULL'}`);
    });
    
    process.exit(0);
});
