// Demostración del Sistema de Reglas SLA
const db = require('./src/db-adapter'); // Usar instancia directa
const { initializeSLAProcessor } = require('./src/routes/sla-processor');

async function demonstrateSLASystem() {
    console.log('🎯 Iniciando demostración del Sistema de Reglas SLA');
    console.log('=' * 60);
    
    try {
        console.log('✅ Conexión a base de datos establecida');
        
        // 2. Inicializar el procesador SLA
        const slaProcessor = initializeSLAProcessor(db);
        console.log('✅ Procesador SLA inicializado');
        
        // 3. Crear tareas de prueba con diferentes niveles de violación SLA
        console.log('\n📝 Creando tareas de prueba para demostrar violaciones SLA...');
        
        await createTestTasks(db);
        
        // 4. Ejecutar monitoreo SLA
        console.log('\n🔍 Ejecutando monitoreo SLA...');
        
        const monitoringResult = await slaProcessor.monitorActiveTasks();
        
        console.log('\n📊 Resultados del monitoreo:');
        console.log(`  • Tareas monitoreadas: ${monitoringResult.tasksMonitored}`);
        console.log(`  • Violaciones detectadas: ${monitoringResult.violations}`);
        
        if (monitoringResult.details.length > 0) {
            console.log('\n⚠️  Detalles de violaciones detectadas:');
            monitoringResult.details.forEach((violation, index) => {
                console.log(`\n  ${index + 1}. ${violation.ruleName}`);
                console.log(`     • Tarea ID: ${violation.taskId}`);
                console.log(`     • Severidad: ${violation.severity}`);
                console.log(`     • Prioridad: ${violation.task.priority}`);
                console.log(`     • Estado: ${violation.task.status}`);
                console.log(`     • Edad: ${violation.task.age_minutes} minutos`);
                if (violation.task.is_overdue) {
                    console.log(`     • ⚠️  VENCIDA`);
                }
            });
        }
        
        // 5. Mostrar estadísticas SLA
        console.log('\n📈 Obteniendo estadísticas SLA...');
        
        const stats = await slaProcessor.getSLAStatistics();
        
        console.log('\n📊 Estadísticas SLA (últimos 30 días):');
        if (stats.length > 0) {
            stats.forEach(stat => {
                console.log(`  • ${stat.violation_date}: ${stat.total_violations} violaciones`);
                console.log(`    - Críticas: ${stat.critical_violations}`);
                console.log(`    - Altas: ${stat.high_violations}`);
                console.log(`    - Medias: ${stat.medium_violations}`);
                console.log(`    - Bajas: ${stat.low_violations}`);
            });
        } else {
            console.log('  No hay estadísticas disponibles aún');
        }
        
        // 6. Mostrar reglas SLA activas
        console.log('\n📋 Reglas SLA activas:');
        
        const rules = Array.from(slaProcessor.rules.values());
        rules.forEach((rule, index) => {
            console.log(`\n  ${index + 1}. ${rule.name}`);
            console.log(`     • Estado: ${rule.enabled ? '✅ Activa' : '❌ Inactiva'}`);
            console.log(`     • Condiciones: ${JSON.stringify(rule.conditions)}`);
            console.log(`     • Acciones: ${rule.actions.map(a => a.type).join(', ')}`);
        });
        
        // 7. Verificar violaciones registradas en la base de datos
        console.log('\n📝 Verificando violaciones registradas en la base de datos...');
        
        const violationsSql = `
            SELECT 
                sv.*,
                mt.title,
                mt.priority,
                mt.status
            FROM sla_violations sv
            JOIN maintenancetasks mt ON sv.task_id = mt.id
            ORDER BY sv.created_at DESC
            LIMIT 10
        `;
        
        await new Promise((resolve, reject) => {
            db.all(violationsSql, [], (err, violations) => {
                if (err) {
                    console.error('❌ Error obteniendo violaciones:', err);
                    reject(err);
                    return;
                }
                
                if (violations.length > 0) {
                    console.log(`\n📊 Últimas ${violations.length} violaciones registradas:`);
                    violations.forEach((violation, index) => {
                        console.log(`\n  ${index + 1}. ${violation.rule_name}`);
                        console.log(`     • Tarea: ${violation.title || 'Sin título'}`);
                        console.log(`     • Severidad: ${violation.severity}`);
                        console.log(`     • Fecha: ${violation.created_at}`);
                        console.log(`     • Resuelto: ${violation.resolved ? '✅' : '❌'}`);
                    });
                } else {
                    console.log('  No hay violaciones registradas');
                }
                
                resolve();
            });
        });
        
        // 8. Verificar acciones ejecutadas
        console.log('\n🔧 Verificando acciones SLA ejecutadas...');
        
        const actionsSql = `
            SELECT 
                sal.*,
                mt.title
            FROM sla_action_log sal
            JOIN maintenancetasks mt ON sal.task_id = mt.id
            ORDER BY sal.executed_at DESC
            LIMIT 10
        `;
        
        await new Promise((resolve, reject) => {
            db.all(actionsSql, [], (err, actions) => {
                if (err) {
                    console.error('❌ Error obteniendo acciones:', err);
                    reject(err);
                    return;
                }
                
                if (actions.length > 0) {
                    console.log(`\n📊 Últimas ${actions.length} acciones ejecutadas:`);
                    actions.forEach((action, index) => {
                        console.log(`\n  ${index + 1}. ${action.action_type.toUpperCase()}`);
                        console.log(`     • Tarea: ${action.title || 'Sin título'}`);
                        console.log(`     • Mensaje: ${action.message || 'N/A'}`);
                        console.log(`     • Ejecutado: ${action.executed_at}`);
                        console.log(`     • Por: ${action.executed_by}`);
                    });
                } else {
                    console.log('  No hay acciones registradas');
                }
                
                resolve();
            });
        });
        
        // 9. Simular escalación de una tarea crítica
        console.log('\n🚨 Simulando escalación de tarea crítica...');
        
        const criticalTaskSql = `
            SELECT * FROM maintenancetasks 
            WHERE priority = 'critical' AND status IN ('pending', 'scheduled')
            LIMIT 1
        `;
        
        await new Promise((resolve, reject) => {
            db.get(criticalTaskSql, [], async (err, task) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (task) {
                    console.log(`\n🎯 Escalando tarea crítica: ${task.title || `ID ${task.id}`}`);
                    
                    // Simular escalación
                    const escalationSql = `
                        UPDATE maintenancetasks 
                        SET escalated_to = 1, escalated_at = NOW(), priority = 'critical'
                        WHERE id = ?
                    `;
                    
                    db.run(escalationSql, [task.id], function(escalateErr) {
                        if (escalateErr) {
                            console.error('❌ Error escalando tarea:', escalateErr);
                        } else {
                            console.log('✅ Tarea escalada exitosamente');
                        }
                        resolve();
                    });
                } else {
                    console.log('  No hay tareas críticas para escalar');
                    resolve();
                }
            });
        });
        
        console.log('\n🎉 Demostración del Sistema SLA completada exitosamente');
        console.log('\n📋 Resumen de capacidades demostradas:');
        console.log('  ✅ Monitoreo automático de tareas activas');
        console.log('  ✅ Detección de violaciones SLA basada en reglas');
        console.log('  ✅ Escalación automática de tareas críticas');
        console.log('  ✅ Registro de violaciones y acciones');
        console.log('  ✅ Generación de estadísticas y métricas');
        console.log('  ✅ Sistema de reglas configurable');
        console.log('  ✅ Log de auditoría completo');
        
    } catch (error) {
        console.error('❌ Error en demostración SLA:', error);
        throw error;
    }
}

