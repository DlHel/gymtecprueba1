const mysql = require('mysql2/promise');

async function testMovementsEndpoint() {
    try {
        const db = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gymtec_erp'
        });

        console.log('🔍 Testing movements endpoint query...\n');

        const query = `
            SELECT 
                im.*,
                i.item_name,
                i.item_code,
                t.id as related_ticket_id,
                t.title as related_ticket_title,
                spr.id as request_id,
                spr.status as request_status,
                spr.spare_part_name as request_item_name,
                spr.quantity_needed as request_quantity
            FROM InventoryMovements im
            LEFT JOIN Inventory i ON im.inventory_id = i.id
            LEFT JOIN Tickets t ON im.ticket_id = t.id
            LEFT JOIN spare_part_requests spr ON im.ticket_id = spr.ticket_id 
                AND im.notes LIKE CONCAT('%request_', spr.id, '%')
            ORDER BY im.created_at DESC
            LIMIT 10
        `;

        const [rows] = await db.query(query);

        console.log(`✅ Found ${rows.length} movements\n`);
        console.log('📊 Movements data:');
        console.log(JSON.stringify(rows, null, 2));

        console.log('\n🔍 Checking for pending requests in spare_part_requests:');
        const [requests] = await db.query(`
            SELECT id, ticket_id, spare_part_name, status, created_at 
            FROM spare_part_requests 
            WHERE status = 'pendiente'
            ORDER BY created_at DESC
        `);
        
        console.log(`\n✅ Found ${requests.length} pending requests:`);
        requests.forEach(req => {
            console.log(`  - Request #${req.id}: ${req.spare_part_name} (ticket #${req.ticket_id}) - ${req.status}`);
        });

        await db.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

testMovementsEndpoint();
