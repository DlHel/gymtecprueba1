const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

console.log('🗄️ POBLANDO BASE DE DATOS COMPLETA - GYMTEC ERP\n');

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

async function populateDatabase() {
    try {
        console.log('📡 Conectando a MySQL...');
        await query('SELECT 1');
        console.log('✅ Conectado a MySQL exitosamente\n');

        // 1. VERIFICAR ESTADO ACTUAL
        console.log('📊 VERIFICANDO ESTADO ACTUAL DE TABLAS:');
        const tables = await query(`
            SELECT TABLE_NAME, TABLE_ROWS 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'gymtec_erp' 
            ORDER BY TABLE_NAME
        `);
        
        tables.forEach(row => {
            console.log(`   ${row.TABLE_NAME}: ${row.TABLE_ROWS} registros`);
        });
        console.log('');

        // 2. POBLAR ROLES PRIMERO
        console.log('🔑 POBLANDO ROLES...');
        console.log('   Eliminando roles existentes...');
        await query('DELETE FROM roles WHERE id > 0');
        console.log('   Roles eliminados exitosamente');
        
        const roles = [
            ['admin'],
            ['technician'],
            ['client']
        ];

        for (const role of roles) {
            await query(`INSERT INTO roles (name) VALUES (?)`, role);
            console.log(`   ✅ Rol: ${role[0]}`);
        }

        // 3. POBLAR USUARIOS (TÉCNICOS Y ADMIN)
        console.log('\n👥 POBLANDO USUARIOS...');
        await query('DELETE FROM users WHERE id > 0');
        
        // Obtener IDs de roles
        const roleAdmin = await query('SELECT id FROM roles WHERE name = "admin"');
        const roleTech = await query('SELECT id FROM roles WHERE name = "technician"');
        
        const users = [
            ['admin', 'admin123', roleAdmin[0].id],
            ['felipe.tech', 'tech123', roleTech[0].id],
            ['maria.tech', 'tech123', roleTech[0].id],
            ['carlos.tech', 'tech123', roleTech[0].id],
            ['ana.tech', 'tech123', roleTech[0].id]
        ];

        for (const user of users) {
            await query(`
                INSERT INTO users (username, password, role_id) 
                VALUES (?, ?, ?)
            `, user);
            console.log(`   ✅ Usuario: ${user[0]} (${user[2] === roleAdmin[0].id ? 'admin' : 'technician'})`);
        }

        // 4. POBLAR MÁS CLIENTES
        console.log('\n🏢 POBLANDO MÁS CLIENTES...');
        const moreClients = [
            ['Fitness Zone Premium', 'Fitness Zone Premium S.A.', '76.123.456-7', 'Av. Providencia 1234, Providencia', '+56912345678', 'contacto@fitnesszone.cl', 'Gimnasios y Centros Deportivos', 'María González'],
            ['PowerGym Santiago', 'PowerGym Santiago Ltda.', '78.987.654-3', 'Av. Las Condes 5678, Las Condes', '+56987654321', 'info@powergym.cl', 'Gimnasios Especializados', 'Carlos Pérez'],
            ['AquaFit Center', 'AquaFit Center SpA', '77.555.888-9', 'Av. Vitacura 9876, Vitacura', '+56911223344', 'admin@aquafit.cl', 'Centros Acuáticos y Fitness', 'Ana Silva'],
            ['CrossFit Maipú', 'CrossFit Maipú E.I.R.L.', '79.111.222-1', 'Av. Pajaritos 2468, Maipú', '+56955667788', 'hola@crossfitmaip.cl', 'Box de CrossFit', 'Roberto Morales'],
            ['Wellness Club', 'Wellness Club S.A.', '76.333.444-5', 'Av. Ñuñoa 1357, Ñuñoa', '+56933445566', 'contacto@wellness.cl', 'Bienestar Integral', 'Laura Fernández']
        ];

        for (const client of moreClients) {
            try {
                await query(`
                    INSERT INTO clients (name, legal_name, rut, address, phone, email, business_activity, contact_name) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, client);
                console.log(`   ✅ Cliente: ${client[0]} (${client[1]})`);
            } catch (error) {
                console.log(`   ⚠️  Cliente ya existe: ${client[0]}`);
            }
        }

        // 5. POBLAR MÁS UBICACIONES/SEDES
        console.log('\n🏢 POBLANDO MÁS UBICACIONES...');
        const clientIds = await query('SELECT id, name FROM clients ORDER BY id');
        
        const moreLocations = [
            // Fitness Zone Premium
            [clientIds[4].id, 'Sede Providencia', 'Av. Providencia 1234, Providencia'],
            [clientIds[4].id, 'Sede Las Condes', 'Av. El Bosque Norte 500, Las Condes'],
            
            // PowerGym Santiago  
            [clientIds[5].id, 'Sede Principal', 'Av. Las Condes 5678, Las Condes'],
            
            // AquaFit Center
            [clientIds[6].id, 'Centro Vitacura', 'Av. Vitacura 9876, Vitacura'],
            [clientIds[6].id, 'Sucursal Lo Barnechea', 'Av. Lo Barnechea 246, Lo Barnechea'],
            
            // CrossFit Maipú
            [clientIds[7].id, 'Box Principal', 'Av. Pajaritos 2468, Maipú'],
            
            // Wellness Club
            [clientIds[8].id, 'Club Ñuñoa', 'Av. Ñuñoa 1357, Ñuñoa'],
            [clientIds[8].id, 'Anexo Plaza Egaña', 'Av. Plaza Egaña 789, Ñuñoa']
        ];

        for (const location of moreLocations) {
            await query(`
                INSERT INTO locations (client_id, name, address) 
                VALUES (?, ?, ?)
            `, location);
            console.log(`   ✅ Ubicación: ${location[1]} (${clientIds.find(c => c.id === location[0]).name})`);
        }

        // 6. POBLAR EQUIPOS REALES
        console.log('\n🏋️ POBLANDO EQUIPOS...');
        const locations = await query('SELECT id, name, client_id FROM locations ORDER BY id');
        const models = await query('SELECT id, name, brand FROM equipmentmodels ORDER BY id');
        
        let equipmentCounter = 1;
        const equipments = [];

        // Distribuir equipos por ubicación
        for (const location of locations) {
            const numEquipments = Math.floor(Math.random() * 5) + 3; // 3-7 equipos por sede
            
            for (let i = 0; i < numEquipments; i++) {
                const randomModel = models[Math.floor(Math.random() * models.length)];
                const customId = `EQ-${String(equipmentCounter).padStart(3, '0')}`;
                const serialNumber = `SN${Date.now()}${Math.floor(Math.random() * 10000)}${equipmentCounter}`;
                const acquisitionDate = new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
                const lastMaintenance = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
                
                equipments.push([
                    `${randomModel.brand} ${randomModel.name}`,
                    randomModel.brand,
                    randomModel.name,
                    serialNumber,
                    customId,
                    location.id,
                    randomModel.id,
                    acquisitionDate.toISOString().split('T')[0],
                    lastMaintenance.toISOString().split('T')[0],
                    `Equipo instalado en ${location.name}. Estado: Operativo.`
                ]);
                
                equipmentCounter++;
            }
        }

        for (const equipment of equipments) {
            await query(`
                INSERT INTO equipment (name, brand, model, serial_number, custom_id, location_id, model_id, acquisition_date, last_maintenance_date, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, equipment);
            console.log(`   ✅ Equipo: ${equipment[4]} - ${equipment[0]}`);
        }

        // 7. POBLAR TICKETS
        console.log('\n🎫 POBLANDO TICKETS...');
        const equipmentList = await query('SELECT id, custom_id, name, location_id FROM equipment ORDER BY id');
        const userList = await query(`
            SELECT u.id, u.username 
            FROM users u 
            JOIN roles r ON u.role_id = r.id 
            WHERE r.name = "technician" 
            ORDER BY u.id
        `);
        
        const ticketTypes = ['Mantenimiento Preventivo', 'Reparación', 'Instalación', 'Inspección', 'Limpieza Profunda'];
        const priorities = ['Baja', 'Media', 'Alta', 'Urgente'];
        const statuses = ['Abierto', 'En Progreso', 'Resuelto', 'Cerrado'];
        
        const tickets = [];
        
        for (let i = 0; i < 15; i++) {
            const randomEquipment = equipmentList[Math.floor(Math.random() * equipmentList.length)];
            const randomUser = userList[Math.floor(Math.random() * userList.length)];
            const randomType = ticketTypes[Math.floor(Math.random() * ticketTypes.length)];
            const randomPriority = priorities[Math.floor(Math.random() * priorities.length)];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            
            const createdDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
            const dueDate = new Date(createdDate.getTime() + (Math.floor(Math.random() * 7) + 1) * 24 * 60 * 60 * 1000);
            
            tickets.push([
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
            ]);
        }

        for (const ticket of tickets) {
            await query(`
                INSERT INTO tickets (title, description, priority, status, location_id, equipment_id, assigned_technician_id, created_at, due_date) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, ticket);
            console.log(`   ✅ Ticket: ${ticket[0]} - ${ticket[1]}`);
        }

        // 8. POBLAR REPUESTOS
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
            await query(`
                INSERT INTO spareparts (name, sku, current_stock, minimum_stock) 
                VALUES (?, ?, ?, ?)
            `, part);
            console.log(`   ✅ Repuesto: ${part[0]} (${part[1]})`);
        }

        // 9. POBLAR NOTAS DE EQUIPOS
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

        for (let i = 0; i < equipmentList.length && i < 20; i++) {
            const equipment = equipmentList[i];
            const randomUser = userList[Math.floor(Math.random() * userList.length)];
            const randomNote = sampleNotes[Math.floor(Math.random() * sampleNotes.length)];
            const noteDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
            
            await query(`
                INSERT INTO equipmentnotes (equipment_id, note, author, created_at) 
                VALUES (?, ?, ?, ?)
            `, [equipment.id, randomNote, randomUser.username, noteDate.toISOString()]);
            
            console.log(`   ✅ Nota para ${equipment.custom_id}: ${randomNote.substring(0, 50)}...`);
        }

        // 10. RESUMEN FINAL
        console.log('\n📊 RESUMEN FINAL DE POBLACIÓN:');
        const finalCounts = await query(`
            SELECT TABLE_NAME, TABLE_ROWS 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'gymtec_erp' 
            AND TABLE_NAME IN ('users', 'clients', 'locations', 'equipment', 'tickets', 'spareparts', 'equipmentnotes', 'equipmentmodels')
            ORDER BY TABLE_NAME
        `);
        
        finalCounts.forEach(row => {
            console.log(`   ${row.TABLE_NAME}: ${row.TABLE_ROWS} registros`);
        });

        console.log('\n🎉 ¡BASE DE DATOS POBLADA COMPLETAMENTE!');
        console.log('\n✅ Sistema listo para uso completo con datos realistas');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        connection.end();
        console.log('\n🔐 Conexión con MySQL cerrada.');
    }
}

populateDatabase(); 