
const db = require('./backend/src/db-adapter');
const path = require('path');

// Mock config for test
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'gymtec_user';
process.env.DB_PASSWORD = 'k/kKDJBZeLPa+KkborYduq4Dbfm1M06eOdXmz19aINc='; 
process.env.DB_NAME = 'gymtec_erp';

async function testQuery() {
    try {
        await db.initialize();
        
        const sql = `
        SELECT
            t.id,
            t.title,
            t.status,
            DATE_FORMAT(t.due_date, '%Y-%m-%d') as scheduled_date,
            'ticket' as source_type
        FROM Tickets t
        WHERE t.due_date IS NOT NULL
        ORDER BY t.due_date DESC
        LIMIT 5;
        `;
        
        db.db.query(sql, [], (err, rows) => {
            if (err) {
                console.error('SQL Error:', err);
            } else {
                console.log('✅ Tickets found:', JSON.stringify(rows, null, 2));
            }
            process.exit();
        });

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

testQuery();
