const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

console.log('🔍 VERIFICANDO ESTADO ACTUAL DE LA BASE DE DATOS\n');

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

async function checkCurrentData() {
    try {
        console.log('📡 Conectando a MySQL...');
        await query('SELECT 1');
        console.log('✅ Conectado exitosamente\n');

        // Verificar conteos de todas las tablas
        console.log('📊 CONTEO DE REGISTROS POR TABLA:');
        
        const tables = [
            'clients', 'locations', 'equipment', 'equipmentmodels', 
            'tickets', 'spareparts', 'equipmentnotes', 'users', 'roles',
            'modelphotos', 'equipmentphotos'
        ];
        
        for (const table of tables) {
            try {
                const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
                const count = result[0].count;
                console.log(`   📋 ${table.padEnd(20)}: ${count} registros`);
            } catch (error) {
                console.log(`   ❌ ${table.padEnd(20)}: Error - ${error.message}`);
            }
        }

        // Verificar datos específicos de clientes
        console.log('\n👥 DETALLES DE CLIENTES:');
        const clients = await query('SELECT id, name, rut, email FROM clients ORDER BY id');
        
        if (clients.length === 0) {
            console.log('   ⚠️  No hay clientes en la base de datos');
        } else {
            clients.forEach(client => {
                console.log(`   • ID: ${client.id} - ${client.name} (${client.rut || 'Sin RUT'}) - ${client.email || 'Sin email'}`);
            });
        }

        // Verificar datos específicos de ubicaciones
        console.log('\n🏢 DETALLES DE UBICACIONES:');
        const locations = await query(`
            SELECT l.id, l.name, l.address, c.name as client_name 
            FROM locations l 
            LEFT JOIN clients c ON l.client_id = c.id 
            ORDER BY l.id
        `);
        
        if (locations.length === 0) {
            console.log('   ⚠️  No hay ubicaciones en la base de datos');
        } else {
            locations.forEach(location => {
                console.log(`   • ID: ${location.id} - ${location.name} (${location.client_name || 'Sin cliente'}) - ${location.address || 'Sin dirección'}`);
            });
        }

        // Verificar datos específicos de equipos
        console.log('\n🏋️ DETALLES DE EQUIPOS:');
        const equipment = await query(`
            SELECT e.id, e.name, e.custom_id, e.serial_number, l.name as location_name 
            FROM equipment e 
            LEFT JOIN locations l ON e.location_id = l.id 
            ORDER BY e.id 
            LIMIT 10
        `);
        
        if (equipment.length === 0) {
            console.log('   ⚠️  No hay equipos en la base de datos');
        } else {
            console.log(`   📊 Mostrando primeros 10 equipos:`);
            equipment.forEach(equip => {
                console.log(`   • ID: ${equip.id} - ${equip.name} (${equip.custom_id || 'Sin código'}) - ${equip.location_name || 'Sin ubicación'}`);
            });
        }

        // Verificar modelos
        console.log('\n🏭 DETALLES DE MODELOS:');
        const models = await query('SELECT id, name, brand, category FROM equipmentmodels ORDER BY category, brand LIMIT 10');
        
        if (models.length === 0) {
            console.log('   ⚠️  No hay modelos en la base de datos');
        } else {
            console.log(`   📊 Mostrando primeros 10 modelos:`);
            models.forEach(model => {
                console.log(`   • ID: ${model.id} - ${model.brand} ${model.name} (${model.category})`);
            });
        }

        // Verificar tickets
        console.log('\n🎫 DETALLES DE TICKETS:');
        const tickets = await query(`
            SELECT t.id, t.title, t.status, t.priority, e.name as equipment_name 
            FROM tickets t 
            LEFT JOIN equipment e ON t.equipment_id = e.id 
            ORDER BY t.id
        `);
        
        if (tickets.length === 0) {
            console.log('   ⚠️  No hay tickets en la base de datos');
        } else {
            tickets.forEach(ticket => {
                console.log(`   • ID: ${ticket.id} - ${ticket.title} (${ticket.status} - ${ticket.priority}) - ${ticket.equipment_name || 'Sin equipo'}`);
            });
        }

        // Verificar usuarios
        console.log('\n👤 DETALLES DE USUARIOS:');
        const users = await query(`
            SELECT u.id, u.name, u.email, r.name as role_name 
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id 
            ORDER BY u.id
        `);
        
        if (users.length === 0) {
            console.log('   ⚠️  No hay usuarios en la base de datos');
        } else {
            users.forEach(user => {
                console.log(`   • ID: ${user.id} - ${user.name} (${user.email}) - Rol: ${user.role_name || 'Sin rol'}`);
            });
        }

        console.log('\n' + '='.repeat(60));
        console.log('📋 RESUMEN DEL ESTADO ACTUAL:');
        
        const totalClients = clients.length;
        const totalLocations = locations.length;
        const totalEquipment = (await query('SELECT COUNT(*) as count FROM equipment'))[0].count;
        const totalModels = (await query('SELECT COUNT(*) as count FROM equipmentmodels'))[0].count;
        const totalTickets = tickets.length;
        const totalUsers = users.length;
        
        console.log(`   👥 Clientes: ${totalClients}`);
        console.log(`   🏢 Ubicaciones: ${totalLocations}`);
        console.log(`   🏋️ Equipos: ${totalEquipment}`);
        console.log(`   🏭 Modelos: ${totalModels}`);
        console.log(`   🎫 Tickets: ${totalTickets}`);
        console.log(`   👤 Usuarios: ${totalUsers}`);
        
        // Determinar qué falta
        console.log('\n🔧 ANÁLISIS DE DATOS FALTANTES:');
        
        if (totalClients === 0) {
            console.log('   ❌ CRÍTICO: No hay clientes - se necesita poblar clientes');
        } else if (totalClients < 10) {
            console.log('   ⚠️  Pocos clientes - se recomienda agregar más');
        } else {
            console.log('   ✅ Clientes: Cantidad adecuada');
        }
        
        if (totalLocations === 0) {
            console.log('   ❌ CRÍTICO: No hay ubicaciones - se necesita poblar ubicaciones');
        } else if (totalLocations < 20) {
            console.log('   ⚠️  Pocas ubicaciones - se recomienda agregar más');
        } else {
            console.log('   ✅ Ubicaciones: Cantidad adecuada');
        }
        
        if (totalEquipment === 0) {
            console.log('   ❌ CRÍTICO: No hay equipos - se necesita poblar equipos');
        } else if (totalEquipment < 50) {
            console.log('   ⚠️  Pocos equipos - se recomienda agregar más');
        } else {
            console.log('   ✅ Equipos: Cantidad adecuada');
        }
        
        if (totalModels === 0) {
            console.log('   ❌ CRÍTICO: No hay modelos - se necesita poblar modelos');
        } else if (totalModels < 20) {
            console.log('   ⚠️  Pocos modelos - se recomienda agregar más');
        } else {
            console.log('   ✅ Modelos: Cantidad adecuada');
        }
        
        if (totalUsers === 0) {
            console.log('   ❌ CRÍTICO: No hay usuarios - se necesita poblar usuarios');
        } else {
            console.log('   ✅ Usuarios: Cantidad adecuada');
        }

    } catch (error) {
        console.error('❌ Error durante verificación:', error.message);
    } finally {
        connection.end();
        console.log('\n🔐 Conexión con MySQL cerrada.');
    }
}

checkCurrentData(); 