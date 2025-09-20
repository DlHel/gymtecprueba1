const mysql = require('mysql2/promise');

async function checkQueueStructure() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'gymtec_erp'
    });

    try {
        console.log('📊 Estructura de NotificationQueue:');
        const [rows] = await connection.execute('DESCRIBE NotificationQueue');
        console.table(rows);

        console.log('\n📊 Estructura de NotificationLogs:');
        const [rows2] = await connection.execute('DESCRIBE NotificationLogs');
        console.table(rows2);

        console.log('\n📋 Datos en NotificationQueue:');
        const [queueData] = await connection.execute('SELECT * FROM NotificationQueue LIMIT 5');
        console.table(queueData);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

checkQueueStructure();