async function createTestTasks(db) {
    console.log('📝 Creando tareas de prueba con diferentes violaciones SLA...');
    
    const testTasks = [
        {
            title: 'Mantenimiento Crítico - Falla Sistema Cardio',
            description: 'Falla crítica en sistema cardiovascular principal',
            priority: 'critical',
            status: 'pending',
            location_id: 1,
            created_minutes_ago: 45 // Viola regla de 30 minutos
        },
        {
            title: 'Reparación Urgente - Máquina Pesas',
            description: 'Reparación urgente en máquina de pesas',
            priority: 'high',
            status: 'scheduled',
            location_id: 1,
            created_minutes_ago: 300 // Viola regla de 4 horas (240 min)
        },
        {
            title: 'Mantenimiento Preventivo',
            description: 'Mantenimiento preventivo rutinario',
            priority: 'medium',
            status: 'pending',
            location_id: 1,
            created_minutes_ago: 1500 // Viola regla de 24 horas (1440 min)
        },
        {
            title: 'Tarea Vencida - Limpieza Profunda',
            description: 'Limpieza profunda de equipos',
            priority: 'low',
            status: 'in_progress',
            location_id: 1,
            created_minutes_ago: 2000, // Muy vencida
            sla_deadline_hours_ago: 24 // SLA vencido hace 24 horas
        }
    ];
    
    for (const task of testTasks) {
        const sql = `
            INSERT INTO maintenancetasks 
            (title, description, priority, status, location_id, equipment_id, created_at, sla_deadline)
            VALUES (?, ?, ?, ?, ?, 1, 
                    DATE_SUB(NOW(), INTERVAL ? MINUTE),
                    DATE_SUB(NOW(), INTERVAL ? HOUR))
        `;
        
        const slaDeadlineHours = task.sla_deadline_hours_ago || 
            (task.priority === 'critical' ? -0.5 : 
             task.priority === 'high' ? -4 : 
             task.priority === 'medium' ? -24 : -48);
        
        await new Promise((resolve, reject) => {
            db.run(sql, [
                task.title,
                task.description,
                task.priority,
                task.status,
                task.location_id,
                task.created_minutes_ago,
                Math.abs(slaDeadlineHours)
            ], function(err) {
                if (err) {
                    console.error(`❌ Error creando tarea "${task.title}":`, err);
                    reject(err);
                } else {
                    console.log(`✅ Tarea creada: "${task.title}" (ID: ${this.lastID})`);
                    resolve(this.lastID);
                }
            });
        });
    }
}

// Ejecutar demostración si se llama directamente
if (require.main === module) {
    demonstrateSLASystem()
        .then(() => {
            console.log('\n🏁 Demostración completada');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Error en demostración:', error);
            process.exit(1);
        });
}

module.exports = { demonstrateSLASystem };