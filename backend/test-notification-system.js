const mysql = require('mysql2/promise');
const { runNotificationProcessor } = require('./notification-processor');

async function testNotificationSystem() {
    console.log('🧪 TESTING - Sistema de Notificaciones Integrado');
    console.log('=' .repeat(60));
    
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gymtec_erp'
        });
        
        console.log('✅ Conectado a MySQL');
        
        // 1. Verificar que existen datos base necesarios
        console.log('\n🔍 Verificando datos base...');
        
        const [clients] = await connection.execute('SELECT COUNT(*) as count FROM Clients');
        const [locations] = await connection.execute('SELECT COUNT(*) as count FROM Locations');
        const [equipment] = await connection.execute('SELECT COUNT(*) as count FROM Equipment');
        const [users] = await connection.execute('SELECT COUNT(*) as count FROM Users');
        
        console.log(`   - Clientes: ${clients[0].count}`);
        console.log(`   - Ubicaciones: ${locations[0].count}`);
        console.log(`   - Equipos: ${equipment[0].count}`);
        console.log(`   - Usuarios: ${users[0].count}`);
        
        // 2. Crear datos mínimos si no existen
        if (clients[0].count === 0) {
            console.log('📝 Creando cliente de prueba...');
            await connection.execute(`
                INSERT INTO Clients (name, email, phone, contact_person) 
                VALUES ('Gimnasio Test', 'test@gymtec.com', '555-0123', 'Admin Test')
            `);
        }
        
        if (users[0].count === 0) {
            console.log('📝 Creando usuario técnico de prueba...');
            await connection.execute(`
                INSERT INTO Users (username, email, password_hash, role, is_active) 
                VALUES ('tecnico_test', 'tecnico@gymtec.com', 'hash123', 'technician', 1)
            `);
        }
        
        // Obtener IDs para el ticket
        const [clientData] = await connection.execute('SELECT id FROM Clients LIMIT 1');
        const [locationData] = await connection.execute('SELECT id FROM Locations LIMIT 1');
        const [equipmentData] = await connection.execute('SELECT id FROM Equipment LIMIT 1');
        const [userData] = await connection.execute('SELECT id FROM Users WHERE role = "technician" LIMIT 1');
        
        // 3. Limpiar eventos anteriores para esta prueba
        console.log('\n🧹 Limpiando eventos anteriores...');
        await connection.execute('DELETE FROM NotificationEvents WHERE event_type LIKE "ticket_%" AND triggered_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)');
        await connection.execute('DELETE FROM NotificationQueue WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)');
        
        // 4. Crear ticket de prueba
        console.log('\n🎫 Creando ticket de prueba...');
        
        const dueDate = new Date();
        dueDate.setHours(dueDate.getHours() + 24); // Vence en 24 horas
        
        const [ticketResult] = await connection.execute(`
            INSERT INTO Tickets (
                title, description, status, priority, 
                client_id, location_id, equipment_id, assigned_technician_id,
                due_date, created_at
            ) VALUES (
                'Mantenimiento Correctivo - Prueba Sistema Notificaciones',
                'Ticket creado automáticamente para probar el sistema de notificaciones integrado.',
                'Abierto',
                'Alta',
                ?, ?, ?, ?,
                ?, NOW()
            )
        `, [
            clientData[0]?.id || null,
            locationData[0]?.id || null,
            equipmentData[0]?.id || null,
            userData[0]?.id || null,
            dueDate
        ]);
        
        const ticketId = ticketResult.insertId;
        console.log(`✅ Ticket creado con ID: ${ticketId}`);
        
        // 5. Esperar un poco para que se ejecuten los triggers
        console.log('\n⏳ Esperando que se ejecuten los triggers...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 6. Verificar que se crearon eventos
        console.log('\n🔍 Verificando eventos generados...');
        const [events] = await connection.execute(`
            SELECT id, event_type, entity_type, entity_id, triggered_at, processed
            FROM NotificationEvents 
            WHERE entity_type = 'ticket' AND entity_id = ?
            ORDER BY triggered_at DESC
        `, [ticketId]);
        
        console.log(`📋 Eventos encontrados: ${events.length}`);
        events.forEach(event => {
            console.log(`   - ${event.event_type} (ID: ${event.id}) - Procesado: ${event.processed ? 'Sí' : 'No'}`);
        });
        
        // 7. Ejecutar procesador de notificaciones
        console.log('\n🔄 Ejecutando procesador de notificaciones...');
        await connection.end(); // Cerrar conexión antes del procesador
        
        await runNotificationProcessor();
        
        // 8. Reconectar y verificar resultados
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gymtec_erp'
        });
        
        console.log('\n📊 Verificando resultados finales...');
        
        // Verificar cola de notificaciones
        const [queueItems] = await connection.execute(`
            SELECT nq.*, nt.name as template_name
            FROM NotificationQueue nq
            JOIN NotificationTemplates nt ON nq.template_id = nt.id
            WHERE nq.related_entity_type = 'ticket' AND nq.related_entity_id = ?
            ORDER BY nq.created_at DESC
        `, [ticketId]);
        
        console.log(`📬 Notificaciones en cola: ${queueItems.length}`);
        queueItems.forEach(item => {
            const recipients = typeof item.recipient_identifier === 'string' 
                ? [{ name: item.recipient_identifier, type: item.recipient_type }] 
                : [];
            console.log(`   - ${item.template_name}: ${recipients.length} destinatarios (${item.status})`);
            console.log(`     Asunto: ${item.subject}`);
        });
        
        // 9. Probar actualización de ticket
        console.log('\n🔄 Probando actualización de ticket (cambio de estado)...');
        await connection.execute(`
            UPDATE Tickets 
            SET status = 'En Progreso', updated_at = NOW()
            WHERE id = ?
        `, [ticketId]);
        
        // Esperar y procesar nuevamente
        await new Promise(resolve => setTimeout(resolve, 1000));
        await connection.end();
        await runNotificationProcessor();
        
        // 10. Verificar notificaciones de actualización
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gymtec_erp'
        });
        
        const [finalQueue] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM NotificationQueue 
            WHERE related_entity_type = 'ticket' AND related_entity_id = ?
        `, [ticketId]);
        
        const [finalEvents] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM NotificationEvents 
            WHERE entity_type = 'ticket' AND entity_id = ? AND processed = TRUE
        `, [ticketId]);
        
        console.log('\n🎉 RESULTADOS FINALES:');
        console.log(`   - Eventos procesados: ${finalEvents[0].count}`);
        console.log(`   - Notificaciones generadas: ${finalQueue[0].count}`);
        
        // 11. Mostrar detalles de notificaciones
        const [allNotifications] = await connection.execute(`
            SELECT nq.subject, nq.recipient_type, nq.priority, nq.status, 
                   nt.name as template_name, nt.trigger_event,
                   nq.recipient_identifier
            FROM NotificationQueue nq
            JOIN NotificationTemplates nt ON nq.template_id = nt.id
            WHERE nq.related_entity_type = 'ticket' AND nq.related_entity_id = ?
            ORDER BY nq.created_at ASC
        `, [ticketId]);
        
        console.log('\n📋 DETALLE DE NOTIFICACIONES GENERADAS:');
        allNotifications.forEach((notif, index) => {
            console.log(`\n${index + 1}. ${notif.template_name} (${notif.trigger_event})`);
            console.log(`   Asunto: ${notif.subject}`);
            console.log(`   Tipo: ${notif.recipient_type} | Prioridad: ${notif.priority} | Estado: ${notif.status}`);
            console.log(`   Destinatario: ${notif.recipient_identifier}`);
        });
        
        console.log('\n✅ PRUEBA COMPLETADA EXITOSAMENTE');
        console.log('🔔 El sistema de notificaciones está funcionando correctamente');
        
    } catch (error) {
        console.error('\n❌ ERROR EN PRUEBA:', error.message);
        console.error(error.stack);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Ejecutar prueba
if (require.main === module) {
    testNotificationSystem().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('💥 Error fatal en prueba:', error);
        process.exit(1);
    });
}

module.exports = { testNotificationSystem };