const db = require('./src/db-adapter');

console.log('🎫 POBLANDO TICKETS CON DATOS REALISTAS');
console.log('=====================================\n');

async function populateRealisticTickets() {
    try {
        console.log('📡 Conectando a MySQL...');

        // 1. Obtener clientes existentes
        console.log('\n📊 1. Obteniendo clientes existentes...');
        
        const clients = await new Promise((resolve, reject) => {
            db.all("SELECT id, name FROM Clients ORDER BY id", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`✅ ${clients.length} clientes encontrados:`);
        clients.forEach(client => {
            console.log(`   ID: ${client.id} - ${client.name}`);
        });

        // 2. Obtener equipos existentes con ubicaciones
        console.log('\n🏋️ 2. Obteniendo equipos existentes...');
        
        const equipment = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    e.id, 
                    e.name, 
                    e.custom_id,
                    l.name as location_name,
                    l.client_id
                FROM Equipment e
                JOIN Locations l ON e.location_id = l.id
                ORDER BY e.id
                LIMIT 20
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`✅ ${equipment.length} equipos encontrados (primeros 20)`);

        // 3. Limpiar tickets existentes
        console.log('\n🧹 3. Limpiando tickets existentes...');
        
        await new Promise((resolve, reject) => {
            db.run("DELETE FROM Tickets", (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        console.log('✅ Tickets existentes eliminados');

        // 4. Crear tickets realistas
        console.log('\n🎫 4. Creando tickets realistas...');
        
        const ticketTypes = [
            {
                title: 'Mantenimiento Preventivo Mensual',
                description: 'Revisión rutinaria mensual del equipo, lubricación de partes móviles y verificación de funcionamiento general.',
                priority: 'Media',
                status: 'Abierto'
            },
            {
                title: 'Reparación de Motor',
                description: 'El motor presenta ruidos anómalos y pérdida de potencia. Se requiere revisión técnica especializada.',
                priority: 'Alta',
                status: 'En Progreso'
            },
            {
                title: 'Calibración de Sensores',
                description: 'Los sensores de velocidad y distancia muestran lecturas incorrectas. Requiere recalibración.',
                priority: 'Media',
                status: 'En Espera'
            },
            {
                title: 'Limpieza Profunda',
                description: 'Limpieza profunda y desinfección completa del equipo según protocolo sanitario.',
                priority: 'Baja',
                status: 'Resuelto'
            },
            {
                title: 'Reemplazo de Correa',
                description: 'La correa de transmisión muestra signos de desgaste excesivo y requiere reemplazo inmediato.',
                priority: 'Alta',
                status: 'Abierto'
            },
            {
                title: 'Ajuste de Frenos',
                description: 'Los frenos no responden adecuadamente, se requiere ajuste de tensión y revisión del sistema.',
                priority: 'Alta',
                status: 'En Progreso'
            },
            {
                title: 'Actualización de Software',
                description: 'Instalación de la última versión del firmware para mejorar rendimiento y corregir errores.',
                priority: 'Media',
                status: 'Cerrado'
            },
            {
                title: 'Inspección de Seguridad',
                description: 'Inspección completa de sistemas de seguridad, paradas de emergencia y dispositivos de protección.',
                priority: 'Alta',
                status: 'Resuelto'
            },
            {
                title: 'Lubricación de Rodamientos',
                description: 'Lubricación preventiva de todos los rodamientos y puntos de fricción del equipo.',
                priority: 'Baja',
                status: 'Cerrado'
            },
            {
                title: 'Reparación de Pantalla',
                description: 'La pantalla LCD presenta píxeles muertos y problemas de visualización. Requiere reemplazo.',
                priority: 'Media',
                status: 'En Espera'
            }
        ];

        // Crear 20 tickets distribuyendo entre equipos y clientes
        const ticketsToCreate = [];
        
        for (let i = 0; i < 20; i++) {
            const ticketTemplate = ticketTypes[i % ticketTypes.length];
            const selectedEquipment = equipment[i % equipment.length];
            
            // Calcular fecha de creación (últimos 30 días)
            const daysAgo = Math.floor(Math.random() * 30);
            const createdDate = new Date();
            createdDate.setDate(createdDate.getDate() - daysAgo);
            
            // Calcular fecha de vencimiento (5-15 días después de creación)
            const dueDate = new Date(createdDate);
            dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 10) + 5);
            
            const ticket = {
                client_id: selectedEquipment.client_id,
                location_id: null, // Se puede agregar después si es necesario
                equipment_id: selectedEquipment.id,
                title: `${ticketTemplate.title} - ${selectedEquipment.name}`,
                description: ticketTemplate.description,
                priority: ticketTemplate.priority,
                status: ticketTemplate.status,
                due_date: dueDate.toISOString().split('T')[0],
                created_at: createdDate.toISOString()
            };
            
            ticketsToCreate.push(ticket);
        }

        // Insertar tickets
        console.log(`📝 Insertando ${ticketsToCreate.length} tickets...`);
        
        let insertedCount = 0;
        
        for (const ticket of ticketsToCreate) {
            try {
                await new Promise((resolve, reject) => {
                    const sql = `
                        INSERT INTO Tickets (
                            client_id, location_id, equipment_id, title, description, 
                            priority, status, due_date, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    
                    const params = [
                        ticket.client_id,
                        ticket.location_id,
                        ticket.equipment_id,
                        ticket.title,
                        ticket.description,
                        ticket.priority,
                        ticket.status,
                        ticket.due_date,
                        ticket.created_at,
                        ticket.created_at
                    ];
                    
                    db.run(sql, params, function(err) {
                        if (err) {
                            console.log(`❌ Error insertando ticket: ${err.message}`);
                            reject(err);
                        } else {
                            insertedCount++;
                            resolve(this.lastID);
                        }
                    });
                });
            } catch (error) {
                console.log(`⚠️  Error con ticket: ${error.message}`);
            }
        }
        
        console.log(`✅ ${insertedCount} tickets insertados correctamente`);

        // 5. Verificar tickets creados
        console.log('\n📊 5. Verificando tickets creados...');
        
        const createdTickets = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    t.*,
                    c.name as client_name,
                    e.name as equipment_name,
                    e.custom_id as equipment_custom_id
                FROM Tickets t
                LEFT JOIN Clients c ON t.client_id = c.id
                LEFT JOIN Equipment e ON t.equipment_id = e.id
                ORDER BY t.created_at DESC
                LIMIT 10
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`✅ Primeros 10 tickets creados:`);
        createdTickets.forEach((ticket, index) => {
            console.log(`${index + 1}. ${ticket.title}`);
            console.log(`   Cliente: ${ticket.client_name || 'Sin cliente'}`);
            console.log(`   Equipo: ${ticket.equipment_name} (${ticket.equipment_custom_id})`);
            console.log(`   Estado: ${ticket.status} | Prioridad: ${ticket.priority}`);
            console.log(`   Creado: ${ticket.created_at}`);
            console.log('');
        });

        // 6. Mostrar estadísticas finales
        console.log('📊 6. Estadísticas finales:');
        
        const stats = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    status,
                    priority,
                    COUNT(*) as count
                FROM Tickets 
                GROUP BY status, priority
                ORDER BY status, priority
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('Distribución por Estado y Prioridad:');
        console.table(stats);

    } catch (error) {
        console.error('❌ Error durante población:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        console.log('\n' + '='.repeat(50));
        console.log('✅ Población de tickets completada');
    }
}

// Ejecutar población
populateRealisticTickets(); 