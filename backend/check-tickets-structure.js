const mysql = require('mysql2');
require('dotenv').config({ path: './backend/config.env' });

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
});

connection.connect((err) => {
    if (err) {
        console.error('❌ Error conectando a MySQL:', err.message);
        process.exit(1);
    }
    
    console.log('✅ Conectado a MySQL\n');
    
    // Verificar columnas de Tickets
    connection.query('DESCRIBE Tickets', (err, results) => {
        if (err) {
            console.error('❌ Error:', err.message);
            connection.end();
            process.exit(1);
        }
        
        console.log('📋 Columnas de la tabla Tickets:\n');
        console.table(results.map(r => ({
            Campo: r.Field,
            Tipo: r.Type,
            Nulo: r.Null,
            Default: r.Default
        })));
        
        // Verificar si existe sla_status
        const hasSlaStatus = results.some(r => r.Field === 'sla_status');
        const hasSlaDeadline = results.some(r => r.Field === 'sla_deadline');
        
        console.log('\n✅ Verificación de columnas SLA:');
        console.log(`   - sla_status: ${hasSlaStatus ? '✅ Existe' : '❌ NO existe'}`);
        console.log(`   - sla_deadline: ${hasSlaDeadline ? '✅ Existe' : '❌ NO existe'}`);
        
        // Contar tickets con datos SLA
        connection.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(sla_status) as con_sla_status,
                COUNT(sla_deadline) as con_sla_deadline
            FROM Tickets
        `, (err2, counts) => {
            if (err2) {
                console.error('❌ Error contando:', err2.message);
            } else {
                console.log('\n📊 Estadísticas de datos:');
                console.log(`   - Total tickets: ${counts[0].total}`);
                console.log(`   - Con sla_status: ${counts[0].con_sla_status}`);
                console.log(`   - Con sla_deadline: ${counts[0].con_sla_deadline}`);
            }
            
            connection.end();
        });
    });
});
