/**
 * GYMTEC ERP - Sistema de Asignación Inteligente de Recursos
 * Algoritmo avanzado que asigna técnicos considerando:
 * - SLA de clientes y contratos
 * - Carga de trabajo actual del técnico
 * - Especialización por tipo de equipo
 * - Ubicación geográfica y disponibilidad
 * @bitacora: Optimización automática de recursos humanos
 */

const express = require('express');
const router = express.Router();
const db = require('../../db-adapter');
const { authenticateToken } = require('../../core/middleware/auth.middleware');

// =====================================================
// ASIGNACIÓN INTELIGENTE DE RECURSOS
// =====================================================

/**
 * POST /api/tasks/:taskId/assign-intelligent - Asignar técnico automáticamente
 */
router.post('/tasks/:taskId/assign-intelligent', authenticateToken, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { force_reassign = false, preferred_skills = [] } = req.body;
        
        console.log(`🤖 Iniciando asignación inteligente para tarea ${taskId}...`);

        // 1. Obtener información completa de la tarea
        const task = await getTaskDetails(taskId);
        if (!task) {
            return res.status(404).json({
                error: 'Tarea no encontrada',
                code: 'TASK_NOT_FOUND'
            });
        }

        // 2. Verificar si ya está asignada y si se debe reasignar
        if (task.technician_id && !force_reassign) {
            return res.status(400).json({
                error: 'Tarea ya está asignada. Use force_reassign=true para reasignar',
                code: 'TASK_ALREADY_ASSIGNED',
                current_assignee: task.technician_name
            });
        }

        // 3. Obtener información del contrato y SLA
        const contractInfo = await getContractSLAInfo(task.contract_id, task.equipment_client_id);
        
        // 4. Buscar técnicos disponibles y calcular puntuación
        const availableTechnicians = await findAvailableTechnicians(task.scheduled_date);
        
        if (availableTechnicians.length === 0) {
            return res.status(400).json({
                error: 'No hay técnicos disponibles para la fecha programada',
                code: 'NO_TECHNICIANS_AVAILABLE'
            });
        }

        // 5. Calcular puntuación inteligente para cada técnico
        const technicianScores = await calculateTechnicianScores(
            task, 
            contractInfo, 
            availableTechnicians, 
            preferred_skills
        );

        // 6. Seleccionar el mejor técnico
        const bestTechnician = technicianScores.reduce((best, current) => 
            current.total_score > best.total_score ? current : best
        );

        // 7. Asignar la tarea
        const assignmentResult = await assignTaskToTechnician(
            taskId, 
            bestTechnician.id, 
            req.user?.id,
            'intelligent_assignment'
        );

        // 8. Registrar la decisión de asignación
        await logAssignmentDecision(taskId, bestTechnician, technicianScores);

        console.log(`✅ Tarea ${taskId} asignada inteligentemente a ${bestTechnician.name}`);

        res.json({
            message: 'Asignación inteligente completada',
            data: {
                task_id: taskId,
                task_title: task.title,
                assigned_to: {
                    id: bestTechnician.id,
                    name: bestTechnician.name,
                    specialization: bestTechnician.specialization,
                    score: bestTechnician.total_score
                },
                assignment_factors: {
                    sla_priority: contractInfo?.sla_level || 'standard',
                    workload_factor: bestTechnician.workload_score,
                    skills_match: bestTechnician.skills_score,
                    availability_score: bestTechnician.availability_score,
                    location_proximity: bestTechnician.location_score
                },
                alternative_technicians: technicianScores
                    .filter(t => t.id !== bestTechnician.id)
                    .sort((a, b) => b.total_score - a.total_score)
                    .slice(0, 3)
                    .map(t => ({
                        id: t.id,
                        name: t.name,
                        score: t.total_score,
                        reason: t.score_breakdown
                    })),
                assignment_timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Error en asignación inteligente:', error);
        res.status(500).json({ 
            error: 'Error en asignación inteligente',
            code: 'INTELLIGENT_ASSIGNMENT_ERROR',
            details: error.message
        });
    }
});

/**
 * POST /api/tasks/bulk-assign-intelligent - Asignación masiva inteligente
 */
router.post('/tasks/bulk-assign-intelligent', authenticateToken, async (req, res) => {
    try {
        const { task_filters = {}, optimize_for = 'balanced' } = req.body;
        
        console.log('🤖 Iniciando asignación masiva inteligente...');

        // 1. Obtener tareas no asignadas según filtros
        const unassignedTasks = await getUnassignedTasks(task_filters);
        
        if (unassignedTasks.length === 0) {
            return res.status(400).json({
                error: 'No hay tareas sin asignar que cumplan los criterios',
                code: 'NO_UNASSIGNED_TASKS'
            });
        }

        // 2. Obtener todos los técnicos disponibles
        const allTechnicians = await getAllAvailableTechnicians();
        
        // 3. Ejecutar algoritmo de optimización global
        const globalAssignments = await optimizeGlobalAssignments(
            unassignedTasks, 
            allTechnicians, 
            optimize_for
        );

        // 4. Ejecutar asignaciones en lote
        const assignmentResults = [];
        
        for (const assignment of globalAssignments) {
            try {
                const result = await assignTaskToTechnician(
                    assignment.task_id,
                    assignment.technician_id,
                    req.user?.id,
                    'bulk_intelligent_assignment'
                );
                
                assignmentResults.push({
                    task_id: assignment.task_id,
                    task_title: assignment.task_title,
                    technician_id: assignment.technician_id,
                    technician_name: assignment.technician_name,
                    score: assignment.score,
                    success: true
                });
                
            } catch (assignError) {
                assignmentResults.push({
                    task_id: assignment.task_id,
                    task_title: assignment.task_title,
                    success: false,
                    error: assignError.message
                });
            }
        }

        const successfulAssignments = assignmentResults.filter(r => r.success);
        
        console.log(`✅ ${successfulAssignments.length}/${unassignedTasks.length} tareas asignadas exitosamente`);

        res.json({
            message: 'Asignación masiva inteligente completada',
            data: {
                total_tasks_processed: unassignedTasks.length,
                successful_assignments: successfulAssignments.length,
                failed_assignments: assignmentResults.length - successfulAssignments.length,
                optimization_mode: optimize_for,
                assignments: assignmentResults,
                execution_timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Error en asignación masiva:', error);
        res.status(500).json({ 
            error: 'Error en asignación masiva inteligente',
            code: 'BULK_ASSIGNMENT_ERROR',
            details: error.message
        });
    }
});

/**
 * GET /api/technicians/workload-analysis - Análisis de carga de trabajo
 */
router.get('/technicians/workload-analysis', authenticateToken, async (req, res) => {
    try {
        const { date_from, date_to } = req.query;
        
        const dateFrom = date_from || new Date().toISOString().split('T')[0];
        const dateTo = date_to || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        console.log(`📊 Analizando carga de trabajo del ${dateFrom} al ${dateTo}...`);

        // Obtener estadísticas de carga de trabajo
        const workloadAnalysis = await analyzeTechnicianWorkload(dateFrom, dateTo);
        
        res.json({
            message: 'Análisis de carga de trabajo completado',
            data: {
                analysis_period: { from: dateFrom, to: dateTo },
                technician_analysis: workloadAnalysis,
                summary: {
                    total_technicians: workloadAnalysis.length,
                    overloaded_technicians: workloadAnalysis.filter(t => t.workload_percentage > 90).length,
                    underutilized_technicians: workloadAnalysis.filter(t => t.workload_percentage < 50).length,
                    average_workload: Math.round(
                        workloadAnalysis.reduce((sum, t) => sum + t.workload_percentage, 0) / workloadAnalysis.length
                    )
                }
            }
        });

    } catch (error) {
        console.error('❌ Error en análisis de carga:', error);
        res.status(500).json({ 
            error: 'Error en análisis de carga de trabajo',
            code: 'WORKLOAD_ANALYSIS_ERROR'
        });
    }
});

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

/**
 * Obtener detalles completos de la tarea
 */
async function getTaskDetails(taskId) {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT 
                mt.*,
                e.name as equipment_name,
                e.model_id,
                em.name as equipment_model,
                em.category as equipment_category,
                l.name as location_name,
                l.client_id as equipment_client_id,
                c.name as client_name,
                u.username as technician_name,
                cont.sla_level,
                cont.response_time_hours,
                cont.resolution_time_hours
            FROM MaintenanceTasks mt
            LEFT JOIN Equipment e ON mt.equipment_id = e.id
            LEFT JOIN EquipmentModels em ON e.model_id = em.id
            LEFT JOIN Locations l ON e.location_id = l.id
            LEFT JOIN Clients c ON l.client_id = c.id
            LEFT JOIN Users u ON mt.technician_id = u.id
            LEFT JOIN Contracts cont ON mt.contract_id = cont.id
            WHERE mt.id = ?
        `, [taskId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

/**
 * Obtener información de contrato y SLA
 */
async function getContractSLAInfo(contractId, clientId) {
    return new Promise((resolve, reject) => {
        // Si hay contrato específico, usar sus SLAs
        if (contractId) {
            db.get(`
                SELECT sla_level, response_time_hours, resolution_time_hours, 
                       contract_value, service_type
                FROM Contracts
                WHERE id = ?
            `, [contractId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        } else if (clientId) {
            // Si no hay contrato, buscar el mejor SLA del cliente
            db.get(`
                SELECT sla_level, MIN(response_time_hours) as response_time_hours,
                       MIN(resolution_time_hours) as resolution_time_hours
                FROM Contracts
                WHERE client_id = ? AND status = 'activo'
                ORDER BY response_time_hours ASC
                LIMIT 1
            `, [clientId], (err, row) => {
                if (err) reject(err);
                else resolve(row || { sla_level: 'standard', response_time_hours: 24, resolution_time_hours: 72 });
            });
        } else {
            resolve({ sla_level: 'standard', response_time_hours: 24, resolution_time_hours: 72 });
        }
    });
}

/**
 * Buscar técnicos disponibles
 */
async function findAvailableTechnicians(scheduledDate) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT 
                u.id, u.username as name, u.email, u.specialization,
                COALESCE(u.max_daily_tasks, 8) as max_daily_tasks,
                COALESCE(u.location_preference, '') as location_preference
            FROM Users u
            WHERE u.role = 'Tecnico' 
            AND u.status = 'Activo'
            ORDER BY u.username
        `, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

/**
 * Calcular puntuación inteligente para técnicos
 */
async function calculateTechnicianScores(task, contractInfo, technicians, preferredSkills) {
    const scores = [];
    
    for (const technician of technicians) {
        // 1. Puntuación por especialización y habilidades
        const skillsScore = calculateSkillsScore(technician, task, preferredSkills);
        
        // 2. Puntuación por carga de trabajo actual
        const workloadScore = await calculateWorkloadScore(technician.id, task.scheduled_date);
        
        // 3. Puntuación por SLA del contrato
        const slaScore = calculateSLAScore(technician, contractInfo);
        
        // 4. Puntuación por disponibilidad
        const availabilityScore = await calculateAvailabilityScore(technician.id, task.scheduled_date, task.scheduled_time);
        
        // 5. Puntuación por proximidad de ubicación
        const locationScore = calculateLocationScore(technician, task);
        
        // Cálculo de puntuación total ponderada
        const totalScore = (
            skillsScore * 0.30 +       // 30% habilidades
            workloadScore * 0.25 +     // 25% carga de trabajo
            slaScore * 0.20 +          // 20% SLA
            availabilityScore * 0.15 + // 15% disponibilidad
            locationScore * 0.10       // 10% ubicación
        );
        
        scores.push({
            id: technician.id,
            name: technician.name,
            specialization: technician.specialization,
            skills_score: skillsScore,
            workload_score: workloadScore,
            sla_score: slaScore,
            availability_score: availabilityScore,
            location_score: locationScore,
            total_score: Math.round(totalScore * 100) / 100,
            score_breakdown: {
                skills: `${Math.round(skillsScore * 100)}%`,
                workload: `${Math.round(workloadScore * 100)}%`,
                sla: `${Math.round(slaScore * 100)}%`,
                availability: `${Math.round(availabilityScore * 100)}%`,
                location: `${Math.round(locationScore * 100)}%`
            }
        });
    }
    
    return scores.sort((a, b) => b.total_score - a.total_score);
}

/**
 * Calcular puntuación de habilidades
 */
function calculateSkillsScore(technician, task, preferredSkills) {
    let score = 0.5; // Puntuación base
    
    // Bonus por especialización que coincide con categoría del equipo
    if (technician.specialization && task.equipment_category) {
        const specializations = technician.specialization.toLowerCase().split(',');
        const category = task.equipment_category.toLowerCase();
        
        if (specializations.some(spec => category.includes(spec.trim()) || spec.trim().includes(category))) {
            score += 0.4;
        }
    }
    
    // Bonus por habilidades preferidas
    if (preferredSkills.length > 0 && technician.specialization) {
        const techSkills = technician.specialization.toLowerCase();
        const matchingSkills = preferredSkills.filter(skill => 
            techSkills.includes(skill.toLowerCase())
        );
        score += (matchingSkills.length / preferredSkills.length) * 0.2;
    }
    
    return Math.min(score, 1.0);
}

/**
 * Calcular puntuación de carga de trabajo
 */
async function calculateWorkloadScore(technicianId, date) {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT COUNT(*) as daily_tasks
            FROM MaintenanceTasks
            WHERE technician_id = ? 
            AND scheduled_date = ?
            AND status IN ('pending', 'in_progress')
        `, [technicianId, date], (err, row) => {
            if (err) {
                reject(err);
            } else {
                const dailyTasks = row.daily_tasks || 0;
                const maxTasks = 8; // Máximo diario por técnico
                
                // Puntuación inversamente proporcional a la carga
                const workloadScore = Math.max(0, (maxTasks - dailyTasks) / maxTasks);
                resolve(workloadScore);
            }
        });
    });
}

/**
 * Calcular puntuación por SLA
 */
function calculateSLAScore(technician, contractInfo) {
    // Técnicos con más experiencia para SLAs más estrictos
    const slaLevel = contractInfo?.sla_level || 'standard';
    
    if (slaLevel === 'premium' || slaLevel === 'enterprise') {
        // Bonus para técnicos senior en contratos premium
        return technician.specialization ? 0.9 : 0.6;
    } else if (slaLevel === 'basico') {
        // Todos los técnicos pueden manejar SLA básico
        return 0.8;
    }
    
    return 0.7; // SLA standard
}

/**
 * Calcular puntuación de disponibilidad
 */
async function calculateAvailabilityScore(technicianId, date, time) {
    return new Promise((resolve, reject) => {
        // Verificar conflictos de horario
        db.get(`
            SELECT COUNT(*) as conflicts
            FROM MaintenanceTasks
            WHERE technician_id = ?
            AND scheduled_date = ?
            AND ABS(TIME_TO_SEC(scheduled_time) - TIME_TO_SEC(?)) < 7200
            AND status IN ('pending', 'in_progress')
        `, [technicianId, date, time || '09:00:00'], (err, row) => {
            if (err) {
                reject(err);
            } else {
                const conflicts = row.conflicts || 0;
                const availabilityScore = conflicts === 0 ? 1.0 : 0.3;
                resolve(availabilityScore);
            }
        });
    });
}

/**
 * Calcular puntuación de ubicación
 */
function calculateLocationScore(technician, task) {
    // Si el técnico tiene preferencia de ubicación y coincide
    if (technician.location_preference && task.location_name) {
        const preferred = technician.location_preference.toLowerCase();
        const taskLocation = task.location_name.toLowerCase();
        
        if (preferred.includes(taskLocation) || taskLocation.includes(preferred)) {
            return 1.0;
        }
    }
    
    return 0.5; // Puntuación neutral
}

/**
 * Asignar tarea a técnico
 */
async function assignTaskToTechnician(taskId, technicianId, assignedBy, assignmentType) {
    return new Promise((resolve, reject) => {
        db.run(`
            UPDATE MaintenanceTasks
            SET technician_id = ?, 
                assigned_at = NOW(),
                assigned_by = ?,
                assignment_type = ?,
                status = CASE WHEN status = 'pending' THEN 'assigned' ELSE status END
            WHERE id = ?
        `, [technicianId, assignedBy, assignmentType, taskId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({
                    task_id: taskId,
                    technician_id: technicianId,
                    assigned_at: new Date().toISOString(),
                    changes: this.changes
                });
            }
        });
    });
}

/**
 * Registrar decisión de asignación para auditoría
 */
async function logAssignmentDecision(taskId, selectedTechnician, allScores) {
    return new Promise((resolve, reject) => {
        const logData = {
            task_id: taskId,
            selected_technician_id: selectedTechnician.id,
            selected_score: selectedTechnician.total_score,
            algorithm_version: '1.0',
            decision_factors: JSON.stringify(selectedTechnician.score_breakdown),
            alternative_candidates: JSON.stringify(allScores.slice(0, 5)),
            decision_timestamp: new Date().toISOString()
        };
        
        db.run(`
            INSERT INTO AssignmentDecisionLog 
            (task_id, technician_id, score, algorithm_version, decision_factors, 
             alternative_candidates, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `, [
            logData.task_id,
            logData.selected_technician_id,
            logData.selected_score,
            logData.algorithm_version,
            logData.decision_factors,
            logData.alternative_candidates
        ], function(err) {
            if (err) {
                // No fallar si la tabla de log no existe
                console.warn('⚠️ No se pudo registrar log de asignación:', err.message);
                resolve({ logged: false });
            } else {
                resolve({ logged: true, log_id: this.lastID });
            }
        });
    });
}

/**
 * Obtener tareas no asignadas
 */
async function getUnassignedTasks(filters) {
    return new Promise((resolve, reject) => {
        let whereClause = 'WHERE mt.technician_id IS NULL AND mt.status = "pending"';
        const params = [];
        
        // Aplicar filtros adicionales
        if (filters.priority) {
            whereClause += ' AND mt.priority = ?';
            params.push(filters.priority);
        }
        
        if (filters.date_from) {
            whereClause += ' AND mt.scheduled_date >= ?';
            params.push(filters.date_from);
        }
        
        if (filters.date_to) {
            whereClause += ' AND mt.scheduled_date <= ?';
            params.push(filters.date_to);
        }
        
        db.all(`
            SELECT 
                mt.id, mt.title, mt.type, mt.priority,
                mt.scheduled_date, mt.scheduled_time,
                mt.estimated_duration, mt.equipment_id,
                e.name as equipment_name,
                em.category as equipment_category,
                l.name as location_name,
                c.name as client_name,
                cont.sla_level
            FROM MaintenanceTasks mt
            LEFT JOIN Equipment e ON mt.equipment_id = e.id
            LEFT JOIN EquipmentModels em ON e.model_id = em.id
            LEFT JOIN Locations l ON e.location_id = l.id
            LEFT JOIN Clients c ON l.client_id = c.id
            LEFT JOIN Contracts cont ON mt.contract_id = cont.id
            ${whereClause}
            ORDER BY mt.priority DESC, mt.scheduled_date ASC
        `, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

/**
 * Obtener todos los técnicos disponibles
 */
async function getAllAvailableTechnicians() {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT id, username as name, specialization, 
                   COALESCE(max_daily_tasks, 8) as max_daily_tasks
            FROM Users
            WHERE role = 'Tecnico' AND status = 'Activo'
            ORDER BY username
        `, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

/**
 * Optimizar asignaciones globales
 */
async function optimizeGlobalAssignments(tasks, technicians, optimizeFor) {
    const assignments = [];
    
    // Algoritmo simple de optimización (puede mejorarse con algoritmos más complejos)
    for (const task of tasks) {
        const contractInfo = await getContractSLAInfo(task.contract_id, task.client_id);
        const technicianScores = await calculateTechnicianScores(
            task, 
            contractInfo, 
            technicians, 
            []
        );
        
        if (technicianScores.length > 0) {
            const bestTechnician = technicianScores[0];
            
            assignments.push({
                task_id: task.id,
                task_title: task.title,
                technician_id: bestTechnician.id,
                technician_name: bestTechnician.name,
                score: bestTechnician.total_score
            });
        }
    }
    
    return assignments;
}

/**
 * Analizar carga de trabajo de técnicos
 */
async function analyzeTechnicianWorkload(dateFrom, dateTo) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT 
                u.id, u.username as name, u.specialization,
                COALESCE(u.max_daily_tasks, 8) as max_daily_tasks,
                COUNT(mt.id) as assigned_tasks,
                SUM(mt.estimated_duration) as total_duration_minutes,
                AVG(CASE WHEN mt.status = 'completed' THEN 100 ELSE 0 END) as completion_rate
            FROM Users u
            LEFT JOIN MaintenanceTasks mt ON u.id = mt.technician_id 
                AND mt.scheduled_date BETWEEN ? AND ?
            WHERE u.role = 'Tecnico' AND u.status = 'Activo'
            GROUP BY u.id, u.username, u.specialization, u.max_daily_tasks
            ORDER BY assigned_tasks DESC
        `, [dateFrom, dateTo], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                const analysis = rows.map(row => {
                    const workingDays = getWorkingDaysBetween(dateFrom, dateTo);
                    const maxPossibleTasks = row.max_daily_tasks * workingDays;
                    const workloadPercentage = maxPossibleTasks > 0 
                        ? Math.round((row.assigned_tasks / maxPossibleTasks) * 100)
                        : 0;
                    
                    return {
                        id: row.id,
                        name: row.name,
                        specialization: row.specialization,
                        assigned_tasks: row.assigned_tasks,
                        max_daily_tasks: row.max_daily_tasks,
                        workload_percentage: workloadPercentage,
                        total_duration_hours: Math.round((row.total_duration_minutes || 0) / 60),
                        completion_rate: Math.round(row.completion_rate || 0),
                        status: workloadPercentage > 90 ? 'overloaded' :
                               workloadPercentage < 50 ? 'underutilized' : 'optimal'
                    };
                });
                
                resolve(analysis);
            }
        });
    });
}

/**
 * Calcular días laborables entre fechas
 */
function getWorkingDaysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;
    
    while (start <= end) {
        const dayOfWeek = start.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // No domingos ni sábados
            workingDays++;
        }
        start.setDate(start.getDate() + 1);
    }
    
    return workingDays;
}

module.exports = router;
