const db = require('./src/db-adapter');

console.log('🔍 Verificando contenido de la base de datos...\n');

// Verificar usuarios
db.all('SELECT id, username, email, role, status FROM Users LIMIT 10', [], (err, users) => {
    if (err) {
        console.error('❌ Error obteniendo usuarios:', err.message);
    } else {
        console.log('👥 USUARIOS EXISTENTES:');
        console.table(users);
    }
    
    // Verificar tickets
    db.all('SELECT id, title, status, priority, created_at FROM Tickets LIMIT 10', [], (err, tickets) => {
        if (err) {
            console.error('❌ Error obteniendo tickets:', err.message);
        } else {
            console.log('\n🎫 TICKETS EXISTENTES:');
            console.table(tickets);
        }
        
        // Verificar si existe el ticket ID 7 específicamente
        db.get('SELECT id, title, status, priority FROM Tickets WHERE id = ?', [7], (err, ticket7) => {
            if (err) {
                console.error('❌ Error buscando ticket 7:', err.message);
            } else if (ticket7) {
                console.log('\n✅ TICKET ID 7 ENCONTRADO:');
                console.log(ticket7);
            } else {
                console.log('\n❌ TICKET ID 7 NO EXISTE en la base de datos');
            }
            
            // Cerrar conexión
            process.exit(0);
        });
    });
});
