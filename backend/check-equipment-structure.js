const mysql = require('mysql2');

const conn = mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: '',
    database: 'gymtec_erp'
});

console.log('🔍 Verificando estructura tabla equipment...');

conn.query('DESCRIBE equipment', (err, res) => {
    if (err) {
        console.error('❌ Error:', err);
    } else {
        console.log('📋 ESTRUCTURA TABLA EQUIPMENT:');
        res.forEach(field => {
            console.log(`   ${field.Field} - ${field.Type} ${field.Null === 'NO' ? '(Required)' : '(Optional)'}`);
        });
    }
    
    console.log('\n🔐 Cerrando conexión...');
    conn.end();
}); 