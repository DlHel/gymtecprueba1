const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gymtec_erp'
});

console.log('🔍 Verificando estructura de tabla Tickets...');

connection.query('DESCRIBE Tickets', (err, results) => {
    if (err) {
        console.error('❌ Error:', err.message);
        connection.end();
        return;
    }
    
    console.log('📊 Columnas de la tabla Tickets:');
    results.forEach(column => {
        console.log(`  - ${column.Field} (${column.Type}) ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${column.Default ? `DEFAULT: ${column.Default}` : ''}`);
    });
    
    // Verificar si hay ticket_type
    const hasTicketType = results.some(col => col.Field === 'ticket_type');
    console.log(`\n🎯 ¿Tiene columna ticket_type? ${hasTicketType ? '✅ SÍ' : '❌ NO'}`);
    
    if (!hasTicketType) {
        console.log('\n🔧 Agregando columna ticket_type...');
        connection.query(`ALTER TABLE Tickets ADD COLUMN ticket_type VARCHAR(50) DEFAULT 'normal'`, (err, result) => {
            if (err) {
                console.error('❌ Error agregando columna:', err.message);
            } else {
                console.log('✅ Columna ticket_type agregada correctamente');
            }
            connection.end();
        });
    } else {
        connection.end();
    }
});