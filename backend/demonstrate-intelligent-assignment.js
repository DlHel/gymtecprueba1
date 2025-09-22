const mysql = require('mysql2/promise');

// Simular el algoritmo de asignación inteligente directamente
async function demonstrateIntelligentAssignment() {
    let connection;
    
    try {
        console.log('🎯 DEMOSTRACIÓN COMPLETA - Sistema de Asignación Inteligente\n');
        
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gymtec_erp'
        });

        console.log('✅ Conectado a la base de datos\n');

        // 1. Mostrar técnicos disponibles
        console.log('👥 TÉCNICOS DISPONIBLES:');
        const [technicians] = await connection.execute(`
            SELECT id, username, role, specialization, max_daily_tasks, location_preference 
            FROM users 
            WHERE role = 'Tecnico' AND status = 'Activo'
        `);
        
        console.table(technicians);

        // 2. Mostrar tareas pendientes
        console.log('\n📋 TAREAS PENDIENTES DE ASIGNACIÓN:');
        const [pendingTasks] = await connection.execute(`
            SELECT id, title, priority, equipment_type, location_id, sla_deadline
            FROM maintenancetasks 
            WHERE technician_id IS NULL
            ORDER BY priority DESC, sla_deadline ASC
            LIMIT 3
        `);
        
        console.table(pendingTasks);

        // 3. Simular el algoritmo de asignación inteligente
        console.log('\n🧠 SIMULACIÓN DEL ALGORITMO DE ASIGNACIÓN INTELIGENTE:\n');
        
        for (const task of pendingTasks) {
            console.log(`📌 Analizando tarea: "${task.title}" (ID: ${task.id})`);
            console.log(`   Prioridad: ${task.priority} | Tipo: ${task.equipment_type || 'general'}\n`);

            let bestTechnician = null;
            let bestScore = 0;
            const analysisResults = [];

            // Evaluar cada técnico
            for (const tech of technicians) {
                let score = 0;
                const analysis = {
                    technician: tech.username,
                    factors: {}
                };

                // 1. Score de especialización (0-10)
                let specializationScore = 0;
                if (tech.specialization) {
                    const specializations = tech.specialization.split(',').map(s => s.trim().toLowerCase());
                    const taskType = (task.equipment_type || 'general').toLowerCase();
                    
                    if (specializations.includes(taskType)) {
                        specializationScore = 10;
                    } else if (specializations.includes('general')) {
                        specializationScore = 5;
                    }
                }
                analysis.factors.especialización = `${specializationScore}/10`;

                // 2. Score de carga de trabajo (0-10)
                const [workload] = await connection.execute(`
                    SELECT COUNT(*) as current_tasks 
                    FROM maintenancetasks 
                    WHERE technician_id = ? AND status NOT IN ('completed', 'cancelled')
                `, [tech.id]);
                
                const currentTasks = workload[0].current_tasks;
                const maxTasks = tech.max_daily_tasks || 8;
                const workloadScore = Math.max(0, 10 - (currentTasks / maxTasks) * 10);
                analysis.factors.carga_trabajo = `${workloadScore.toFixed(1)}/10 (${currentTasks}/${maxTasks} tareas)`;

                // 3. Score de prioridad SLA (0-10)
                const priorityScore = task.priority === 'critical' ? 10 : 
                                   task.priority === 'high' ? 8 :
                                   task.priority === 'medium' ? 5 : 3;
                analysis.factors.prioridad_sla = `${priorityScore}/10`;

                // 4. Score de disponibilidad (0-10)
                const availabilityScore = currentTasks < maxTasks ? 10 : 0;
                analysis.factors.disponibilidad = `${availabilityScore}/10`;

                // Score total
                score = specializationScore + workloadScore + priorityScore + availabilityScore;
                analysis.score_total = `${score.toFixed(1)}/40`;

                analysisResults.push(analysis);

                if (score > bestScore && availabilityScore > 0) {
                    bestScore = score;
                    bestTechnician = tech;
                }

                console.log(`   👤 ${tech.username}:`);
                console.log(`      • Especialización: ${analysis.factors.especialización}`);
                console.log(`      • Carga trabajo: ${analysis.factors.carga_trabajo}`);
                console.log(`      • Prioridad SLA: ${analysis.factors.prioridad_sla}`);
                console.log(`      • Disponibilidad: ${analysis.factors.disponibilidad}`);
                console.log(`      • 🎯 SCORE TOTAL: ${analysis.score_total}`);
                console.log('');
            }

            // Mostrar resultado de la asignación
            if (bestTechnician) {
                console.log(`   ✅ ASIGNACIÓN RECOMENDADA: ${bestTechnician.username} (Score: ${bestScore.toFixed(1)})`);
                
                // Simular asignación en la base de datos
                await connection.execute(`
                    UPDATE maintenancetasks 
                    SET technician_id = ?, 
                        assigned_at = NOW(), 
                        assignment_type = 'automatic'
                    WHERE id = ?
                `, [bestTechnician.id, task.id]);

                // Registrar decisión en log
                await connection.execute(`
                    INSERT INTO assignmentdecisionlog 
                    (task_id, technician_id, score, algorithm_version, decision_factors)
                    VALUES (?, ?, ?, ?, ?)
                `, [
                    task.id, 
                    bestTechnician.id, 
                    bestScore, 
                    '1.0',
                    JSON.stringify({
                        reason: 'Asignación automática basada en especialización y carga de trabajo',
                        factors: analysisResults.find(r => r.technician === bestTechnician.username)?.factors || {}
                    })
                ]);

                console.log(`   📝 Tarea asignada y registrada en el sistema`);
            } else {
                console.log(`   ❌ NO SE ENCONTRÓ TÉCNICO DISPONIBLE`);
            }
            
            console.log('\n' + '─'.repeat(80) + '\n');
        }

        // 4. Mostrar estado final
        console.log('📊 ESTADO FINAL DESPUÉS DE LA ASIGNACIÓN:\n');
        
        const [finalTasks] = await connection.execute(`
            SELECT 
                mt.id,
                mt.title,
                mt.priority,
                u.username as tecnico_asignado,
                mt.assignment_type,
                mt.assigned_at
            FROM maintenancetasks mt
            LEFT JOIN users u ON mt.technician_id = u.id
            WHERE mt.id IN (${pendingTasks.map(t => t.id).join(',')})
        `);
        
        console.table(finalTasks);

        // 5. Mostrar logs de asignación
        console.log('\n📋 LOGS DE ASIGNACIÓN GENERADOS:\n');
        const [logs] = await connection.execute(`
            SELECT 
                task_id,
                (SELECT username FROM users WHERE id = technician_id) as tecnico,
                score,
                algorithm_version,
                decision_factors,
                created_at
            FROM assignmentdecisionlog 
            WHERE task_id IN (${pendingTasks.map(t => t.id).join(',')})
            ORDER BY created_at DESC
        `);
        
        console.table(logs);

        console.log('\n🎉 DEMOSTRACIÓN COMPLETADA - Sistema de Asignación Inteligente Funcional');
        console.log('\n📈 RESUMEN:');
        console.log(`   • Técnicos analizados: ${technicians.length}`);
        console.log(`   • Tareas procesadas: ${pendingTasks.length}`);
        console.log(`   • Asignaciones realizadas: ${logs.length}`);
        console.log(`   • Algoritmo: ML-like scoring basado en múltiples factores`);
        console.log(`   • Logs: Auditables con scoring detallado`);

    } catch (error) {
        console.error('❌ Error en la demostración:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Ejecutar demostración
demonstrateIntelligentAssignment();