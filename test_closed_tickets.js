
const mysql = require('./backend/node_modules/mysql2/promise');

const config = {
    host: 'localhost',
    user: 'gymtec_user',
    password: 'k/kKDJBZeLPa+KkborYduq4Dbfm1M06eOdXmz19aINc=',
    database: 'gymtec_erp'
};

async function checkClosedTickets() {
    let connection;
    try {
        console.log('Connecting to DB...');
        connection = await mysql.createConnection(config);
        console.log('Connected.');

        const [rows] = await connection.execute(
            "SELECT id, title, status, due_date FROM Tickets WHERE status IN ('Cerrado', 'Resuelto', 'Finalizado', 'Completed') LIMIT 10"
        );
        
        console.log('--- CLOSED TICKETS DATA ---');
        console.log(JSON.stringify(rows, null, 2));
        console.log('---------------------------');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        if (connection) await connection.end();
    }
}

checkClosedTickets();
