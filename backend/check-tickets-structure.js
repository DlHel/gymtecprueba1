const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
});

connection.query('DESCRIBE tickets', (err, results) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Estructura de la tabla tickets:');
        results.forEach(field => {
            console.log(`  ${field.Field} - ${field.Type} - Null: ${field.Null} - Key: ${field.Key} - Default: ${field.Default}`);
        });
    }
    connection.end();
}); 