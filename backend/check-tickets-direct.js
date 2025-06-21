const db = require('./src/db-adapter');

console.log('🎫 VERIFICACIÓN DIRECTA DE TICKETS EN BD');
console.log('======================================\n');

async function checkTicketsDirect() {
    try {
        console.log('📡 Conectando a MySQL...');

        // 1. Consulta directa sin JOIN
        console.log('\n📋 1. Consultando tickets directamente (sin JOIN)...');
        
        const directTickets = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM Tickets ORDER BY created_at DESC", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`✅ Tickets encontrados directamente: ${directTickets.length}`);
        
        if (directTickets.length > 0) {
            console.log('\n📋 Primeros 5 tickets (consulta directa):');
            directTickets.slice(0, 5).forEach((ticket, index) => {
                console.log(`${index + 1}. ID: ${ticket.id} | Título: ${ticket.title || 'Sin título'} | Cliente ID: ${ticket.client_id || 'NULL'} | Estado: ${ticket.status || 'Sin estado'}`);
            });
        }

        // 2. Verificar client_ids en tickets
        console.log('\n📊 2. Verificando client_ids en tickets...');
        
        const clientIds = await new Promise((resolve, reject) => {
            db.all("SELECT DISTINCT client_id FROM Tickets WHERE client_id IS NOT NULL", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('Client IDs en tickets:', clientIds.map(row => row.client_id));

        // 3. Verificar client_ids existentes en tabla Clients
        console.log('\n📊 3. Verificando client_ids existentes en tabla Clients...');
        
        const existingClients = await new Promise((resolve, reject) => {
            db.all("SELECT id, name FROM Clients ORDER BY id", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('Client IDs existentes en Clients:');
        existingClients.forEach(client => {
            console.log(`   ID: ${client.id} - ${client.name}`);
        });

        // 4. Consulta con LEFT JOIN para ver tickets sin cliente
        console.log('\n📋 4. Consultando tickets con LEFT JOIN...');
        
        const leftJoinTickets = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    t.*,
                    c.name as client_name
                FROM Tickets t
                LEFT JOIN Clients c ON t.client_id = c.id
                ORDER BY t.created_at DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`✅ Tickets con LEFT JOIN: ${leftJoinTickets.length}`);
        
        if (leftJoinTickets.length > 0) {
            console.log('\n📋 Primeros 5 tickets (LEFT JOIN):');
            leftJoinTickets.slice(0, 5).forEach((ticket, index) => {
                console.log(`${index + 1}. ID: ${ticket.id} | Título: ${ticket.title || 'Sin título'} | Cliente: ${ticket.client_name || 'SIN CLIENTE'} | Estado: ${ticket.status || 'Sin estado'}`);
            });
        }

        // 5. Consulta original con INNER JOIN
        console.log('\n📋 5. Consultando tickets con INNER JOIN (consulta actual del servidor)...');
        
        const innerJoinTickets = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    t.*,
                    c.name as client_name
                FROM Tickets t
                JOIN Clients c ON t.client_id = c.id
                ORDER BY t.created_at DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`✅ Tickets con INNER JOIN: ${innerJoinTickets.length}`);
        
        if (innerJoinTickets.length === 0) {
            console.log('❌ PROBLEMA ENCONTRADO: El INNER JOIN no devuelve tickets');
            console.log('   Esto significa que los tickets tienen client_id que no existen en la tabla Clients');
        }

        // 6. Identificar tickets huérfanos
        console.log('\n🔍 6. Identificando tickets huérfanos (sin cliente válido)...');
        
        const orphanTickets = await new Promise((resolve, reject) => {
            db.all(`
                SELECT t.id, t.title, t.client_id, t.status
                FROM Tickets t
                LEFT JOIN Clients c ON t.client_id = c.id
                WHERE c.id IS NULL
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        if (orphanTickets.length > 0) {
            console.log(`⚠️  ${orphanTickets.length} tickets huérfanos encontrados:`);
            orphanTickets.forEach(ticket => {
                console.log(`   Ticket ID: ${ticket.id} | Cliente ID: ${ticket.client_id} | Título: ${ticket.title}`);
            });
        } else {
            console.log('✅ No hay tickets huérfanos');
        }

    } catch (error) {
        console.error('❌ Error durante verificación:', error.message);
    } finally {
        console.log('\n' + '='.repeat(50));
        console.log('✅ Verificación directa completada');
    }
}

// Ejecutar verificación
checkTicketsDirect(); 