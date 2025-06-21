const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp',
    port: process.env.DB_PORT || 3306
};

async function seedTicketSystem() {
    let connection;
    
    try {
        console.log('🔄 Conectando a MySQL...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conexión establecida');

        // Obtener un ticket existente para agregar datos
        const [tickets] = await connection.execute('SELECT id FROM Tickets LIMIT 1');
        
        if (tickets.length === 0) {
            console.log('❌ No hay tickets en la base de datos. Creando ticket de prueba...');
            
            // Obtener cliente y equipo para crear ticket
            const [clients] = await connection.execute('SELECT id FROM Clients LIMIT 1');
            const [equipment] = await connection.execute('SELECT id FROM Equipment LIMIT 1');
            
            if (clients.length === 0) {
                console.log('❌ No hay clientes. Ejecuta primero el seed principal.');
                return;
            }
            
            // Crear ticket de prueba
            await connection.execute(`
                INSERT INTO Tickets (title, description, status, priority, client_id, equipment_id, due_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                'Mantenimiento preventivo trotadora',
                'Realizar mantenimiento preventivo completo de la trotadora Life Fitness T3. Incluye limpieza, lubricación y calibración.',
                'En Progreso',
                'Media',
                clients[0].id,
                equipment.length > 0 ? equipment[0].id : null,
                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días desde ahora
            ]);
            
            const [newTickets] = await connection.execute('SELECT id FROM Tickets ORDER BY id DESC LIMIT 1');
            var ticketId = newTickets[0].id;
            console.log(`✅ Ticket de prueba creado con ID: ${ticketId}`);
        } else {
            var ticketId = tickets[0].id;
            console.log(`📋 Usando ticket existente ID: ${ticketId}`);
        }

        // 1. Poblar Time Entries
        console.log('\n⏱️ Creando entradas de tiempo...');
        const timeEntries = [
            {
                start_time: '2024-01-15 09:00:00',
                end_time: '2024-01-15 11:30:00',
                duration_seconds: 9000, // 2.5 horas
                description: 'Diagnóstico inicial y desmontaje de cubiertas'
            },
            {
                start_time: '2024-01-15 14:00:00',
                end_time: '2024-01-15 16:15:00',
                duration_seconds: 8100, // 2.25 horas
                description: 'Limpieza profunda de componentes internos'
            },
            {
                start_time: '2024-01-16 08:30:00',
                end_time: '2024-01-16 10:45:00',
                duration_seconds: 8100, // 2.25 horas
                description: 'Lubricación de banda y calibración de velocidad'
            }
        ];

        for (const entry of timeEntries) {
            await connection.execute(`
                INSERT INTO TicketTimeEntries (ticket_id, start_time, end_time, duration_seconds, description)
                VALUES (?, ?, ?, ?, ?)
            `, [ticketId, entry.start_time, entry.end_time, entry.duration_seconds, entry.description]);
        }
        console.log(`✅ ${timeEntries.length} entradas de tiempo creadas`);

        // 2. Poblar Notes
        console.log('\n📝 Creando notas...');
        const notes = [
            {
                note: 'Cliente reporta ruido extraño en la banda al superar los 8 km/h. Se procede a investigar.',
                note_type: 'Diagnóstico',
                author: 'Felipe Maturana'
            },
            {
                note: 'Se encontró acumulación de polvo en el motor y banda desgastada. Requiere limpieza profunda.',
                note_type: 'Diagnóstico',
                author: 'Felipe Maturana'
            },
            {
                note: 'Limpieza completada. Se aplicó lubricante especial en banda y se calibró la velocidad.',
                note_type: 'Solución',
                author: 'Felipe Maturana'
            },
            {
                note: 'Pruebas realizadas exitosamente. Equipo funcionando correctamente sin ruidos.',
                note_type: 'Seguimiento',
                author: 'Felipe Maturana'
            },
            {
                note: 'Cliente satisfecho con el resultado. Se recomienda mantenimiento cada 3 meses.',
                note_type: 'Comentario',
                author: 'Felipe Maturana'
            }
        ];

        for (const note of notes) {
            await connection.execute(`
                INSERT INTO TicketNotes (ticket_id, note, note_type, author)
                VALUES (?, ?, ?, ?)
            `, [ticketId, note.note, note.note_type, note.author]);
        }
        console.log(`✅ ${notes.length} notas creadas`);

        // 3. Poblar Checklist
        console.log('\n✅ Creando checklist...');
        const checklistItems = [
            { title: 'Inspeccionar estado general del equipo', completed: true },
            { title: 'Verificar conexiones eléctricas', completed: true },
            { title: 'Limpiar banda de correr', completed: true },
            { title: 'Lubricar banda y rodillos', completed: true },
            { title: 'Calibrar velocidad y inclinación', completed: true },
            { title: 'Probar todas las funciones', completed: true },
            { title: 'Verificar sistemas de seguridad', completed: false },
            { title: 'Documentar mantenimiento realizado', completed: false },
            { title: 'Entregar recomendaciones al cliente', completed: false }
        ];

        for (let i = 0; i < checklistItems.length; i++) {
            const item = checklistItems[i];
            await connection.execute(`
                INSERT INTO TicketChecklists (ticket_id, title, is_completed, completed_by, completed_at, order_index)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                ticketId, 
                item.title, 
                item.completed,
                item.completed ? 'Felipe Maturana' : null,
                item.completed ? new Date().toISOString() : null,
                i
            ]);
        }
        console.log(`✅ ${checklistItems.length} items de checklist creados`);

        // 4. Poblar Spare Parts (si existen)
        console.log('\n🔧 Verificando repuestos...');
        const [spareParts] = await connection.execute('SELECT id, name FROM SpareParts LIMIT 3');
        
        if (spareParts.length > 0) {
            console.log('📦 Creando uso de repuestos...');
            const sparePartUsage = [
                { spare_part_id: spareParts[0].id, quantity: 1, cost: 15000, notes: 'Lubricante especial para banda de trotadora' },
                { spare_part_id: spareParts[1]?.id, quantity: 2, cost: 5000, notes: 'Tornillos de sujeción reemplazados' }
            ].filter(item => item.spare_part_id); // Filtrar items sin spare_part_id

            for (const usage of sparePartUsage) {
                await connection.execute(`
                    INSERT INTO TicketSpareParts (ticket_id, spare_part_id, quantity_used, unit_cost, notes)
                    VALUES (?, ?, ?, ?, ?)
                `, [ticketId, usage.spare_part_id, usage.quantity, usage.cost, usage.notes]);
            }
            console.log(`✅ ${sparePartUsage.length} usos de repuestos creados`);
        } else {
            console.log('⚠️ No hay repuestos en la BD. Creando algunos...');
            
            const testSpareParts = [
                { name: 'Lubricante para banda', sku: 'LUB-001', stock: 10, min_stock: 2 },
                { name: 'Tornillo M6x20', sku: 'TOR-M6-20', stock: 50, min_stock: 10 },
                { name: 'Correa de transmisión', sku: 'COR-TX-01', stock: 5, min_stock: 1 }
            ];
            
            for (const part of testSpareParts) {
                await connection.execute(`
                    INSERT INTO SpareParts (name, sku, current_stock, minimum_stock)
                    VALUES (?, ?, ?, ?)
                `, [part.name, part.sku, part.stock, part.min_stock]);
            }
            console.log(`✅ ${testSpareParts.length} repuestos de prueba creados`);
        }

        // 5. Crear algunas fotos de ejemplo (base64 simulado)
        console.log('\n📸 Creando fotos de ejemplo...');
        const samplePhotos = [
            {
                photo_data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                file_name: 'problema_inicial.jpg',
                mime_type: 'image/jpeg',
                file_size: 1024,
                description: 'Estado inicial del equipo mostrando acumulación de polvo',
                photo_type: 'Problema'
            },
            {
                photo_data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                file_name: 'proceso_limpieza.jpg',
                mime_type: 'image/jpeg',
                file_size: 1024,
                description: 'Proceso de limpieza de componentes internos',
                photo_type: 'Proceso'
            },
            {
                photo_data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                file_name: 'resultado_final.jpg',
                mime_type: 'image/jpeg',
                file_size: 1024,
                description: 'Equipo completamente limpio y calibrado',
                photo_type: 'Solución'
            }
        ];

        for (const photo of samplePhotos) {
            await connection.execute(`
                INSERT INTO TicketPhotos (ticket_id, photo_data, file_name, mime_type, file_size, description, photo_type)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [ticketId, photo.photo_data, photo.file_name, photo.mime_type, photo.file_size, photo.description, photo.photo_type]);
        }
        console.log(`✅ ${samplePhotos.length} fotos de ejemplo creadas`);

        // 6. Crear historial de cambios
        console.log('\n📜 Creando historial...');
        const historyEntries = [
            { field: 'status', old_value: 'Abierto', new_value: 'En Progreso', changed_by: 'Felipe Maturana' },
            { field: 'priority', old_value: 'Baja', new_value: 'Media', changed_by: 'Felipe Maturana' },
            { field: 'description', old_value: null, new_value: 'Actualizada con detalles del diagnóstico', changed_by: 'Felipe Maturana' }
        ];

        for (const entry of historyEntries) {
            await connection.execute(`
                INSERT INTO TicketHistory (ticket_id, field_changed, old_value, new_value, changed_by)
                VALUES (?, ?, ?, ?, ?)
            `, [ticketId, entry.field, entry.old_value, entry.new_value, entry.changed_by]);
        }
        console.log(`✅ ${historyEntries.length} entradas de historial creadas`);

        // Resumen final
        console.log('\n📊 RESUMEN DE DATOS CREADOS:');
        console.log(`   🎫 Ticket ID: ${ticketId}`);
        console.log(`   ⏱️ Time Entries: ${timeEntries.length}`);
        console.log(`   📝 Notas: ${notes.length}`);
        console.log(`   ✅ Checklist: ${checklistItems.length}`);
        console.log(`   📸 Fotos: ${samplePhotos.length}`);
        console.log(`   📜 Historial: ${historyEntries.length}`);
        
        console.log('\n✅ Sistema de tickets poblado exitosamente!');
        console.log(`🌐 Prueba el detalle en: http://localhost:3000/ticket-detail.html?id=${ticketId}`);
        
    } catch (error) {
        console.error('❌ Error durante el seed:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

// Ejecutar seed
if (require.main === module) {
    seedTicketSystem();
}

module.exports = { seedTicketSystem }; 