const DatabaseAdapter = require('./src/db-adapter');

// Crear instancia del adaptador
const db = new DatabaseAdapter();

console.log('🔍 VERIFICANDO ESTRUCTURA DE TABLAS');
console.log('=====================================');

// Verificar tabla Quotes
console.log('\n📋 Estructura de tabla Quotes:');
db.all("DESCRIBE Quotes", [], (err, quotesColumns) => {
    if (err) {
        console.error('❌ Error consultando Quotes:', err.message);
    } else if (quotesColumns.length === 0) {
        console.log('❌ La tabla Quotes NO EXISTE');
    } else {
        console.log('✅ Tabla Quotes encontrada con columnas:');
        quotesColumns.forEach(col => {
            console.log(`   - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `KEY: ${col.Key}` : ''}`);
        });
    }
    
    // Verificar tabla Invoices
    console.log('\n🧾 Estructura de tabla Invoices:');
    db.all("DESCRIBE Invoices", [], (err, invoicesColumns) => {
        if (err) {
            console.error('❌ Error consultando Invoices:', err.message);
        } else if (invoicesColumns.length === 0) {
            console.log('❌ La tabla Invoices NO EXISTE');
        } else {
            console.log('✅ Tabla Invoices encontrada con columnas:');
            invoicesColumns.forEach(col => {
                console.log(`   - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `KEY: ${col.Key}` : ''}`);
            });
        }
        
        // Verificar tabla Expenses para comparar
        console.log('\n💸 Estructura de tabla Expenses (para comparar):');
        db.all("DESCRIBE Expenses", [], (err, expensesColumns) => {
            if (err) {
                console.error('❌ Error consultando Expenses:', err.message);
            } else {
                console.log('✅ Tabla Expenses encontrada con columnas:');
                expensesColumns.forEach(col => {
                    console.log(`   - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `KEY: ${col.Key}` : ''}`);
                });
            }
            
            console.log('\n✅ VERIFICACIÓN COMPLETADA');
            process.exit(0);
        });
    });
});