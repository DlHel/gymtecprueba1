const mysql = require('mysql2/promise');

async function describeNotificationQueue() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'gymtec_erp'
    });
    
    console.log('📋 Estructura NotificationQueue:');
    const [result] = await connection.execute('DESCRIBE NotificationQueue');
    result.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });
    
    await connection.end();
}

describeNotificationQueue();