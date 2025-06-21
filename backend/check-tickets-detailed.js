const db = require('./src/db-adapter');

console.log('🎫 VERIFICACIÓN DETALLADA DE TICKETS');
console.log('====================================\n');

async function checkTicketsDetailed() {
    try {
        console.log('📡 Conectando a MySQL...');
        
        // 1. Verificar estructura de la tabla Tickets
        console.log('\n📋 1. Verificando estructura de tabla Tickets...');
        
        const ticketStructure = await new Promise((resolve, reject) => {
            db.all("SHOW COLUMNS FROM Tickets", (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
        
        console.log('✅ Estructura de Tickets:');
        console.table(ticketStructure);

        // 2. Contar tickets
        console.log('\n📊 2. Contando tickets...');
        
        const ticketCount = await new Promise((resolve, reject) => {
            db.get("SELECT COUNT(*) as count FROM Tickets", (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        console.log(`✅ Total de tickets: ${ticketCount.count}`);

        // 3. Obtener todos los tickets con detalles
        console.log('\n🎫 3. Listando todos los tickets...');
        
        const tickets = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    t.*,
                    c.name as client_name,
                    l.name as location_name,
                    e.name as equipment_name,
                    e.custom_id as equipment_custom_id
                FROM Tickets t
                LEFT JOIN Equipment e ON t.equipment_id = e.id
                LEFT JOIN Locations l ON e.location_id = l.id
                LEFT JOIN Clients c ON l.client_id = c.id
                ORDER BY t.created_at DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        if (tickets.length === 0) {
            console.log('❌ No se encontraron tickets en la base de datos');
        } else {
            console.log(`✅ Encontrados ${tickets.length} tickets:`);
            console.log('');
            
            tickets.forEach((ticket, index) => {
                console.log(`📋 Ticket ${index + 1}:`);
                console.log(`   ID: ${ticket.id}`);
                console.log(`   Título: ${ticket.title || 'Sin título'}`);
                console.log(`   Descripción: ${ticket.description || 'Sin descripción'}`);
                console.log(`   Estado: ${ticket.status || 'Sin estado'}`);
                console.log(`   Prioridad: ${ticket.priority || 'Sin prioridad'}`);
                console.log(`   Cliente: ${ticket.client_name || 'Sin cliente'}`);
                console.log(`   Ubicación: ${ticket.location_name || 'Sin ubicación'}`);
                console.log(`   Equipo: ${ticket.equipment_name || 'Sin equipo'} (${ticket.equipment_custom_id || 'Sin ID'})`);
                console.log(`   Creado: ${ticket.created_at || 'Sin fecha'}`);
                console.log(`   Actualizado: ${ticket.updated_at || 'Sin fecha'}`);
                console.log('');
            });
        }

        // 4. Verificar distribución por estado
        console.log('📊 4. Distribución por estado:');
        
        const statusDistribution = await new Promise((resolve, reject) => {
            db.all(`
                SELECT status, COUNT(*) as count 
                FROM Tickets 
                GROUP BY status 
                ORDER BY count DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.table(statusDistribution);

        // 5. Verificar distribución por prioridad
        console.log('\n📊 5. Distribución por prioridad:');
        
        const priorityDistribution = await new Promise((resolve, reject) => {
            db.all(`
                SELECT priority, COUNT(*) as count 
                FROM Tickets 
                GROUP BY priority 
                ORDER BY count DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.table(priorityDistribution);

        // 6. Verificar tickets sin equipo asignado
        console.log('\n🔍 6. Tickets sin equipo asignado:');
        
        const ticketsWithoutEquipment = await new Promise((resolve, reject) => {
            db.all(`
                SELECT id, title, status, priority, created_at
                FROM Tickets 
                WHERE equipment_id IS NULL
                ORDER BY created_at DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        if (ticketsWithoutEquipment.length > 0) {
            console.log(`⚠️  ${ticketsWithoutEquipment.length} tickets sin equipo asignado:`);
            console.table(ticketsWithoutEquipment);
        } else {
            console.log('✅ Todos los tickets tienen equipo asignado');
        }

    } catch (error) {
        console.error('❌ Error durante verificación:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        console.log('\n' + '='.repeat(50));
        console.log('✅ Verificación de tickets completada');
    }
}

// Ejecutar verificación
checkTicketsDetailed(); 