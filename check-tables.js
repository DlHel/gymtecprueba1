require('dotenv').config({path:'/var/www/gymtec/backend/config.env'});
const mysql = require('mysql2/promise');
(async () => {
    const conn = await mysql.createConnection({
        host: 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    const [tables] = await conn.query('SHOW TABLES');
    console.log('=== TABLAS EXISTENTES ===');
    tables.forEach(t => console.log(Object.values(t)[0]));
    console.log('\n=== TOTAL:', tables.length, 'tablas ===');
    await conn.end();
})();
