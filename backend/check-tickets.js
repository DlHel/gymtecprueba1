const mysql = require('mysql2');

console.log('🔍 Verificando estructura tabla tickets...');

const conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gymtec_erp'
});

console.log('📡 Conectando...');

conn.connect((err) => {
    if (err) {
        console.error('❌ Error de conexión:', err);
        return;
    }
    console.log('✅ Conectado exitosamente');
    
    conn.query('DESCRIBE tickets', (err, res) => {
        if (err) {
            console.error('❌ Error en query:', err);
        } else {
            console.log('📋 ESTRUCTURA TABLA TICKETS:');
            res.forEach(field => {
                console.log(`   ${field.Field} - ${field.Type} ${field.Null === 'NO' ? '(Required)' : '(Optional)'}`);
            });
        }
        
        console.log('\n🔐 Cerrando conexión...');
        conn.end();
    });
}); 