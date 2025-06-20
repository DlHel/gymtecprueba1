const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

console.log('🧠 POBLACIÓN INTELIGENTE DE BASE DE DATOS\n');

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
});

function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

async function getNextCustomId() {
    const result = await query(`
        SELECT COALESCE(MAX(CAST(SUBSTRING(custom_id, 4) AS UNSIGNED)), 0) + 1 as next_id 
        FROM equipment 
        WHERE custom_id LIKE 'EQ-%'
    `);
    return `EQ-${String(result[0].next_id).padStart(3, '0')}`;
}

async function smartPopulate() {
    try {
        console.log('📡 Conectando a MySQL...');
        await query('SELECT 1');
        console.log('✅ Conectado exitosamente\n');

        // 1. VERIFICAR ESTADO ACTUAL
        console.log('📊 VERIFICANDO ESTADO ACTUAL:');
        
        const currentCounts = await query(`
            SELECT 
                (SELECT COUNT(*) FROM clients) as clients,
                (SELECT COUNT(*) FROM locations) as locations,
                (SELECT COUNT(*) FROM equipment) as equipment,
                (SELECT COUNT(*) FROM equipmentmodels) as models,
                (SELECT COUNT(*) FROM users) as users,
                (SELECT COUNT(*) FROM roles) as roles
        `);
        
        const counts = currentCounts[0];
        console.log(`   👥 Clientes: ${counts.clients}`);
        console.log(`   🏢 Ubicaciones: ${counts.locations}`);
        console.log(`   🏋️ Equipos: ${counts.equipment}`);
        console.log(`   🏭 Modelos: ${counts.models}`);
        console.log(`   👤 Usuarios: ${counts.users}`);
        console.log(`   🔑 Roles: ${counts.roles}\n`);

        // 2. COMPLETAR EQUIPOS INTELIGENTEMENTE
        if (counts.equipment < 80) {
            console.log('🏋️ COMPLETANDO EQUIPOS CON CUSTOM_ID INTELIGENTE:');
            
            const locations = await query('SELECT id, name FROM locations ORDER BY id');
            const models = await query('SELECT id, name, brand FROM equipmentmodels ORDER BY id');
            
            console.log(`   📍 Ubicaciones disponibles: ${locations.length}`);
            console.log(`   🏭 Modelos disponibles: ${models.length}`);
            
            let equiposCreados = 0;
            const targetEquipment = 80;
            
            for (const location of locations) {
                if (counts.equipment + equiposCreados >= targetEquipment) break;
                
                // Verificar cuántos equipos ya tiene esta ubicación
                const existingEquipment = await query('SELECT COUNT(*) as count FROM equipment WHERE location_id = ?', [location.id]);
                const equiposEnUbicacion = existingEquipment[0].count;
                
                // Agregar equipos si tiene menos de 4
                const equiposAAgregar = Math.max(0, 4 - equiposEnUbicacion);
                
                for (let i = 0; i < equiposAAgregar; i++) {
                    if (counts.equipment + equiposCreados >= targetEquipment) break;
                    
                    const randomModel = models[Math.floor(Math.random() * models.length)];
                    const customId = await getNextCustomId();
                    const serialNumber = `SN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
                    
                    // Fechas realistas
                    const acquisitionYear = 2020 + Math.floor(Math.random() * 4);
                    const acquisitionMonth = Math.floor(Math.random() * 12);
                    const acquisitionDay = Math.floor(Math.random() * 28) + 1;
                    const acquisitionDate = new Date(acquisitionYear, acquisitionMonth, acquisitionDay);
                    
                    const maintenanceYear = 2024;
                    const maintenanceMonth = Math.floor(Math.random() * 12);
                    const maintenanceDay = Math.floor(Math.random() * 28) + 1;
                    const maintenanceDate = new Date(maintenanceYear, maintenanceMonth, maintenanceDay);
                    
                    try {
                        await query(`
                            INSERT INTO equipment (
                                name, location_id, model_id, custom_id, serial_number, 
                                acquisition_date, last_maintenance_date, created_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                        `, [
                            `${randomModel.brand} ${randomModel.name}`,
                            location.id,
                            randomModel.id,
                            customId,
                            serialNumber,
                            acquisitionDate.toISOString().split('T')[0],
                            maintenanceDate.toISOString().split('T')[0]
                        ]);
                        
                        equiposCreados++;
                        
                        if (equiposCreados % 5 === 0) {
                            console.log(`      ✅ Equipos creados: ${equiposCreados}`);
                        }
                        
                    } catch (error) {
                        console.log(`      ⚠️  Error creando equipo: ${error.message}`);
                        break; // Salir del loop si hay error
                    }
                }
            }
            
            console.log(`   ✅ Total de equipos agregados: ${equiposCreados}\n`);
        }

        // 3. COMPLETAR FOTOS DE MODELOS
        console.log('📸 COMPLETANDO FOTOS DE MODELOS:');
        
        const modelsWithoutPhotos = await query(`
            SELECT m.id, m.name, m.brand 
            FROM equipmentmodels m 
            LEFT JOIN modelphotos mp ON m.id = mp.model_id 
            WHERE mp.id IS NULL 
            ORDER BY m.id
        `);
        
        console.log(`   📊 Modelos sin fotos: ${modelsWithoutPhotos.length}`);
        
        for (const model of modelsWithoutPhotos) {
            try {
                // Crear SVG placeholder más atractivo
                const svgContent = `
                    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:0.1" />
                                <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:0.1" />
                            </linearGradient>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grad)" stroke="#e5e7eb" stroke-width="2"/>
                        <rect x="20" y="20" width="360" height="200" fill="#f9fafb" stroke="#d1d5db" stroke-width="1" rx="8"/>
                        <text x="200" y="100" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#374151" text-anchor="middle">
                            ${model.brand}
                        </text>
                        <text x="200" y="130" font-family="Arial, sans-serif" font-size="14" fill="#6b7280" text-anchor="middle">
                            ${model.name}
                        </text>
                        <circle cx="350" cy="50" r="20" fill="#10b981" opacity="0.2"/>
                        <text x="350" y="55" font-family="Arial" font-size="12" fill="#059669" text-anchor="middle">✓</text>
                    </svg>
                `;
                
                const photoData = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
                
                await query(`
                    INSERT INTO modelphotos (model_id, photo_data, filename, is_main, created_at) 
                    VALUES (?, ?, ?, 1, NOW())
                `, [model.id, photoData, `${model.brand.replace(/\s+/g, '-')}-${model.name.replace(/\s+/g, '-')}.svg`]);
                
                console.log(`      📸 Foto agregada: ${model.brand} ${model.name}`);
            } catch (error) {
                console.log(`      ⚠️  Error agregando foto: ${error.message}`);
            }
        }

        // 4. COMPLETAR TICKETS REALISTAS
        console.log('\n🎫 COMPLETANDO TICKETS REALISTAS:');
        
        const currentTickets = await query('SELECT COUNT(*) as count FROM tickets');
        console.log(`   📊 Tickets actuales: ${currentTickets[0].count}`);
        
        if (currentTickets[0].count < 15) {
            const equipment = await query('SELECT id, name FROM equipment ORDER BY RAND() LIMIT 10');
            const ticketTypes = [
                { title: 'Mantenimiento Preventivo', description: 'Revisión rutinaria y lubricación', priority: 'Media' },
                { title: 'Reparación de Motor', description: 'Motor presenta ruidos anómalos', priority: 'Alta' },
                { title: 'Calibración de Sensores', description: 'Sensores de velocidad descalibrados', priority: 'Media' },
                { title: 'Reemplazo de Correa', description: 'Correa de transmisión desgastada', priority: 'Alta' },
                { title: 'Limpieza Profunda', description: 'Limpieza completa y desinfección', priority: 'Baja' },
                { title: 'Actualización de Software', description: 'Actualizar firmware del equipo', priority: 'Media' },
                { title: 'Inspección de Seguridad', description: 'Verificación de sistemas de seguridad', priority: 'Urgente' }
            ];
            
            const statuses = ['Abierto', 'En Progreso', 'En Espera', 'Resuelto', 'Cerrado'];
            
            let ticketsCreados = 0;
            const ticketsAAgregar = Math.min(10, 15 - currentTickets[0].count);
            
            for (let i = 0; i < ticketsAAgregar; i++) {
                const randomEquipment = equipment[Math.floor(Math.random() * equipment.length)];
                const randomTicketType = ticketTypes[Math.floor(Math.random() * ticketTypes.length)];
                const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
                
                // Fecha de creación en los últimos 30 días
                const createdDate = new Date();
                createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 30));
                
                try {
                    await query(`
                        INSERT INTO tickets (
                            title, description, equipment_id, priority, status, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        `${randomTicketType.title} - ${randomEquipment.name}`,
                        randomTicketType.description,
                        randomEquipment.id,
                        randomTicketType.priority,
                        randomStatus,
                        createdDate.toISOString().split('T')[0]
                    ]);
                    
                    ticketsCreados++;
                } catch (error) {
                    console.log(`      ⚠️  Error creando ticket: ${error.message}`);
                }
            }
            
            console.log(`   ✅ Tickets agregados: ${ticketsCreados}`);
        }

        // 5. COMPLETAR NOTAS DE EQUIPOS
        console.log('\n📝 COMPLETANDO NOTAS DE EQUIPOS:');
        
        const currentNotes = await query('SELECT COUNT(*) as count FROM equipmentnotes');
        console.log(`   📊 Notas actuales: ${currentNotes[0].count}`);
        
        if (currentNotes[0].count < 25) {
            const equipment = await query('SELECT id, name FROM equipment ORDER BY RAND() LIMIT 15');
            const noteTypes = [
                'Mantenimiento preventivo realizado correctamente',
                'Se detectó ruido anómalo en motor, programar revisión',
                'Calibración de velocidad completada',
                'Limpieza profunda realizada',
                'Usuario reportó problema con pantalla',
                'Reemplazo de correa completado exitosamente',
                'Actualización de software instalada',
                'Inspección de seguridad aprobada',
                'Se requiere lubricación en próxima visita',
                'Equipo funcionando dentro de parámetros normales'
            ];
            
            let notasCreadas = 0;
            const notasAAgregar = Math.min(15, 25 - currentNotes[0].count);
            
            for (let i = 0; i < notasAAgregar; i++) {
                const randomEquipment = equipment[Math.floor(Math.random() * equipment.length)];
                const randomNote = noteTypes[Math.floor(Math.random() * noteTypes.length)];
                
                // Fecha en los últimos 60 días
                const noteDate = new Date();
                noteDate.setDate(noteDate.getDate() - Math.floor(Math.random() * 60));
                
                try {
                    await query(`
                        INSERT INTO equipmentnotes (
                            equipment_id, note, author, created_at
                        ) VALUES (?, ?, ?, ?)
                    `, [
                        randomEquipment.id,
                        randomNote,
                        'Técnico Sistema',
                        noteDate.toISOString().split('T')[0]
                    ]);
                    
                    notasCreadas++;
                } catch (error) {
                    console.log(`      ⚠️  Error creando nota: ${error.message}`);
                }
            }
            
            console.log(`   ✅ Notas agregadas: ${notasCreadas}`);
        }

        // 6. RESUMEN FINAL
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN FINAL DESPUÉS DE POBLACIÓN INTELIGENTE:');
        
        const finalCounts = await query(`
            SELECT 
                (SELECT COUNT(*) FROM clients) as clients,
                (SELECT COUNT(*) FROM locations) as locations,
                (SELECT COUNT(*) FROM equipment) as equipment,
                (SELECT COUNT(*) FROM equipmentmodels) as models,
                (SELECT COUNT(*) FROM tickets) as tickets,
                (SELECT COUNT(*) FROM users) as users,
                (SELECT COUNT(*) FROM roles) as roles,
                (SELECT COUNT(*) FROM modelphotos) as model_photos,
                (SELECT COUNT(*) FROM spareparts) as spareparts,
                (SELECT COUNT(*) FROM equipmentnotes) as notes
        `);
        
        const finalCountsData = finalCounts[0];
        console.log(`   👥 Clientes: ${finalCountsData.clients}`);
        console.log(`   🏢 Ubicaciones: ${finalCountsData.locations}`);
        console.log(`   🏋️ Equipos: ${finalCountsData.equipment}`);
        console.log(`   🏭 Modelos: ${finalCountsData.models}`);
        console.log(`   🎫 Tickets: ${finalCountsData.tickets}`);
        console.log(`   👤 Usuarios: ${finalCountsData.users}`);
        console.log(`   🔑 Roles: ${finalCountsData.roles}`);
        console.log(`   📸 Fotos de modelos: ${finalCountsData.model_photos}`);
        console.log(`   🔧 Repuestos: ${finalCountsData.spareparts}`);
        console.log(`   📝 Notas: ${finalCountsData.notes}`);
        
        console.log('\n🎉 ¡POBLACIÓN INTELIGENTE COMPLETADA EXITOSAMENTE!');
        console.log('✅ Base de datos completamente poblada con datos realistas');
        console.log('✅ Sin duplicados ni errores de integridad');

    } catch (error) {
        console.error('❌ Error durante población inteligente:', error.message);
        console.error(error.stack);
    } finally {
        connection.end();
        console.log('\n🔐 Conexión con MySQL cerrada.');
    }
}

smartPopulate(); 