const mysql = require('mysql2/promise');

async function checkUsers() {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gymtec_erp'
        });
        
        const [rows] = await conn.query('SELECT id, username, role FROM Users LIMIT 5');
        console.log('\n📋 Usuarios en la base de datos:');
        console.log('================================');
        rows.forEach(u => {
            console.log(`  ${u.id}. ${u.username} (${u.role})`);
        });
        console.log('================================\n');
        
        await conn.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkUsers();
