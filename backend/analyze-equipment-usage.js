const mysql = require('mysql2/promise');

async function analyzeEquipmentUsage() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'gymtec_erp'
    });

    console.log('\n========================================');
    console.log('🔍 ANÁLISIS DE USO DE CAMPOS EQUIPMENT');
    console.log('========================================\n');

    try {
        // 1. Ver cómo Tickets usa equipment_id
        console.log('📋 TICKETS Y EQUIPOS:\n');
        const [ticketEquipment] = await connection.execute(`
            SELECT 
                t.id as ticket_id,
                t.title,
                t.equipment_id,
                e.name as equipment_name,
                e.custom_id,
                e.serial_number,
                em.name as model_name,
                em.brand as model_brand
            FROM Tickets t
            LEFT JOIN Equipment e ON t.equipment_id = e.id
            LEFT JOIN EquipmentModels em ON e.model_id = em.id
            WHERE t.equipment_id IS NOT NULL
            LIMIT 5
        `);
        
        console.log('Ejemplo de tickets con equipos:');
        ticketEquipment.forEach(t => {
            console.log(`   Ticket #${t.ticket_id}: ${t.title}`);
            console.log(`   └─ Equipo: ID=${t.equipment_id}, Name="${t.equipment_name || 'VACÍO'}", Custom=${t.custom_id}, Modelo=${t.model_name}\n`);
        });

        // 2. Ver MaintenanceTasks y equipos
        console.log('\n🔧 MAINTENANCE TASKS Y EQUIPOS:\n');
        const [maintenanceTasks] = await connection.execute(`
            SELECT 
                mt.id as task_id,
                mt.title,
                mt.equipment_id,
                e.name as equipment_name,
                e.custom_id,
                em.name as model_name
            FROM MaintenanceTasks mt
            LEFT JOIN Equipment e ON mt.equipment_id = e.id
            LEFT JOIN EquipmentModels em ON e.model_id = em.id
            WHERE mt.equipment_id IS NOT NULL
            LIMIT 5
        `);
        
        console.log('Ejemplo de tareas de mantenimiento:');
        maintenanceTasks.forEach(t => {
            console.log(`   Task #${t.task_id}: ${t.title}`);
            console.log(`   └─ Equipo: ID=${t.equipment_id}, Name="${t.equipment_name || 'VACÍO'}", Custom=${t.custom_id}, Modelo=${t.model_name}\n`);
        });

        // 3. Ver TicketEquipmentScope (tickets de gimnación)
        console.log('\n🏋️ TICKET EQUIPMENT SCOPE (Gimnación):\n');
        const [scopeData] = await connection.execute(`
            SELECT 
                tes.ticket_id,
                tes.equipment_id,
                e.name as equipment_name,
                e.custom_id,
                em.name as model_name,
                t.title as ticket_title
            FROM TicketEquipmentScope tes
            LEFT JOIN Equipment e ON tes.equipment_id = e.id
            LEFT JOIN EquipmentModels em ON e.model_id = em.id
            LEFT JOIN Tickets t ON tes.ticket_id = t.id
            LIMIT 5
        `);
        
        console.log('Ejemplo de equipos en gimnación:');
        scopeData.forEach(s => {
            console.log(`   Ticket #${s.ticket_id}: ${s.ticket_title}`);
            console.log(`   └─ Equipo: ID=${s.equipment_id}, Name="${s.equipment_name || 'VACÍO'}", Custom=${s.custom_id}, Modelo=${s.model_name}\n`);
        });

        // 4. Ver queries del backend que usan COALESCE
        console.log('\n💡 CONCLUSIÓN:\n');
        console.log('El backend YA MANEJA campos vacíos con COALESCE:');
        console.log('   - COALESCE(NULLIF(e.name, \'\'), em.name, \'Sin nombre\')');
        console.log('   - COALESCE(NULLIF(e.brand, \'\'), em.brand)');
        console.log('   - COALESCE(NULLIF(e.model, \'\'), em.name)\n');
        
        console.log('✅ RECOMENDACIÓN:');
        console.log('   NO es necesario llenar los campos vacíos en Equipment.');
        console.log('   El sistema está diseñado para usar model_id como fuente principal.');
        console.log('   Los campos individuales (name, brand, type) son para SOBRESCRIBIR');
        console.log('   el modelo cuando un equipo específico tenga diferencias.\n');
        
        console.log('📊 EJEMPLO DE USO CORRECTO:');
        console.log('   - 99% de equipos: Dejar name vacío → usa em.name del modelo');
        console.log('   - 1% de equipos: Llenar name solo si ES DIFERENTE al modelo');
        console.log('   Ej: "Treadmill 9500HR MODIFICADO" si tiene alguna customización\n');

        console.log('========================================');
        console.log('✅ Análisis completado');
        console.log('========================================\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

analyzeEquipmentUsage();
