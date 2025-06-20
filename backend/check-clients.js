const mysql = require('mysql2');

const conn = mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: '',
    database: 'gymtec_erp'
});

console.log('👥 CLIENTES ACTUALES EN BD:');
console.log('==========================');

conn.query('SELECT id, name, rut FROM clients ORDER BY id', (err, results) => {
    if (err) {
        console.error('❌ Error:', err.message);
    } else {
        results.forEach(client => {
            console.log(`ID: ${client.id} - ${client.name} (${client.rut || 'Sin RUT'})`);
        });
    }
    
    conn.end();
}); 