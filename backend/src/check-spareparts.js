// Script para ver la definición de la vista SpareParts
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });
const dbAdapter = require('./db-adapter');

console.log('🔍 Obteniendo definición de la vista SpareParts...');

dbAdapter.get("SHOW CREATE VIEW SpareParts", [], (err, row) => {
    if (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
    
    console.log('Definición de la vista:');
    console.log(row['Create View']);
    
    // También listar todas las tablas
    dbAdapter.all("SHOW TABLES", [], (err2, tables) => {
        if (err2) {
            console.error('❌ Error:', err2.message);
        } else {
            console.log('\n📋 Todas las tablas:');
            tables.forEach(t => {
                const name = Object.values(t)[0];
                if (name.toLowerCase().includes('spare') || name.toLowerCase().includes('inventory')) {
                    console.log(`  ✅ ${name}`);
                }
            });
        }
        process.exit(0);
    });
});
