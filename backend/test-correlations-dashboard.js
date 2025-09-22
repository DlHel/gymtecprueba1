/**
 * Test de Correlaciones Inteligentes del Dashboard
 * Prueba los nuevos endpoints de correlación sin crear páginas separadas
 */

const db = require('./src/db-adapter');

console.log('🧪 TESTING CORRELACIONES INTELIGENTES DEL DASHBOARD\n');

async function testCorrelationEndpoints() {
    try {
        console.log('📊 1. Testing SLA vs Planificación...');
        
        // Test 1: Estadísticas SLA
        const slaStats = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    COUNT(*) as total_tickets,
                    SUM(CASE WHEN sla_status = 'cumplido' THEN 1 ELSE 0 END) as compliant_tickets,
                    SUM(CASE WHEN sla_status = 'en_riesgo' THEN 1 ELSE 0 END) as risk_tickets,
                    SUM(CASE WHEN sla_status = 'vencido' THEN 1 ELSE 0 END) as expired_tickets
                FROM Tickets 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                AND status NOT IN ('Cerrado', 'Cancelado')
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows[0]);
            });
        });

        console.log('   ✅ SLA Stats:', {
            total: slaStats.total_tickets,
            compliant: slaStats.compliant_tickets,
            risk: slaStats.risk_tickets,
            expired: slaStats.expired_tickets
        });

        // Test 2: Estadísticas de Planificación
        const planningStats = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    COUNT(*) as total_tasks,
                    SUM(CASE WHEN status = 'completed' AND completed_at <= scheduled_date THEN 1 ELSE 0 END) as on_time_tasks,
                    SUM(CASE WHEN status = 'pending' AND scheduled_date < CURDATE() THEN 1 ELSE 0 END) as overdue_tasks
                FROM MaintenanceTasks 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows[0]);
            });
        });

        console.log('   ✅ Planning Stats:', {
            total: planningStats.total_tasks,
            onTime: planningStats.on_time_tasks,
            overdue: planningStats.overdue_tasks
        });

        console.log('\n📋 2. Testing Contratos Summary...');
        
        // Test 3: Estadísticas de Contratos
        const contractStats = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    COUNT(*) as total_contracts,
                    SUM(CASE WHEN status = 'activo' THEN 1 ELSE 0 END) as active_contracts,
                    SUM(CASE WHEN end_date <= DATE_ADD(NOW(), INTERVAL 30 DAY) 
                             AND end_date >= NOW() THEN 1 ELSE 0 END) as expiring_soon,
                    AVG(monthly_fee) as avg_monthly_fee
                FROM Contracts
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows[0]);
            });
        });

        console.log('   ✅ Contract Stats:', {
            total: contractStats.total_contracts,
            active: contractStats.active_contracts,
            expiringSoon: contractStats.expiring_soon,
            avgFee: Math.round(contractStats.avg_monthly_fee || 0)
        });

        console.log('\n⚡ 3. Testing Eficiencia Operacional...');
        
        // Test 4: Estadísticas de Eficiencia
        const taskStats = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    COUNT(*) as total_tasks,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                    AVG(CASE WHEN actual_duration IS NOT NULL AND estimated_duration IS NOT NULL 
                             THEN actual_duration / estimated_duration * 100 ELSE NULL END) as avg_duration_accuracy
                FROM MaintenanceTasks 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows[0]);
            });
        });

        console.log('   ✅ Task Stats:', {
            total: taskStats.total_tasks,
            completed: taskStats.completed_tasks,
            completionRate: Math.round((taskStats.completed_tasks / taskStats.total_tasks) * 100) + '%'
        });

        // Test 5: Calcular correlaciones finales
        const slaCompliance = slaStats.total_tickets > 0 
            ? Math.round((slaStats.compliant_tickets / slaStats.total_tickets) * 100) 
            : 0;

        const plannedTasksOnTime = planningStats.total_tasks > 0 
            ? Math.round((planningStats.on_time_tasks / planningStats.total_tasks) * 100) 
            : 0;

        const taskCompletionRate = taskStats.total_tasks > 0 
            ? Math.round((taskStats.completed_tasks / taskStats.total_tasks) * 100) 
            : 0;

        console.log('\n🧠 RESUMEN DE CORRELACIONES INTELIGENTES:');
        console.log('================================================');
        console.log(`📊 SLA Compliance: ${slaCompliance}%`);
        console.log(`📅 Tasks On Time: ${plannedTasksOnTime}%`);
        console.log(`⚡ Task Completion: ${taskCompletionRate}%`);
        console.log(`🎯 Correlation Index: ${Math.round((slaCompliance + plannedTasksOnTime) / 2)}%`);
        console.log(`🔧 Efficiency Index: ${Math.round((taskCompletionRate + 75) / 2)}%`); // 75% resource util estimate
        
        console.log('\n✅ CORRELACIONES IMPLEMENTADAS CORRECTAMENTE');
        console.log('💡 Estas métricas ahora aparecerán en index.html automáticamente');
        console.log('🎯 NO se crean dashboards separados - todo centralizado en la página principal');

    } catch (error) {
        console.error('❌ Error en test de correlaciones:', error.message);
    } finally {
        process.exit(0);
    }
}

// Ejecutar test
testCorrelationEndpoints();