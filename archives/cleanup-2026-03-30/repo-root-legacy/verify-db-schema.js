const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'database', 'gymtec.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Verificando schema de tabla Equipment...\n');

db.all("PRAGMA table_info(Equipment)", [], (err, rows) => {
    if (err) {
        console.error('❌ Error:', err.message);
        return;
    }
    
    console.log('📋 Columnas de Equipment:');
    console.log('═'.repeat(70));
    rows.forEach(row => {
        console.log(`  ${row.name.padEnd(20)} | ${row.type.padEnd(15)} | ${row.notnull ? 'NOT NULL' : 'NULL'.padEnd(8)} | ${row.pk ? 'PK' : ''}`);
    });
    console.log('═'.repeat(70));
    
    const hasActivo = rows.some(row => row.name === 'activo');
    console.log(`\n❓ Campo 'activo' existe: ${hasActivo ? '✅ SÍ' : '❌ NO'}`);
    
    // Verificar tabla Contracts también
    db.all("PRAGMA table_info(Contracts)", [], (err2, rows2) => {
        if (err2) {
            console.error('❌ Error Contracts:', err2.message);
        } else {
            console.log('\n📋 Columnas de Contracts:');
            console.log('═'.repeat(70));
            rows2.forEach(row => {
                console.log(`  ${row.name.padEnd(20)} | ${row.type.padEnd(15)}`);
            });
            const hasStatus = rows2.some(row => row.name === 'status');
            const hasActivo2 = rows2.some(row => row.name === 'activo');
            console.log(`\n❓ Campo 'status' existe: ${hasStatus ? '✅ SÍ' : '❌ NO'}`);
            console.log(`❓ Campo 'activo' existe: ${hasActivo2 ? '✅ SÍ' : '❌ NO'}`);
        }
        
        db.close();
    });
});
