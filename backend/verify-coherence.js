const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

console.log('🔍 VERIFICACIÓN COMPLETA DE COHERENCIA - GYMTEC ERP\n');

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

async function verifyCoherence() {
    let totalChecks = 0;
    let passedChecks = 0;
    let failedChecks = 0;

    try {
        console.log('📡 Conectando a MySQL...');
        await query('SELECT 1');
        console.log('✅ Conectado exitosamente\n');

        // 1. VERIFICAR INTEGRIDAD DE DATOS BÁSICOS
        console.log('📊 VERIFICANDO INTEGRIDAD DE DATOS BÁSICOS:');
        
        const basicCounts = await query(`
            SELECT 
                (SELECT COUNT(*) FROM clients) as clients,
                (SELECT COUNT(*) FROM locations) as locations,
                (SELECT COUNT(*) FROM equipment) as equipment,
                (SELECT COUNT(*) FROM tickets) as tickets,
                (SELECT COUNT(*) FROM spareparts) as spareparts,
                (SELECT COUNT(*) FROM equipmentnotes) as notes,
                (SELECT COUNT(*) FROM users) as users,
                (SELECT COUNT(*) FROM roles) as roles,
                (SELECT COUNT(*) FROM equipmentmodels) as models
        `);
        
        const counts = basicCounts[0];
        console.log(`   👥 Clientes: ${counts.clients}`);
        console.log(`   🏢 Ubicaciones: ${counts.locations}`);
        console.log(`   🏋️ Equipos: ${counts.equipment}`);
        console.log(`   🎫 Tickets: ${counts.tickets}`);
        console.log(`   🔧 Repuestos: ${counts.spareparts}`);
        console.log(`   📝 Notas: ${counts.notes}`);
        console.log(`   👤 Usuarios: ${counts.users}`);
        console.log(`   🔑 Roles: ${counts.roles}`);
        console.log(`   🏭 Modelos: ${counts.models}`);

        // 2. VERIFICAR RELACIONES FOREIGN KEY
        console.log('\n🔗 VERIFICANDO RELACIONES FOREIGN KEY:');
        
        // Verificar que todas las ubicaciones tienen clientes válidos
        totalChecks++;
        const orphanLocations = await query(`
            SELECT COUNT(*) as count FROM locations l 
            LEFT JOIN clients c ON l.client_id = c.id 
            WHERE c.id IS NULL
        `);
        
        if (orphanLocations[0].count === 0) {
            console.log('   ✅ Todas las ubicaciones tienen clientes válidos');
            passedChecks++;
        } else {
            console.log(`   ❌ ${orphanLocations[0].count} ubicaciones sin cliente válido`);
            failedChecks++;
        }

        // Verificar que todos los equipos tienen ubicaciones válidas
        totalChecks++;
        const orphanEquipment = await query(`
            SELECT COUNT(*) as count FROM equipment e 
            LEFT JOIN locations l ON e.location_id = l.id 
            WHERE l.id IS NULL
        `);
        
        if (orphanEquipment[0].count === 0) {
            console.log('   ✅ Todos los equipos tienen ubicaciones válidas');
            passedChecks++;
        } else {
            console.log(`   ❌ ${orphanEquipment[0].count} equipos sin ubicación válida`);
            failedChecks++;
        }

        // Verificar que todos los equipos tienen modelos válidos
        totalChecks++;
        const equipmentWithoutModels = await query(`
            SELECT COUNT(*) as count FROM equipment e 
            LEFT JOIN equipmentmodels m ON e.model_id = m.id 
            WHERE e.model_id IS NOT NULL AND m.id IS NULL
        `);
        
        if (equipmentWithoutModels[0].count === 0) {
            console.log('   ✅ Todos los equipos con model_id tienen modelos válidos');
            passedChecks++;
        } else {
            console.log(`   ❌ ${equipmentWithoutModels[0].count} equipos con model_id inválido`);
            failedChecks++;
        }

        // Verificar que todos los tickets tienen equipos válidos
        totalChecks++;
        const ticketsWithoutEquipment = await query(`
            SELECT COUNT(*) as count FROM tickets t 
            LEFT JOIN equipment e ON t.equipment_id = e.id 
            WHERE t.equipment_id IS NOT NULL AND e.id IS NULL
        `);
        
        if (ticketsWithoutEquipment[0].count === 0) {
            console.log('   ✅ Todos los tickets tienen equipos válidos');
            passedChecks++;
        } else {
            console.log(`   ❌ ${ticketsWithoutEquipment[0].count} tickets con equipo inválido`);
            failedChecks++;
        }

        // Verificar que todos los usuarios tienen roles válidos
        totalChecks++;
        const usersWithoutRoles = await query(`
            SELECT COUNT(*) as count FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id 
            WHERE u.role_id IS NOT NULL AND r.id IS NULL
        `);
        
        if (usersWithoutRoles[0].count === 0) {
            console.log('   ✅ Todos los usuarios tienen roles válidos');
            passedChecks++;
        } else {
            console.log(`   ❌ ${usersWithoutRoles[0].count} usuarios con rol inválido`);
            failedChecks++;
        }

        // 3. VERIFICAR CONSISTENCIA DE DATOS
        console.log('\n📋 VERIFICANDO CONSISTENCIA DE DATOS:');

        // Verificar que no hay equipos duplicados por custom_id
        totalChecks++;
        const duplicateCustomIds = await query(`
            SELECT custom_id, COUNT(*) as count 
            FROM equipment 
            GROUP BY custom_id 
            HAVING COUNT(*) > 1
        `);
        
        if (duplicateCustomIds.length === 0) {
            console.log('   ✅ No hay custom_id duplicados en equipos');
            passedChecks++;
        } else {
            console.log(`   ❌ ${duplicateCustomIds.length} custom_id duplicados encontrados`);
            failedChecks++;
        }

        // Verificar que no hay números de serie duplicados
        totalChecks++;
        const duplicateSerials = await query(`
            SELECT serial_number, COUNT(*) as count 
            FROM equipment 
            WHERE serial_number IS NOT NULL
            GROUP BY serial_number 
            HAVING COUNT(*) > 1
        `);
        
        if (duplicateSerials.length === 0) {
            console.log('   ✅ No hay números de serie duplicados');
            passedChecks++;
        } else {
            console.log(`   ❌ ${duplicateSerials.length} números de serie duplicados`);
            failedChecks++;
        }

        // Verificar que no hay RUT duplicados en clientes
        totalChecks++;
        const duplicateRuts = await query(`
            SELECT rut, COUNT(*) as count 
            FROM clients 
            WHERE rut IS NOT NULL
            GROUP BY rut 
            HAVING COUNT(*) > 1
        `);
        
        if (duplicateRuts.length === 0) {
            console.log('   ✅ No hay RUT duplicados en clientes');
            passedChecks++;
        } else {
            console.log(`   ❌ ${duplicateRuts.length} RUT duplicados encontrados`);
            failedChecks++;
        }

        // 4. VERIFICAR VALORES ENUM
        console.log('\n🎯 VERIFICANDO VALORES ENUM:');

        // Verificar prioridades de tickets
        totalChecks++;
        const invalidPriorities = await query(`
            SELECT COUNT(*) as count FROM tickets 
            WHERE priority NOT IN ('Baja', 'Media', 'Alta', 'Urgente')
        `);
        
        if (invalidPriorities[0].count === 0) {
            console.log('   ✅ Todas las prioridades de tickets son válidas');
            passedChecks++;
        } else {
            console.log(`   ❌ ${invalidPriorities[0].count} tickets con prioridad inválida`);
            failedChecks++;
        }

        // Verificar estados de tickets
        totalChecks++;
        const invalidStatuses = await query(`
            SELECT COUNT(*) as count FROM tickets 
            WHERE status NOT IN ('Abierto', 'En Progreso', 'En Espera', 'Resuelto', 'Cerrado')
        `);
        
        if (invalidStatuses[0].count === 0) {
            console.log('   ✅ Todos los estados de tickets son válidos');
            passedChecks++;
        } else {
            console.log(`   ❌ ${invalidStatuses[0].count} tickets con estado inválido`);
            failedChecks++;
        }

        // Verificar categorías de modelos
        totalChecks++;
        const invalidCategories = await query(`
            SELECT COUNT(*) as count FROM equipmentmodels 
            WHERE category NOT IN ('Cardio', 'Fuerza', 'Funcional', 'Accesorios')
        `);
        
        if (invalidCategories[0].count === 0) {
            console.log('   ✅ Todas las categorías de modelos son válidas');
            passedChecks++;
        } else {
            console.log(`   ❌ ${invalidCategories[0].count} modelos con categoría inválida`);
            failedChecks++;
        }

        // 5. VERIFICAR FECHAS LÓGICAS
        console.log('\n📅 VERIFICANDO LÓGICA DE FECHAS:');

        // Verificar que las fechas de adquisición no son futuras
        totalChecks++;
        const futureAcquisitions = await query(`
            SELECT COUNT(*) as count FROM equipment 
            WHERE acquisition_date > CURDATE()
        `);
        
        if (futureAcquisitions[0].count === 0) {
            console.log('   ✅ No hay fechas de adquisición futuras');
            passedChecks++;
        } else {
            console.log(`   ❌ ${futureAcquisitions[0].count} equipos con fecha de adquisición futura`);
            failedChecks++;
        }

        // Verificar que el último mantenimiento no es anterior a la adquisición
        totalChecks++;
        const invalidMaintenanceDates = await query(`
            SELECT COUNT(*) as count FROM equipment 
            WHERE last_maintenance_date < acquisition_date 
            AND acquisition_date IS NOT NULL 
            AND last_maintenance_date IS NOT NULL
        `);
        
        if (invalidMaintenanceDates[0].count === 0) {
            console.log('   ✅ Fechas de mantenimiento son lógicas respecto a adquisición');
            passedChecks++;
        } else {
            console.log(`   ❌ ${invalidMaintenanceDates[0].count} equipos con mantenimiento anterior a adquisición`);
            failedChecks++;
        }

        // 6. VERIFICAR DATOS OBLIGATORIOS
        console.log('\n❗ VERIFICANDO CAMPOS OBLIGATORIOS:');

        // Verificar nombres de clientes
        totalChecks++;
        const clientsWithoutName = await query(`
            SELECT COUNT(*) as count FROM clients 
            WHERE name IS NULL OR name = ''
        `);
        
        if (clientsWithoutName[0].count === 0) {
            console.log('   ✅ Todos los clientes tienen nombre');
            passedChecks++;
        } else {
            console.log(`   ❌ ${clientsWithoutName[0].count} clientes sin nombre`);
            failedChecks++;
        }

        // Verificar nombres de equipos
        totalChecks++;
        const equipmentWithoutName = await query(`
            SELECT COUNT(*) as count FROM equipment 
            WHERE name IS NULL OR name = ''
        `);
        
        if (equipmentWithoutName[0].count === 0) {
            console.log('   ✅ Todos los equipos tienen nombre');
            passedChecks++;
        } else {
            console.log(`   ❌ ${equipmentWithoutName[0].count} equipos sin nombre`);
            failedChecks++;
        }

        // Verificar títulos de tickets
        totalChecks++;
        const ticketsWithoutTitle = await query(`
            SELECT COUNT(*) as count FROM tickets 
            WHERE title IS NULL OR title = ''
        `);
        
        if (ticketsWithoutTitle[0].count === 0) {
            console.log('   ✅ Todos los tickets tienen título');
            passedChecks++;
        } else {
            console.log(`   ❌ ${ticketsWithoutTitle[0].count} tickets sin título`);
            failedChecks++;
        }

        // 7. VERIFICAR DISTRIBUCIÓN DE DATOS
        console.log('\n📈 VERIFICANDO DISTRIBUCIÓN DE DATOS:');

        // Distribución de equipos por ubicación
        const equipmentByLocation = await query(`
            SELECT l.name, COUNT(e.id) as equipment_count
            FROM locations l
            LEFT JOIN equipment e ON l.id = e.location_id
            GROUP BY l.id, l.name
            ORDER BY equipment_count DESC
        `);
        
        console.log('   📊 Equipos por ubicación:');
        equipmentByLocation.slice(0, 5).forEach(row => {
            console.log(`      ${row.name}: ${row.equipment_count} equipos`);
        });

        // Distribución de tickets por estado
        const ticketsByStatus = await query(`
            SELECT status, COUNT(*) as count
            FROM tickets
            GROUP BY status
            ORDER BY count DESC
        `);
        
        console.log('   🎫 Tickets por estado:');
        ticketsByStatus.forEach(row => {
            console.log(`      ${row.status}: ${row.count} tickets`);
        });

        // Distribución de modelos por categoría
        const modelsByCategory = await query(`
            SELECT category, COUNT(*) as count
            FROM equipmentmodels
            GROUP BY category
            ORDER BY count DESC
        `);
        
        console.log('   🏭 Modelos por categoría:');
        modelsByCategory.forEach(row => {
            console.log(`      ${row.category}: ${row.count} modelos`);
        });

        // 8. RESUMEN FINAL
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DE VERIFICACIÓN DE COHERENCIA:');
        console.log(`   ✅ Verificaciones exitosas: ${passedChecks}`);
        console.log(`   ❌ Verificaciones fallidas: ${failedChecks}`);
        console.log(`   📈 Total verificaciones: ${totalChecks}`);
        console.log(`   📊 Porcentaje de éxito: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);
        
        if (failedChecks === 0) {
            console.log('\n🎉 ¡SISTEMA COMPLETAMENTE COHERENTE!');
            console.log('✅ Todas las verificaciones pasaron exitosamente');
        } else if (failedChecks <= 2) {
            console.log('\n⚠️  Sistema mayormente coherente con problemas menores');
        } else {
            console.log('\n❌ Sistema requiere atención - varios problemas de coherencia detectados');
        }

    } catch (error) {
        console.error('❌ Error durante verificación:', error.message);
    } finally {
        connection.end();
        console.log('\n🔐 Conexión con MySQL cerrada.');
    }
}

verifyCoherence(); 