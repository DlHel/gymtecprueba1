
const db = require('./backend/src/db-adapter');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend/config.env') });

async function testQuery() {
    console.log('Testing Inventory Query...');
    const sql = `
        SELECT 
            i.id,
            CASE 
                WHEN i.current_stock <= i.minimum_stock THEN 'low'
                WHEN i.current_stock >= i.maximum_stock THEN 'overstock'
                ELSE 'normal'
            END as stock_status
        FROM Inventory i
        LIMIT 5
    `;
    
    try {
        const rows = await db.all(sql, []);
        console.log('Query success:', rows);
    } catch (err) {
        console.error('Query failed:', err.message);
    }
}

testQuery();
