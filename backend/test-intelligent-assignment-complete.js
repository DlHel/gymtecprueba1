const mysql = require('mysql2/promise');

const config = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gymtec_erp'
};

async function testIntelligentAssignmentWorkflow() {
    console.log('🧪 Iniciando prueba completa del sistema de asignación inteligente...\n');
    
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('✅ Conectado a la base de datos\n');

        // 1. Verificar configuración de técnicos
        console.log('📋 1. Verificando configuración de técnicos:');
        const technicians = await connection.execute(`
            SELECT id, username, role, max_daily_tasks, specialization, location_preference 
            FROM users 
            WHERE role = 'Tecnico'
        `);
        
        console.log(`Técnicos encontrados: ${technicians[0].length}`);
        technicians[0].forEach(tech => {
            console.log(`  - ${tech.username}: especialización=${tech.specialization}, max_tareas=${tech.max_daily_tasks}, ubicación=${tech.location_preference}`);
        });
        console.log('');

        // 2. Verificar tareas pendientes
        console.log('📋 2. Verificando tareas de mantenimiento pendientes:');
        const pendingTasks = await connection.execute(`
            SELECT id, title, priority, sla_deadline, equipment_type, location_id, technician_id
            FROM maintenancetasks 
            WHERE technician_id IS NULL
            ORDER BY priority DESC, sla_deadline ASC
        `);
        
        console.log(`Tareas pendientes de asignación: ${pendingTasks[0].length}`);
        pendingTasks[0].forEach(task => {
            console.log(`  - Tarea ${task.id}: ${task.title} (Prioridad: ${task.priority}, SLA: ${task.sla_deadline})`);
        });
        console.log('');

        // 3. Simular asignación inteligente para una tarea
        if (pendingTasks[0].length > 0) {
            const taskToAssign = pendingTasks[0][0];
            console.log(`📋 3. Simulando asignación inteligente para tarea: ${taskToAssign.title}`);
            
            // Calcular scores para cada técnico
            for (const tech of technicians[0]) {
                console.log(`\n  Evaluando técnico: ${tech.username}`);
                
                // Score de especialización
                let specializationScore = 0;
                if (tech.specialization) {
                    const specializations = tech.specialization.split(',').map(s => s.trim().toLowerCase());
                    const taskType = taskToAssign.equipment_type ? taskToAssign.equipment_type.toLowerCase() : '';
                    
                    if (specializations.includes(taskType) || specializations.includes('general')) {
                        specializationScore = specializations.includes(taskType) ? 10 : 5;
                    }
                }
                
                // Score de carga de trabajo actual
                const workloadQuery = await connection.execute(`
                    SELECT COUNT(*) as current_tasks 
                    FROM maintenancetasks 
                    WHERE technician_id = ? AND status NOT IN ('completed', 'cancelled')
                `, [tech.id]);
                
                const currentTasks = workloadQuery[0][0].current_tasks;
                const maxTasks = tech.max_daily_tasks || 5;
                const workloadScore = Math.max(0, 10 - (currentTasks / maxTasks) * 10);
                
                // Score de prioridad SLA
                const slaScore = taskToAssign.priority === 'critical' ? 10 : 
                                taskToAssign.priority === 'high' ? 8 :
                                taskToAssign.priority === 'medium' ? 5 : 3;
                
                // Score total
                const totalScore = specializationScore + workloadScore + slaScore;
                
                console.log(`    - Especialización: ${specializationScore}/10`);
                console.log(`    - Carga trabajo: ${workloadScore.toFixed(1)}/10 (tareas actuales: ${currentTasks}/${maxTasks})`);
                console.log(`    - Prioridad SLA: ${slaScore}/10`);
                console.log(`    - SCORE TOTAL: ${totalScore.toFixed(1)}/30`);
            }
        }

        // 4. Verificar logs de asignación
        console.log('\n📋 4. Verificando logs de asignación:');
        const assignmentLogs = await connection.execute(`
            SELECT * FROM assignmentdecisionlog 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        console.log(`Registros de asignación encontrados: ${assignmentLogs[0].length}`);
        assignmentLogs[0].forEach(log => {
            console.log(`  - Tarea ${log.task_id} → Técnico ${log.technician_id} (Score: ${log.assignment_score}, Razón: ${log.assignment_reason})`);
        });

        console.log('\n✅ Prueba del sistema de asignación inteligente completada');

    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testIntelligentAssignmentWorkflow();