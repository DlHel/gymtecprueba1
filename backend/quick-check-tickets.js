const db = require('./src/db-adapter');

console.log('🔍 VERIFICACIÓN RÁPIDA DE TICKETS\n');

// Verificar total de tickets
db.all('SELECT COUNT(*) as count FROM Tickets', (err, rows) => {
    if (err) {
        console.error('❌ Error:', err.message);
        return;
    }
    console.log(`📊 Total de tickets: ${rows[0].count}`);
    
    // Verificar últimos tickets
    db.all(`
        SELECT 
            t.id, 
            t.title, 
            t.status, 
            t.priority,
            c.name as client_name,
            t.created_at
        FROM Tickets t
        LEFT JOIN Clients c ON t.client_id = c.id
        ORDER BY t.id DESC
        LIMIT 5
    `, (err, tickets) => {
        if (err) {
            console.error('❌ Error:', err.message);
            return;
        }
        
        console.log('\n📋 Últimos 5 tickets:');
        tickets.forEach((ticket, index) => {
            console.log(`${index + 1}. ID: ${ticket.id} | ${ticket.title}`);
            console.log(`   Cliente: ${ticket.client_name || 'Sin cliente'}`);
            console.log(`   Estado: ${ticket.status} | Prioridad: ${ticket.priority}`);
            console.log(`   Creado: ${ticket.created_at}`);
            console.log('');
        });
        
        // Cerrar conexión después de un tiempo
        setTimeout(() => {
            console.log('✅ Verificación completada');
            process.exit(0);
        }, 1000);
    });
}); 