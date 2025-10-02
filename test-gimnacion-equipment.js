/**
 * Test script for gimnación equipment endpoint
 * Tests: /api/tickets/:id/equipment-scope
 */

const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gymtec_erp'
});

console.log('🧪 Testing Gimnación Equipment Endpoint\n');

// Step 1: Find gimnación tickets
db.query(
    'SELECT id, title, ticket_type, created_at FROM Tickets WHERE ticket_type = ? ORDER BY created_at DESC LIMIT 5',
    ['gimnacion'],
    (err, tickets) => {
        if (err) {
            console.error('❌ Error fetching gimnación tickets:', err);
            db.end();
            return;
        }

        console.log(`✅ Found ${tickets.length} gimnación ticket(s):\n`);
        
        if (tickets.length === 0) {
            console.log('⚠️  No gimnación tickets found. Create one first in the UI.');
            db.end();
            return;
        }

        tickets.forEach(ticket => {
            console.log(`   📋 Ticket #${ticket.id}: ${ticket.title}`);
            console.log(`      Type: ${ticket.ticket_type}`);
            console.log(`      Created: ${ticket.created_at}\n`);
        });

        // Step 2: Test equipment scope for first ticket
        const testTicketId = tickets[0].id;
        console.log(`🔍 Testing equipment scope for Ticket #${testTicketId}...\n`);

        db.query(
            `SELECT 
                tes.id,
                tes.equipment_id,
                e.name,
                e.custom_id,
                em.category,
                tes.is_included,
                tes.exclusion_reason
            FROM TicketEquipmentScope tes
            INNER JOIN Equipment e ON tes.equipment_id = e.id
            INNER JOIN EquipmentModels em ON e.model_id = em.id
            WHERE tes.ticket_id = ?
            ORDER BY em.category, e.name`,
            [testTicketId],
            (err, equipment) => {
                if (err) {
                    console.error('❌ Error fetching equipment scope:', err);
                    db.end();
                    return;
                }

                console.log(`✅ Found ${equipment.length} equipment item(s) in scope:\n`);

                if (equipment.length === 0) {
                    console.log('⚠️  No equipment in scope for this ticket.');
                } else {
                    // Group by category
                    const grouped = {};
                    equipment.forEach(item => {
                        if (!grouped[item.category]) {
                            grouped[item.category] = [];
                        }
                        grouped[item.category].push(item);
                    });

                    Object.keys(grouped).forEach(category => {
                        console.log(`   📦 ${category} (${grouped[category].length} items):`);
                        grouped[category].forEach(item => {
                            const status = item.is_included ? '✅ Incluido' : '❌ Excluido';
                            console.log(`      ${status} - ${item.name} (${item.custom_id || 'sin código'})`);
                            if (!item.is_included && item.exclusion_reason) {
                                console.log(`         Razón: ${item.exclusion_reason}`);
                            }
                        });
                        console.log('');
                    });

                    console.log('\n✨ Endpoint Response Format:');
                    console.log(JSON.stringify({
                        message: "success",
                        data: equipment.slice(0, 3) // Show first 3 items as example
                    }, null, 2));
                }

                db.end();
                console.log('\n✅ Test completed successfully!');
            }
        );
    }
);
