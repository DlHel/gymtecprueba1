const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

console.log('🔧 COMPLETANDO POBLACIÓN DE BASE DE DATOS\n');

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

async function completePopulation() {
    try {
        console.log('📡 Conectando a MySQL...');
        await query('SELECT 1');
        console.log('✅ Conectado exitosamente\n');

        // 1. POBLAR TICKETS
        console.log('🎫 POBLANDO TICKETS...');
        
        const equipmentList = await query('SELECT id, custom_id, name, location_id FROM equipment ORDER BY id LIMIT 15');
        const userList = await query(`
            SELECT u.id, u.username 
            FROM users u 
            JOIN roles r ON u.role_id = r.id 
            WHERE r.name = "technician" 
            ORDER BY u.id
        `);
        
        if (equipmentList.length === 0) {
            console.log('   ⚠️  No hay equipos disponibles para crear tickets');
        } else if (userList.length === 0) {
            console.log('   ⚠️  No hay técnicos disponibles para asignar tickets');
        } else {
            const ticketTypes = ['Mantenimiento Preventivo', 'Reparación', 'Instalación', 'Inspección', 'Limpieza Profunda'];
            const priorities = ['Baja', 'Media', 'Alta', 'Urgente'];
            const statuses = ['Abierto', 'En Progreso', 'Resuelto', 'Cerrado'];
            
            for (let i = 0; i < 10; i++) {
                const randomEquipment = equipmentList[Math.floor(Math.random() * equipmentList.length)];
                const randomUser = userList[Math.floor(Math.random() * userList.length)];
                const randomType = ticketTypes[Math.floor(Math.random() * ticketTypes.length)];
                const randomPriority = priorities[Math.floor(Math.random() * priorities.length)];
                const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
                
                const createdDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
                const dueDate = new Date(createdDate.getTime() + (Math.floor(Math.random() * 7) + 1) * 24 * 60 * 60 * 1000);
                
                const ticket = [
                    `Ticket #${String(i + 1).padStart(3, '0')}`,
                    randomType === 'Reparación' ? 
                        `Equipo ${randomEquipment.custom_id} presenta fallas en funcionamiento. Requiere revisión técnica.` :
                        `${randomType} programado para equipo ${randomEquipment.custom_id}.`,
                    randomPriority,
                    randomStatus,
                    randomEquipment.location_id,
                    randomEquipment.id,
                    randomUser.id,
                    createdDate.toISOString().split('T')[0],
                    dueDate.toISOString().split('T')[0]
                ];
                
                try {
                    await query(`
                        INSERT INTO tickets (title, description, priority, status, location_id, equipment_id, assigned_technician_id, created_at, due_date) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, ticket);
                    console.log(`   ✅ Ticket: ${ticket[0]} - ${randomType}`);
                } catch (error) {
                    console.log(`   ⚠️  Error creando ticket: ${error.message}`);
                }
            }
        }

        // 2. POBLAR REPUESTOS
        console.log('\n🔧 POBLANDO REPUESTOS...');
        const spareparts = [
            ['Correa de transmisión', 'COR-001', 15, 5],
            ['Motor eléctrico 2HP', 'MOT-002', 3, 1],
            ['Sensor de velocidad', 'SEN-003', 8, 2],
            ['Panel de control LCD', 'PAN-004', 4, 1],
            ['Cable de alimentación', 'CAB-005', 20, 5],
            ['Rodamiento principal', 'ROD-006', 12, 3],
            ['Placa controladora', 'PLA-007', 2, 1],
            ['Filtro de aire', 'FIL-008', 25, 10],
            ['Resorte de tensión', 'RES-009', 18, 5],
            ['Manija ergonómica', 'MAN-010', 10, 3]
        ];

        for (const part of spareparts) {
            try {
                await query(`
                    INSERT INTO spareparts (name, sku, current_stock, minimum_stock) 
                    VALUES (?, ?, ?, ?)
                `, part);
                console.log(`   ✅ Repuesto: ${part[0]} (${part[1]})`);
            } catch (error) {
                console.log(`   ⚠️  Repuesto ya existe: ${part[0]}`);
            }
        }

        // 3. POBLAR NOTAS DE EQUIPOS
        console.log('\n📝 POBLANDO NOTAS DE EQUIPOS...');
        const sampleNotes = [
            'Mantenimiento preventivo realizado. Equipo en perfecto estado.',
            'Se detectó ruido anormal en motor. Requiere revisión en próxima visita.',
            'Limpieza profunda completada. Se recomienda uso de protector de pantalla.',
            'Calibración de sensores realizada correctamente.',
            'Se reemplazó correa de transmisión. Funcionamiento óptimo.',
            'Equipo reportado por usuario como inestable. Se ajustaron patas niveladoras.',
            'Actualización de firmware completada exitosamente.',
            'Se aplicó lubricante en puntos críticos según manual del fabricante.'
        ];

        const equipmentForNotes = await query('SELECT id, custom_id FROM equipment ORDER BY id LIMIT 20');
        
        if (equipmentForNotes.length === 0) {
            console.log('   ⚠️  No hay equipos disponibles para crear notas');
        } else {
            for (let i = 0; i < Math.min(15, equipmentForNotes.length); i++) {
                const equipment = equipmentForNotes[i];
                const randomUser = userList[Math.floor(Math.random() * userList.length)];
                const randomNote = sampleNotes[Math.floor(Math.random() * sampleNotes.length)];
                const noteDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
                
                try {
                    await query(`
                        INSERT INTO equipmentnotes (equipment_id, note, author, created_at) 
                        VALUES (?, ?, ?, ?)
                    `, [equipment.id, randomNote, randomUser.username, noteDate.toISOString()]);
                    
                    console.log(`   ✅ Nota para ${equipment.custom_id}: ${randomNote.substring(0, 50)}...`);
                } catch (error) {
                    console.log(`   ⚠️  Error creando nota: ${error.message}`);
                }
            }
        }

        // 4. RESUMEN FINAL
        console.log('\n📊 RESUMEN FINAL:');
        const finalCounts = await query(`
            SELECT 
                (SELECT COUNT(*) FROM clients) as clients,
                (SELECT COUNT(*) FROM locations) as locations,
                (SELECT COUNT(*) FROM equipment) as equipment,
                (SELECT COUNT(*) FROM tickets) as tickets,
                (SELECT COUNT(*) FROM spareparts) as spareparts,
                (SELECT COUNT(*) FROM equipmentnotes) as notes,
                (SELECT COUNT(*) FROM users) as users,
                (SELECT COUNT(*) FROM equipmentmodels) as models
        `);
        
        const counts = finalCounts[0];
        console.log(`   👥 Clientes: ${counts.clients}`);
        console.log(`   🏢 Ubicaciones: ${counts.locations}`);
        console.log(`   🏋️ Equipos: ${counts.equipment}`);
        console.log(`   🎫 Tickets: ${counts.tickets}`);
        console.log(`   🔧 Repuestos: ${counts.spareparts}`);
        console.log(`   📝 Notas: ${counts.notes}`);
        console.log(`   👤 Usuarios: ${counts.users}`);
        console.log(`   🏭 Modelos: ${counts.models}`);

        console.log('\n🎉 ¡BASE DE DATOS COMPLETAMENTE POBLADA!');
        console.log('✅ Sistema listo para uso completo con datos realistas');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        connection.end();
        console.log('\n🔐 Conexión con MySQL cerrada.');
    }
}

completePopulation(); 