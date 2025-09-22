// Migración para sistema de asignación inteligente de recursos
const mysql = require('mysql2/promise');

async function migrateIntelligentAssignment() {
    let connection;
    
    try {
        console.log('🔄 Iniciando migración del sistema de asignación inteligente...');
        
        // Conectar a la base de datos
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gymtec_erp'
        });

        console.log('✅ Conectado a la base de datos MySQL');

        // 1. Crear tabla para log de decisiones de asignación
        console.log('\n1. Creando tabla AssignmentDecisionLog...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS AssignmentDecisionLog (
                id INT AUTO_INCREMENT PRIMARY KEY,
                task_id INT NOT NULL,
                technician_id INT NOT NULL,
                score DECIMAL(5,2) NOT NULL,
                algorithm_version VARCHAR(10) DEFAULT '1.0',
                decision_factors JSON,
                alternative_candidates JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                INDEX idx_task_id (task_id),
                INDEX idx_technician_id (technician_id),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Tabla AssignmentDecisionLog creada');

        // 2. Agregar campos de asignación a MaintenanceTasks si no existen
        console.log('\n2. Agregando campos de asignación inteligente a MaintenanceTasks...');
        
        // Verificar si las columnas ya existen
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'gymtec_erp' 
            AND TABLE_NAME = 'MaintenanceTasks'
            AND COLUMN_NAME IN ('assigned_by', 'assignment_type', 'assigned_at')
        `);
        
        const existingColumns = columns.map(col => col.COLUMN_NAME);
        
        if (!existingColumns.includes('assigned_by')) {
            await connection.execute(`
                ALTER TABLE MaintenanceTasks 
                ADD COLUMN assigned_by INT,
                ADD INDEX idx_assigned_by (assigned_by)
            `);
            console.log('✅ Columna assigned_by agregada');
        }
        
        if (!existingColumns.includes('assignment_type')) {
            await connection.execute(`
                ALTER TABLE MaintenanceTasks 
                ADD COLUMN assignment_type VARCHAR(50) DEFAULT 'manual'
            `);
            console.log('✅ Columna assignment_type agregada');
        }
        
        if (!existingColumns.includes('assigned_at')) {
            await connection.execute(`
                ALTER TABLE MaintenanceTasks 
                ADD COLUMN assigned_at TIMESTAMP NULL,
                ADD INDEX idx_assigned_at (assigned_at)
            `);
            console.log('✅ Columna assigned_at agregada');
        }

        // 3. Agregar campos de configuración a Users para técnicos
        console.log('\n3. Agregando campos de configuración para técnicos...');
        
        const [userColumns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'gymtec_erp' 
            AND TABLE_NAME = 'Users'
            AND COLUMN_NAME IN ('max_daily_tasks', 'specialization', 'location_preference')
        `);
        
        const existingUserColumns = userColumns.map(col => col.COLUMN_NAME);
        
        if (!existingUserColumns.includes('max_daily_tasks')) {
            await connection.execute(`
                ALTER TABLE Users 
                ADD COLUMN max_daily_tasks INT DEFAULT 8
            `);
            console.log('✅ Columna max_daily_tasks agregada');
        }
        
        if (!existingUserColumns.includes('specialization')) {
            await connection.execute(`
                ALTER TABLE Users 
                ADD COLUMN specialization VARCHAR(255)
            `);
            console.log('✅ Columna specialization agregada');
        }
        
        if (!existingUserColumns.includes('location_preference')) {
            await connection.execute(`
                ALTER TABLE Users 
                ADD COLUMN location_preference VARCHAR(255)
            `);
            console.log('✅ Columna location_preference agregada');
        }

        // 4. Configurar datos de ejemplo para técnicos
        console.log('\n4. Configurando especializaciones de técnicos...');
        
        // Obtener técnicos existentes
        const [technicians] = await connection.execute(`
            SELECT id, username FROM Users WHERE role = 'technician'
        `);
        
        if (technicians.length > 0) {
            const specializations = [
                'cardio,electronica',
                'fuerza,mecanica',
                'funcional,general',
                'cardio,fuerza',
                'electronica,calibracion'
            ];
            
            for (let i = 0; i < technicians.length; i++) {
                const tech = technicians[i];
                const spec = specializations[i % specializations.length];
                
                await connection.execute(`
                    UPDATE Users 
                    SET specialization = ?, max_daily_tasks = ?
                    WHERE id = ?
                `, [spec, 6 + Math.floor(Math.random() * 4), tech.id]); // 6-9 tareas diarias
            }
            
            console.log(`✅ Especializaciones configuradas para ${technicians.length} técnicos`);
        }

        // 5. Crear vista para análisis de asignaciones
        console.log('\n5. Creando vista para análisis de asignaciones...');
        await connection.execute(`
            CREATE OR REPLACE VIEW AssignmentAnalysisView AS
            SELECT 
                mt.id as task_id,
                mt.title as task_title,
                mt.type as task_type,
                mt.priority,
                mt.scheduled_date,
                mt.status,
                mt.assignment_type,
                mt.assigned_at,
                u.username as technician_name,
                u.specialization,
                adl.score as assignment_score,
                adl.algorithm_version,
                e.name as equipment_name,
                em.category as equipment_category,
                c.name as client_name,
                cont.sla_level
            FROM MaintenanceTasks mt
            LEFT JOIN Users u ON mt.technician_id = u.id
            LEFT JOIN AssignmentDecisionLog adl ON mt.id = adl.task_id
            LEFT JOIN Equipment e ON mt.equipment_id = e.id
            LEFT JOIN EquipmentModels em ON e.model_id = em.id
            LEFT JOIN Locations l ON e.location_id = l.id
            LEFT JOIN Clients c ON l.client_id = c.id
            LEFT JOIN Contracts cont ON mt.contract_id = cont.id
            WHERE mt.technician_id IS NOT NULL
        `);
        console.log('✅ Vista AssignmentAnalysisView creada');

        // 6. Insertar datos de prueba para demostración
        console.log('\n6. Creando tareas de ejemplo para pruebas...');
        
        // Verificar si hay equipos y contratos
        const [equipmentCount] = await connection.execute('SELECT COUNT(*) as count FROM Equipment');
        const [contractCount] = await connection.execute('SELECT COUNT(*) as count FROM Contracts');
        
        if (equipmentCount[0].count > 0 && contractCount[0].count > 0) {
            // Obtener equipos y contratos para ejemplos
            const [sampleEquipment] = await connection.execute(`
                SELECT e.id as equipment_id, cont.id as contract_id
                FROM Equipment e
                LEFT JOIN Locations l ON e.location_id = l.id
                LEFT JOIN Contracts cont ON l.client_id = cont.client_id
                WHERE cont.id IS NOT NULL
                LIMIT 3
            `);
            
            for (const sample of sampleEquipment) {
                await connection.execute(`
                    INSERT IGNORE INTO MaintenanceTasks 
                    (title, description, type, equipment_id, contract_id, 
                     scheduled_date, scheduled_time, estimated_duration, 
                     priority, is_preventive, status, created_at)
                    VALUES 
                    (?, ?, ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL 7 DAY), 
                     '09:00:00', 120, 'medium', TRUE, 'pending', NOW())
                `, [
                    `Mantenimiento Preventivo - Equipo ${sample.equipment_id}`,
                    'Tarea de ejemplo para pruebas del sistema de asignación inteligente',
                    'maintenance',
                    sample.equipment_id,
                    sample.contract_id
                ]);
            }
            
            console.log(`✅ ${sampleEquipment.length} tareas de ejemplo creadas`);
        }

        console.log('\n🎉 ¡Migración del sistema de asignación inteligente completada exitosamente!');
        console.log('\n📋 Resumen de cambios:');
        console.log('   ✅ Tabla AssignmentDecisionLog creada');
        console.log('   ✅ Campos de asignación agregados a MaintenanceTasks');
        console.log('   ✅ Campos de configuración agregados a Users');
        console.log('   ✅ Especializaciones de técnicos configuradas');
        console.log('   ✅ Vista AssignmentAnalysisView creada');
        console.log('   ✅ Tareas de ejemplo para pruebas creadas');
        
        console.log('\n🚀 Sistema listo para usar:');
        console.log('   📍 POST /api/tasks/:taskId/assign-intelligent');
        console.log('   📍 POST /api/tasks/bulk-assign-intelligent');
        console.log('   📍 GET /api/technicians/workload-analysis');

    } catch (error) {
        console.error('❌ Error en la migración:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Conexión cerrada');
        }
    }
}

// Ejecutar migración
migrateIntelligentAssignment().catch(console.error);