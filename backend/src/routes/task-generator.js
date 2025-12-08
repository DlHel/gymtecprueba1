/**
 * GYMTEC ERP - Generador Automático de Tareas Contractuales
 * Sistema inteligente que genera tareas de mantenimiento preventivo
 * basado en condiciones contractuales y frecuencias acordadas
 * @bitacora: Automatización de planificación basada en contratos
 */

const express = require('express');
const router = express.Router();
const db = require('../db-adapter');
const { authenticateToken } = require('../middleware/auth');

// =====================================================
// GENERADOR AUTOMÁTICO DE TAREAS CONTRACTUALES
// =====================================================

/**
 * POST /api/contracts/generate-tasks - Generar tareas automáticas por contrato
 */
router.post('/contracts/:contractId/generate-tasks', authenticateToken, async (req, res) => {
    try {
        const { contractId } = req.params;
        const { frequency_type = 'monthly', months_ahead = 3 } = req.body;
        
        console.log(`🔄 Generando tareas automáticas para contrato ${contractId}...`);

        // 1. Obtener información del contrato
        const contract = await new Promise((resolve, reject) => {
            db.get(`
                SELECT c.*, cl.name as client_name, cl.id as client_id
                FROM Contracts c
                JOIN Clients cl ON c.client_id = cl.id
                WHERE c.id = ? AND c.status = 'activo'
            `, [contractId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!contract) {
            return res.status(404).json({
                error: 'Contrato no encontrado o inactivo',
                code: 'CONTRACT_NOT_FOUND'
            });
        }

        // 2. Obtener equipos del cliente
        const equipment = await new Promise((resolve, reject) => {
            db.all(`
                SELECT e.*, l.name as location_name, em.name as model_name
                FROM Equipment e
                JOIN Locations l ON e.location_id = l.id
                JOIN EquipmentModels em ON e.model_id = em.id
                WHERE l.client_id = ?
                ORDER BY e.name
            `, [contract.client_id], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (equipment.length === 0) {
            return res.status(400).json({
                error: 'No se encontraron equipos para el cliente',
                code: 'NO_EQUIPMENT_FOUND'
            });
        }

        // 3. Generar tareas según frecuencia contractual
        const generatedTasks = [];
        const startDate = new Date();
        
        for (let month = 0; month < months_ahead; month++) {
            const taskDate = new Date(startDate);
            taskDate.setMonth(taskDate.getMonth() + month + 1);
            taskDate.setDate(15); // Programar para el día 15 de cada mes
            
            // Generar tareas para cada equipo
            for (const equip of equipment) {
                const taskData = await generateContractualTask(
                    contract, 
                    equip, 
                    taskDate, 
                    frequency_type,
                    req.user?.id
                );
                
                if (taskData) {
                    generatedTasks.push(taskData);
                }
            }
        }

        // 4. Insertar tareas en lote
        const insertPromises = generatedTasks.map(task => insertMaintenanceTask(task));
        const results = await Promise.all(insertPromises);

        console.log(`✅ ${results.length} tareas generadas automáticamente`);

        res.json({
            message: 'Tareas generadas exitosamente',
            data: {
                contract_id: contractId,
                contract_name: contract.contract_name,
                client_name: contract.client_name,
                tasks_generated: results.length,
                equipment_count: equipment.length,
                months_ahead: months_ahead,
                tasks: results,
                generation_date: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Error generando tareas automáticas:', error);
        res.status(500).json({ 
            error: 'Error al generar tareas automáticas',
            code: 'TASK_GENERATION_ERROR' 
        });
    }
});

/**
 * POST /api/contracts/generate-all-tasks - Generar tareas para todos los contratos activos
 */
router.post('/contracts/generate-all-tasks', authenticateToken, async (req, res) => {
    try {
        const { months_ahead = 2 } = req.body;
        
        console.log('🔄 Generando tareas para todos los contratos activos...');

        // Obtener todos los contratos activos
        const activeContracts = await new Promise((resolve, reject) => {
            db.all(`
                SELECT c.*, cl.name as client_name
                FROM Contracts c
                JOIN Clients cl ON c.client_id = cl.id
                WHERE c.status = 'activo'
                ORDER BY cl.name
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (activeContracts.length === 0) {
            return res.status(400).json({
                error: 'No se encontraron contratos activos',
                code: 'NO_ACTIVE_CONTRACTS'
            });
        }

        const allGeneratedTasks = [];
        const contractSummary = [];

        // Generar tareas para cada contrato
        for (const contract of activeContracts) {
            try {
                const equipment = await new Promise((resolve, reject) => {
                    db.all(`
                        SELECT e.*, l.name as location_name, em.name as model_name
                        FROM Equipment e
                        JOIN Locations l ON e.location_id = l.id
                        JOIN EquipmentModels em ON e.model_id = em.id
                        WHERE l.client_id = ?
                    `, [contract.client_id], (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });

                const contractTasks = [];
                const startDate = new Date();
                
                for (let month = 0; month < months_ahead; month++) {
                    const taskDate = new Date(startDate);
                    taskDate.setMonth(taskDate.getMonth() + month + 1);
                    taskDate.setDate(Math.floor(Math.random() * 28) + 1); // Días aleatorios distribuidos
                    
                    for (const equip of equipment) {
                        const taskData = await generateContractualTask(
                            contract, 
                            equip, 
                            taskDate, 
                            'monthly',
                            req.user?.id
                        );
                        
                        if (taskData) {
                            const insertedTask = await insertMaintenanceTask(taskData);
                            contractTasks.push(insertedTask);
                            allGeneratedTasks.push(insertedTask);
                        }
                    }
                }

                contractSummary.push({
                    contract_id: contract.id,
                    contract_name: contract.contract_name,
                    client_name: contract.client_name,
                    equipment_count: equipment.length,
                    tasks_generated: contractTasks.length
                });

            } catch (contractError) {
                console.warn(`⚠️ Error procesando contrato ${contract.id}:`, contractError.message);
                contractSummary.push({
                    contract_id: contract.id,
                    contract_name: contract.contract_name,
                    client_name: contract.client_name,
                    equipment_count: 0,
                    tasks_generated: 0,
                    error: contractError.message
                });
            }
        }

        console.log(`✅ ${allGeneratedTasks.length} tareas generadas para ${activeContracts.length} contratos`);

        res.json({
            message: 'Tareas generadas masivamente',
            data: {
                total_tasks_generated: allGeneratedTasks.length,
                contracts_processed: activeContracts.length,
                months_ahead: months_ahead,
                contract_summary: contractSummary,
                generation_date: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Error en generación masiva:', error);
        res.status(500).json({ 
            error: 'Error en generación masiva de tareas',
            code: 'BULK_GENERATION_ERROR' 
        });
    }
});

/**
 * GET /api/contracts/task-generation-preview - Preview de tareas a generar
 */
router.get('/contracts/:contractId/task-generation-preview', authenticateToken, async (req, res) => {
    try {
        const { contractId } = req.params;
        const { months_ahead = 2 } = req.query;
        
        // Obtener contrato y equipos
        const contract = await new Promise((resolve, reject) => {
            db.get(`
                SELECT c.*, cl.name as client_name
                FROM Contracts c
                JOIN Clients cl ON c.client_id = cl.id
                WHERE c.id = ? AND c.status = 'activo'
            `, [contractId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!contract) {
            return res.status(404).json({
                error: 'Contrato no encontrado',
                code: 'CONTRACT_NOT_FOUND'
            });
        }

        const equipment = await new Promise((resolve, reject) => {
            db.all(`
                SELECT e.*, l.name as location_name, em.name as model_name
                FROM Equipment e
                JOIN Locations l ON e.location_id = l.id
                JOIN EquipmentModels em ON e.model_id = em.id
                WHERE l.client_id = ?
            `, [contract.client_id], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // Generar preview sin insertar
        const taskPreview = [];
        const startDate = new Date();
        
        for (let month = 0; month < months_ahead; month++) {
            const taskDate = new Date(startDate);
            taskDate.setMonth(taskDate.getMonth() + month + 1);
            taskDate.setDate(15);
            
            for (const equip of equipment) {
                taskPreview.push({
                    title: `Mantenimiento Contractual - ${equip.name || equip.model_name}`,
                    equipment_name: equip.name || equip.model_name,
                    location_name: equip.location_name,
                    scheduled_date: taskDate.toISOString().split('T')[0],
                    type: 'maintenance',
                    priority: getContractualPriority(contract),
                    is_contractual: true
                });
            }
        }

        res.json({
            message: 'Preview generado',
            data: {
                contract: {
                    id: contract.id,
                    name: contract.contract_name,
                    client: contract.client_name
                },
                equipment_count: equipment.length,
                tasks_to_generate: taskPreview.length,
                months_ahead: parseInt(months_ahead, 10),
                task_preview: taskPreview
            }
        });

    } catch (error) {
        console.error('❌ Error en preview:', error);
        res.status(500).json({ 
            error: 'Error al generar preview',
            code: 'PREVIEW_ERROR' 
        });
    }
});

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

/**
 * Generar datos de tarea contractual
 */
async function generateContractualTask(contract, equipment, scheduledDate, frequencyType, userId) {
    const taskTypes = ['maintenance', 'inspection', 'cleaning'];
    const randomType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
    
    return {
        title: `${getTaskTypeLabel(randomType)} Contractual - ${equipment.name || equipment.model_name}`,
        description: `Tarea de ${getTaskTypeLabel(randomType).toLowerCase()} generada automáticamente según contrato ${contract.contract_number}`,
        type: randomType,
        equipment_id: equipment.id,
        scheduled_date: scheduledDate.toISOString().split('T')[0],
        scheduled_time: getOptimalScheduleTime(contract),
        estimated_duration: getEstimatedDuration(randomType),
        priority: getContractualPriority(contract),
        is_preventive: true,
        is_contractual: true,
        contract_id: contract.id,
        notes: `Generado automáticamente según condiciones del contrato. Frecuencia: ${frequencyType}`,
        status: 'pending',
        created_by: userId
    };
}

/**
 * Insertar tarea de mantenimiento
 */
async function insertMaintenanceTask(taskData) {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO MaintenanceTasks 
            (title, description, type, equipment_id, scheduled_date, scheduled_time,
             estimated_duration, priority, is_preventive, notes, status, created_by,
             contract_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        const values = [
            taskData.title,
            taskData.description,
            taskData.type,
            taskData.equipment_id,
            taskData.scheduled_date,
            taskData.scheduled_time,
            taskData.estimated_duration,
            taskData.priority,
            taskData.is_preventive,
            taskData.notes,
            taskData.status,
            taskData.created_by,
            taskData.contract_id
        ];
        
        db.run(sql, values, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({
                    id: this.lastID,
                    ...taskData
                });
            }
        });
    });
}

/**
 * Obtener etiqueta del tipo de tarea
 */
function getTaskTypeLabel(type) {
    const labels = {
        'maintenance': 'Mantenimiento',
        'inspection': 'Inspección',
        'cleaning': 'Limpieza',
        'repair': 'Reparación'
    };
    return labels[type] || 'Mantenimiento';
}

/**
 * Obtener horario óptimo según contrato
 */
function getOptimalScheduleTime(contract) {
    // Horarios óptimos según valor del contrato
    if (contract.monthly_fee > 300000) {
        return '08:00:00'; // Clientes premium - horario temprano
    } else if (contract.monthly_fee > 150000) {
        return '10:00:00'; // Clientes medios - horario medio
    } else {
        return '14:00:00'; // Clientes básicos - horario tarde
    }
}

/**
 * Obtener duración estimada según tipo
 */
function getEstimatedDuration(type) {
    const durations = {
        'maintenance': 120, // 2 horas
        'inspection': 60,   // 1 hora
        'cleaning': 90,     // 1.5 horas
        'repair': 180       // 3 horas
    };
    return durations[type] || 120;
}

/**
 * Obtener prioridad según SLA contractual
 */
function getContractualPriority(contract) {
    // Prioridad basada en SLA más estricto
    const minSLA = Math.min(
        contract.sla_p1_hours || 24,
        contract.sla_p2_hours || 24,
        contract.sla_p3_hours || 24,
        contract.sla_p4_hours || 24
    );
    
    if (minSLA <= 4) return 'high';
    if (minSLA <= 8) return 'medium';
    return 'low';
}

// Bind functions to router context
router.generateContractualTask = generateContractualTask;
router.insertMaintenanceTask = insertMaintenanceTask;
router.getTaskTypeLabel = getTaskTypeLabel;
router.getOptimalScheduleTime = getOptimalScheduleTime;
router.getEstimatedDuration = getEstimatedDuration;
router.getContractualPriority = getContractualPriority;

module.exports = router;