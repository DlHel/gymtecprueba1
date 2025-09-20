/**
 * Test de endpoints del planificador en tiempo real
 */

const db = require('./src/db-adapter');

async function testPlannerEndpoints() {
    console.log('🧪 TESTING ENDPOINTS DEL PLANIFICADOR\n');

    try {
        // 1. Test maintenance tasks
        console.log('1️⃣ Testing MaintenanceTasks...');
        const tasks = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    mt.id, mt.title, mt.type, mt.status, 
                    mt.scheduled_date, mt.scheduled_time,
                    e.name as equipment_name,
                    u.username as technician_name
                FROM MaintenanceTasks mt
                LEFT JOIN Equipment e ON mt.equipment_id = e.id
                LEFT JOIN Users u ON mt.technician_id = u.id
                ORDER BY mt.scheduled_date DESC
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        console.log(`   ✅ MaintenanceTasks: ${tasks.length} encontradas\n`);

        // 2. Test Equipment
        console.log('2️⃣ Testing Equipment...');
        const equipment = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    e.id, e.name, e.type, e.brand, e.model, e.serial_number,
                    l.name as location_name, c.name as client_name
                FROM Equipment e
                LEFT JOIN Locations l ON e.location_id = l.id
                LEFT JOIN Clients c ON l.client_id = c.id
                LIMIT 5
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        console.log(`   ✅ Equipment: ${equipment.length} encontrados`);
        equipment.forEach((eq, idx) => {
            console.log(`      ${idx + 1}. ${eq.name || 'Sin nombre'} (${eq.type || 'Sin tipo'})`);
        });
        console.log();

        // 3. Test Users/Technicians
        console.log('3️⃣ Testing Users/Technicians...');
        const technicians = await new Promise((resolve, reject) => {
            db.all(`
                SELECT id, username, email, role, status
                FROM Users 
                WHERE role IN ('technician', 'admin', 'Tecnico', 'Admin') 
                AND status = 'Activo'
                ORDER BY username
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        console.log(`   ✅ Technicians: ${technicians.length} encontrados`);
        technicians.forEach((tech, idx) => {
            console.log(`      ${idx + 1}. ${tech.username} (${tech.role})`);
        });
        console.log();

        // 4. Verificar estructura de tablas
        console.log('4️⃣ Verificando estructura de tablas...');
        
        // MaintenanceTasks columns
        const mtColumns = await new Promise((resolve, reject) => {
            db.all('DESCRIBE MaintenanceTasks', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        console.log(`   📊 MaintenanceTasks tiene ${mtColumns.length} columnas`);
        
        // Equipment columns
        const equipColumns = await new Promise((resolve, reject) => {
            db.all('DESCRIBE Equipment', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        console.log(`   📊 Equipment tiene ${equipColumns.length} columnas`);
        
        // Users columns
        const userColumns = await new Promise((resolve, reject) => {
            db.all('DESCRIBE Users', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        console.log(`   📊 Users tiene ${userColumns.length} columnas\n`);

        console.log('🎯 DIAGNÓSTICO:');
        console.log(`   - MaintenanceTasks: ${tasks.length} registros disponibles`);
        console.log(`   - Equipment: ${equipment.length} registros de prueba`);
        console.log(`   - Technicians: ${technicians.length} usuarios activos`);
        console.log('\n📋 RECOMENDACIONES:');
        
        if (tasks.length === 0) {
            console.log('   ⚠️ No hay tareas - esto es normal, el endpoint devuelve array vacío');
        }
        
        if (equipment.length === 0) {
            console.log('   ⚠️ No hay equipos - verificar por qué el endpoint falla');
        }
        
        if (technicians.length === 0) {
            console.log('   ⚠️ No hay técnicos - verificar criterios de filtrado');
        }

    } catch (error) {
        console.error('❌ Error en test:', error.message);
    }

    process.exit(0);
}

testPlannerEndpoints();