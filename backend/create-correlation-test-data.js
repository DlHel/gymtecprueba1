/**
 * Script para crear datos de prueba que demuestren las correlaciones inteligentes
 * Genera contratos, SLA, tickets y tareas para mostrar métricas realistas
 */

const db = require('./src/db-adapter');

console.log('🎯 CREANDO DATOS DE PRUEBA PARA CORRELACIONES INTELIGENTES\n');

async function createCorrelationTestData() {
    try {
        console.log('🎫 1. Actualizando tickets con estado SLA...');
        
        // Actualizar algunos tickets con estados SLA variados para demo
        await new Promise((resolve, reject) => {
            db.run(`
                UPDATE Tickets 
                SET sla_status = CASE 
                    WHEN id % 3 = 0 THEN 'cumplido'
                    WHEN id % 3 = 1 THEN 'en_riesgo'
                    ELSE 'vencido'
                END,
                sla_deadline = DATE_ADD(created_at, INTERVAL 
                    CASE 
                        WHEN priority = 'Urgente' THEN 4
                        WHEN priority = 'Alta' THEN 8
                        WHEN priority = 'Media' THEN 24
                        ELSE 72
                    END HOUR)
                WHERE sla_status IS NULL OR sla_status = ''
            `, [], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        console.log('   ✅ Tickets actualizados con estados SLA');

        console.log('📋 2. Actualizando tareas de mantenimiento...');
        
        // Actualizar tareas con estados de completado variados
        await new Promise((resolve, reject) => {
            db.run(`
                UPDATE MaintenanceTasks 
                SET status = CASE 
                    WHEN id % 4 = 0 THEN 'completed'
                    WHEN id % 4 = 1 THEN 'in_progress'
                    WHEN id % 4 = 2 THEN 'pending'
                    ELSE 'completed'
                END,
                completed_at = CASE 
                    WHEN id % 4 = 0 THEN scheduled_date
                    WHEN id % 4 = 3 THEN DATE_SUB(scheduled_date, INTERVAL 1 DAY)
                    ELSE NULL
                END,
                actual_duration = CASE 
                    WHEN id % 4 = 0 THEN estimated_duration + 30
                    WHEN id % 4 = 3 THEN estimated_duration - 15
                    ELSE NULL
                END
            `, [], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        console.log('   ✅ Tareas actualizadas con estados variados');

        console.log('💰 3. Verificando contratos activos...');
        
        // Verificar contratos existentes
        const contracts = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM Contracts WHERE status = "activo"', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`   ✅ ${contracts.length} contratos activos encontrados`);

        // Crear algunos contratos adicionales si son pocos
        if (contracts.length < 3) {
            console.log('   📝 Creando contratos adicionales...');
            
            await new Promise((resolve, reject) => {
                db.run(`
                    INSERT INTO Contracts (client_id, contract_number, contract_name, start_date, end_date, 
                                         sla_p1_hours, sla_p2_hours, sla_p3_hours, sla_p4_hours, 
                                         monthly_fee, currency, status, service_description)
                    SELECT 
                        c.id,
                        CONCAT('CTR-2025-', LPAD(c.id, 3, '0')),
                        CONCAT('Contrato Mantenimiento ', c.name),
                        '2025-01-01',
                        '2025-12-31',
                        4, 8, 24, 72,
                        150000 + (c.id * 25000),
                        'CLP',
                        'activo',
                        'Mantenimiento preventivo y correctivo de equipos de gimnasio'
                    FROM Clients c
                    WHERE c.id NOT IN (SELECT DISTINCT client_id FROM Contracts WHERE client_id IS NOT NULL)
                    LIMIT 3
                `, [], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            
            console.log('   ✅ Contratos adicionales creados');
        }

        console.log('\n🧮 4. Calculando métricas de demostración...');
        
        // Verificar datos finales
        const finalStats = await new Promise((resolve, reject) => {
            db.get(`
                SELECT 
                    (SELECT COUNT(*) FROM Tickets WHERE sla_status = 'cumplido') as sla_cumplido,
                    (SELECT COUNT(*) FROM Tickets WHERE sla_status = 'en_riesgo') as sla_riesgo,
                    (SELECT COUNT(*) FROM Tickets WHERE sla_status = 'vencido') as sla_vencido,
                    (SELECT COUNT(*) FROM MaintenanceTasks WHERE status = 'completed') as tasks_completed,
                    (SELECT COUNT(*) FROM MaintenanceTasks WHERE status IN ('pending', 'in_progress')) as tasks_pending,
                    (SELECT COUNT(*) FROM Contracts WHERE status = 'activo') as contracts_active,
                    (SELECT AVG(monthly_fee) FROM Contracts WHERE status = 'activo') as avg_contract_value
            `, [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        console.log('\n🎯 MÉTRICAS DE CORRELACIÓN GENERADAS:');
        console.log('========================================');
        console.log(`📊 SLA Cumplido: ${finalStats.sla_cumplido}`);
        console.log(`⚠️ SLA En Riesgo: ${finalStats.sla_riesgo}`);
        console.log(`🚨 SLA Vencido: ${finalStats.sla_vencido}`);
        console.log(`✅ Tareas Completadas: ${finalStats.tasks_completed}`);
        console.log(`⏳ Tareas Pendientes: ${finalStats.tasks_pending}`);
        console.log(`📋 Contratos Activos: ${finalStats.contracts_active}`);
        console.log(`💰 Valor Promedio Contrato: $${Math.round(finalStats.avg_contract_value || 0).toLocaleString()}`);
        
        // Calcular índices de correlación
        const totalTickets = finalStats.sla_cumplido + finalStats.sla_riesgo + finalStats.sla_vencido;
        const totalTasks = finalStats.tasks_completed + finalStats.tasks_pending;
        
        const slaCompliance = totalTickets > 0 ? Math.round((finalStats.sla_cumplido / totalTickets) * 100) : 0;
        const taskCompletion = totalTasks > 0 ? Math.round((finalStats.tasks_completed / totalTasks) * 100) : 0;
        const correlationIndex = Math.round((slaCompliance + taskCompletion) / 2);
        
        console.log('\n🧠 ÍNDICES DE CORRELACIÓN:');
        console.log('===========================');
        console.log(`📈 SLA Compliance: ${slaCompliance}%`);
        console.log(`⚡ Task Completion: ${taskCompletion}%`);
        console.log(`🎯 Correlation Index: ${correlationIndex}%`);
        console.log(`📊 Efficiency Rating: ${correlationIndex >= 70 ? 'EXCELENTE' : correlationIndex >= 50 ? 'BUENO' : 'REQUIERE MEJORA'}`);

        console.log('\n✅ DATOS DE PRUEBA CREADOS EXITOSAMENTE');
        console.log('💡 Ahora puedes ver las correlaciones en http://localhost:8080/index.html');
        console.log('🎨 Las métricas aparecerán automáticamente en el dashboard principal');

    } catch (error) {
        console.error('❌ Error creando datos de prueba:', error.message);
    } finally {
        process.exit(0);
    }
}

// Ejecutar creación de datos
createCorrelationTestData();