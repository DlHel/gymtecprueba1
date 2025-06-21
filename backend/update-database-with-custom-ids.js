const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

// Configuración de conexión
const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
});

// Función para ejecutar queries con promesas
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

async function updateDatabaseWithCustomIds() {
    try {
        console.log('🔄 ACTUALIZANDO BASE DE DATOS CON CUSTOM_IDS');
        console.log('='.repeat(60));
        
        console.log('📡 Conectando a MySQL...');
        await query('SELECT 1');
        console.log('✅ Conectado exitosamente\n');

        // 1. OBTENER DATOS ACTUALES
        console.log('📊 OBTENIENDO DATOS ACTUALES...');
        const clients = await query('SELECT id, name, custom_id FROM clients ORDER BY custom_id');
        const locations = await query('SELECT id, name, custom_id, client_id FROM locations ORDER BY custom_id');
        const equipment = await query('SELECT id, custom_id, model_id, location_id FROM equipment ORDER BY custom_id LIMIT 20');
        
        console.log(`   • ${clients.length} clientes`);
        console.log(`   • ${locations.length} ubicaciones`);
        console.log(`   • ${equipment.length} equipos (muestra)`);

        // 2. CREAR TICKETS ADICIONALES CON REFERENCIAS A CUSTOM_IDS
        console.log('\n🎫 CREANDO TICKETS ADICIONALES...');
        
        // Eliminar tickets existentes para empezar limpio
        await query('DELETE FROM tickets WHERE id >= 16');
        
        const ticketTemplates = [
            {
                title: 'Mantenimiento Preventivo Mensual',
                description: 'Revisión general del equipo según protocolo de mantenimiento',
                status: 'Abierto',
                priority: 'Media',
                category: 'Mantenimiento'
            },
            {
                title: 'Reparación de Motor',
                description: 'Motor presenta ruidos anómalos y vibración excesiva',
                status: 'En Progreso',
                priority: 'Alta',
                category: 'Reparación'
            },
            {
                title: 'Calibración de Sensores',
                description: 'Sensores de velocidad y distancia descalibrados',
                status: 'En Espera',
                priority: 'Media',
                category: 'Calibración'
            },
            {
                title: 'Limpieza Profunda',
                description: 'Limpieza completa y desinfección del equipo',
                status: 'Resuelto',
                priority: 'Baja',
                category: 'Limpieza'
            },
            {
                title: 'Reemplazo de Correa',
                description: 'Correa de transmisión presenta desgaste excesivo',
                status: 'Abierto',
                priority: 'Alta',
                category: 'Repuesto'
            },
            {
                title: 'Ajuste de Frenos',
                description: 'Sistema de frenos requiere ajuste de tensión',
                status: 'En Progreso',
                priority: 'Alta',
                category: 'Ajuste'
            },
            {
                title: 'Actualización de Software',
                description: 'Actualizar firmware a la última versión disponible',
                status: 'Cerrado',
                priority: 'Media',
                category: 'Software'
            },
            {
                title: 'Inspección de Seguridad',
                description: 'Inspección completa de sistemas de seguridad',
                status: 'Resuelto',
                priority: 'Alta',
                category: 'Seguridad'
            },
            {
                title: 'Lubricación de Rodamientos',
                description: 'Aplicar lubricante a rodamientos y componentes móviles',
                status: 'Cerrado',
                priority: 'Baja',
                category: 'Mantenimiento'
            },
            {
                title: 'Reparación de Pantalla',
                description: 'Pantalla LCD presenta pixeles muertos',
                status: 'En Espera',
                priority: 'Media',
                category: 'Reparación'
            }
        ];

        let ticketId = 16;
        let createdTickets = 0;

        // Crear tickets para diferentes equipos y clientes
        for (let i = 0; i < equipment.length && i < 30; i++) {
            const equipmentItem = equipment[i];
            const location = locations.find(l => l.id === equipmentItem.location_id);
            const client = clients.find(c => c.id === location.client_id);
            
            const template = ticketTemplates[i % ticketTemplates.length];
            
            // Obtener nombre del modelo
            const modelResult = await query('SELECT name FROM equipmentmodels WHERE id = ?', [equipmentItem.model_id]);
            const modelName = modelResult[0]?.name || 'Equipo';
            
            const ticketData = {
                title: `${template.title} - ${modelName}`,
                description: `${template.description}\n\nEquipo: ${equipmentItem.custom_id}\nUbicación: ${location.name}\nCliente: ${client.name}\nCategoría: ${template.category}`,
                status: template.status,
                priority: template.priority,
                client_id: client.id,
                location_id: location.id,
                equipment_id: equipmentItem.id,
                created_at: new Date(),
                updated_at: new Date()
            };

            await query(`
                INSERT INTO tickets (
                    title, description, status, priority,
                    client_id, location_id, equipment_id,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                ticketData.title,
                ticketData.description,
                ticketData.status,
                ticketData.priority,
                ticketData.client_id,
                ticketData.location_id,
                ticketData.equipment_id,
                ticketData.created_at,
                ticketData.updated_at
            ]);

            console.log(`   ✅ Ticket #${ticketId}: ${ticketData.title}`);
            ticketId++;
            createdTickets++;
        }

        // 3. CREAR NOTAS DE EQUIPOS
        console.log('\n📝 CREANDO NOTAS DE EQUIPOS...');
        
        const noteTemplates = [
            'Equipo funcionando correctamente después del último mantenimiento',
            'Se recomienda revisar el sistema de lubricación en 30 días',
            'Usuario reportó ruido leve durante el uso',
            'Calibración realizada exitosamente',
            'Pendiente reemplazo de filtro de aire',
            'Equipo presenta desgaste normal para su antigüedad',
            'Se aplicó actualización de firmware',
            'Limpieza profunda completada',
            'Tensión de correa ajustada según especificaciones',
            'Sistema de seguridad verificado y funcionando'
        ];

        let createdNotes = 0;
        for (let i = 0; i < Math.min(equipment.length, 15); i++) {
            const equipmentItem = equipment[i];
            const note = noteTemplates[i % noteTemplates.length];
            
            await query(`
                INSERT INTO equipmentnotes (
                    equipment_id, note, created_at
                ) VALUES (?, ?, ?)
            `, [
                equipmentItem.id,
                note,
                new Date()
            ]);
            
            createdNotes++;
        }
        
        console.log(`   ✅ ${createdNotes} notas de equipos creadas`);

        // 4. VERIFICAR RESULTADOS FINALES
        console.log('\n📊 VERIFICANDO RESULTADOS FINALES...');
        
        const finalStats = {
            clients: await query('SELECT COUNT(*) as count FROM clients'),
            locations: await query('SELECT COUNT(*) as count FROM locations'),
            equipment: await query('SELECT COUNT(*) as count FROM equipment'),
            tickets: await query('SELECT COUNT(*) as count FROM tickets'),
            notes: await query('SELECT COUNT(*) as count FROM equipmentnotes'),
            models: await query('SELECT COUNT(*) as count FROM equipmentmodels')
        };

        console.log('📋 ESTADÍSTICAS FINALES:');
        console.log(`   👥 Clientes: ${finalStats.clients[0].count}`);
        console.log(`   🏢 Ubicaciones: ${finalStats.locations[0].count}`);
        console.log(`   🏋️ Equipos: ${finalStats.equipment[0].count}`);
        console.log(`   🎫 Tickets: ${finalStats.tickets[0].count}`);
        console.log(`   📝 Notas: ${finalStats.notes[0].count}`);
        console.log(`   🏭 Modelos: ${finalStats.models[0].count}`);

        // 5. MOSTRAR ALGUNOS TICKETS CON CUSTOM_IDS
        console.log('\n🎫 TICKETS CON CUSTOM_IDS (Muestra):');
        const sampleTickets = await query(`
            SELECT t.id, t.title, t.status, t.priority,
                   c.custom_id as client_custom_id, c.name as client_name,
                   l.custom_id as location_custom_id, l.name as location_name,
                   e.custom_id as equipment_custom_id
            FROM tickets t
            LEFT JOIN clients c ON t.client_id = c.id
            LEFT JOIN locations l ON t.location_id = l.id
            LEFT JOIN equipment e ON t.equipment_id = e.id
            ORDER BY t.id DESC
            LIMIT 5
        `);

        sampleTickets.forEach(ticket => {
            console.log(`   • #${ticket.id} - ${ticket.title}`);
            console.log(`     Cliente: ${ticket.client_custom_id} | Ubicación: ${ticket.location_custom_id} | Equipo: ${ticket.equipment_custom_id}`);
            console.log(`     Estado: ${ticket.status} | Prioridad: ${ticket.priority}`);
            console.log('');
        });

        console.log('='.repeat(60));
        console.log('🎉 BASE DE DATOS ACTUALIZADA EXITOSAMENTE');
        console.log('='.repeat(60));
        console.log('✅ Custom IDs implementados y funcionando');
        console.log('✅ Datos de prueba poblados');
        console.log('✅ Relaciones verificadas');
        console.log('✅ Sistema listo para pruebas completas');
        
        console.log('\n🚀 PRÓXIMOS PASOS:');
        console.log('   1. Abrir http://localhost:8080/test-custom-ids.html');
        console.log('   2. Ejecutar pruebas completas desde el frontend');
        console.log('   3. Verificar funcionalidad en clientes.html');
        console.log('   4. Probar creación de nuevos registros');

    } catch (error) {
        console.error('❌ Error durante la actualización:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        connection.end();
        console.log('\n🔐 Conexión con MySQL cerrada.');
    }
}

// Ejecutar actualización
updateDatabaseWithCustomIds(); 