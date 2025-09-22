// Migración corregida para sistema de asignación inteligente
const mysql = require('mysql2/promise');

async function migrateIntelligentAssignmentFixed() {
    let connection;
    
    try {
        console.log('🔄 Iniciando migración corregida del sistema de asignación inteligente...');
        
        // Conectar a la base de datos
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gymtec_erp'
        });

        console.log('✅ Conectado a la base de datos MySQL');

        // 1. Verificar si la tabla maintenancetasks existe y tiene la estructura correcta
        console.log('\n1. Verificando tabla maintenancetasks...');
        const [tables] = await connection.execute(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'gymtec_erp' 
            AND TABLE_NAME = 'maintenancetasks'
        `);
        
        if (tables.length === 0) {
            console.log('⚠️  Tabla maintenancetasks no existe, creándola...');
            await connection.execute(`
                CREATE TABLE maintenancetasks (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
                    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
                    equipment_type VARCHAR(100),
                    location_id INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    technician_id INT NULL,
                    assigned_by INT NULL,
                    assignment_type ENUM('manual', 'automatic') DEFAULT 'manual',
                    assigned_at TIMESTAMP NULL,
                    sla_deadline TIMESTAMP NULL,
                    
                    INDEX idx_technician_id (technician_id),
                    INDEX idx_location_id (location_id),
                    INDEX idx_status (status),
                    INDEX idx_priority (priority),
                    INDEX idx_assigned_at (assigned_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('✅ Tabla maintenancetasks creada con estructura completa');
        } else {
            console.log('✅ Tabla maintenancetasks encontrada, verificando columnas...');
            
            // Verificar columnas de asignación
            const [columns] = await connection.execute(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = 'gymtec_erp' 
                AND TABLE_NAME = 'maintenancetasks'
            `);
            
            const existingColumns = columns.map(col => col.COLUMN_NAME.toLowerCase());
            
            if (!existingColumns.includes('technician_id')) {
                await connection.execute(`
                    ALTER TABLE maintenancetasks 
                    ADD COLUMN technician_id INT NULL,
                    ADD INDEX idx_technician_id (technician_id)
                `);
                console.log('✅ Columna technician_id agregada a maintenancetasks');
            }
            
            if (!existingColumns.includes('assigned_by')) {
                await connection.execute(`
                    ALTER TABLE maintenancetasks 
                    ADD COLUMN assigned_by INT NULL
                `);
                console.log('✅ Columna assigned_by agregada');
            }
            
            if (!existingColumns.includes('assignment_type')) {
                await connection.execute(`
                    ALTER TABLE maintenancetasks 
                    ADD COLUMN assignment_type ENUM('manual', 'automatic') DEFAULT 'manual'
                `);
                console.log('✅ Columna assignment_type agregada');
            }
            
            if (!existingColumns.includes('assigned_at')) {
                await connection.execute(`
                    ALTER TABLE maintenancetasks 
                    ADD COLUMN assigned_at TIMESTAMP NULL
                `);
                console.log('✅ Columna assigned_at agregada');
            }
            
            if (!existingColumns.includes('sla_deadline')) {
                await connection.execute(`
                    ALTER TABLE maintenancetasks 
                    ADD COLUMN sla_deadline TIMESTAMP NULL
                `);
                console.log('✅ Columna sla_deadline agregada');
            }
            
            if (!existingColumns.includes('equipment_type')) {
                await connection.execute(`
                    ALTER TABLE maintenancetasks 
                    ADD COLUMN equipment_type VARCHAR(100)
                `);
                console.log('✅ Columna equipment_type agregada');
            }
        }

        // 2. Crear tabla AssignmentDecisionLog si no existe
        console.log('\n2. Verificando tabla assignmentdecisionlog...');
        const [logTables] = await connection.execute(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'gymtec_erp' 
            AND TABLE_NAME = 'assignmentdecisionlog'
        `);
        
        if (logTables.length === 0) {
            await connection.execute(`
                CREATE TABLE assignmentdecisionlog (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    task_id INT NOT NULL,
                    technician_id INT NOT NULL,
                    assignment_score DECIMAL(5,2) NOT NULL,
                    assignment_reason TEXT,
                    algorithm_version VARCHAR(10) DEFAULT '1.0',
                    decision_factors JSON,
                    alternative_candidates JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    INDEX idx_task_id (task_id),
                    INDEX idx_technician_id (technician_id),
                    INDEX idx_created_at (created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('✅ Tabla assignmentdecisionlog creada');
        } else {
            console.log('✅ Tabla assignmentdecisionlog ya existe');
        }

        // 3. Configurar campos de técnicos en users
        console.log('\n3. Configurando campos para técnicos en users...');
        const [userColumns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'gymtec_erp' 
            AND TABLE_NAME = 'users'
        `);
        
        const existingUserColumns = userColumns.map(col => col.COLUMN_NAME.toLowerCase());
        
        if (!existingUserColumns.includes('max_daily_tasks')) {
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN max_daily_tasks INT DEFAULT 8
            `);
            console.log('✅ Columna max_daily_tasks agregada a users');
        }
        
        if (!existingUserColumns.includes('specialization')) {
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN specialization VARCHAR(255)
            `);
            console.log('✅ Columna specialization agregada a users');
        }
        
        if (!existingUserColumns.includes('location_preference')) {
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN location_preference VARCHAR(255)
            `);
            console.log('✅ Columna location_preference agregada a users');
        }

        // 4. Crear técnicos de ejemplo
        console.log('\n4. Creando técnicos de ejemplo...');
        
        // Verificar si ya existen técnicos
        const [existingTechs] = await connection.execute(`
            SELECT id, username 
            FROM users 
            WHERE role = 'technician'
        `);
        
        if (existingTechs.length === 0) {
            console.log('Creando técnicos de ejemplo...');
            
            const technicians = [
                {
                    username: 'tech_cardio',
                    email: 'cardio@gymtec.com',
                    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
                    role: 'technician',
                    specialization: 'cardio,general',
                    max_daily_tasks: 6,
                    location_preference: '1'
                },
                {
                    username: 'tech_fuerza',
                    email: 'fuerza@gymtec.com',
                    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
                    role: 'technician',
                    specialization: 'fuerza,general',
                    max_daily_tasks: 8,
                    location_preference: '2'
                },
                {
                    username: 'tech_general',
                    email: 'general@gymtec.com',
                    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
                    role: 'technician',
                    specialization: 'general,cardio,fuerza,funcional',
                    max_daily_tasks: 10,
                    location_preference: null
                }
            ];
            
            for (const tech of technicians) {
                await connection.execute(`
                    INSERT INTO users (username, email, password, role, specialization, max_daily_tasks, location_preference)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [tech.username, tech.email, tech.password, tech.role, tech.specialization, tech.max_daily_tasks, tech.location_preference]);
                
                console.log(`✅ Técnico creado: ${tech.username} (especialización: ${tech.specialization})`);
            }
        } else {
            console.log(`✅ Ya existen ${existingTechs.length} técnicos configurados`);
            
            // Actualizar técnicos existentes con especializaciones si no las tienen
            for (const tech of existingTechs) {
                const [techData] = await connection.execute(`
                    SELECT specialization, max_daily_tasks 
                    FROM users 
                    WHERE id = ?
                `, [tech.id]);
                
                if (!techData[0].specialization) {
                    await connection.execute(`
                        UPDATE users 
                        SET specialization = 'general', max_daily_tasks = 8 
                        WHERE id = ?
                    `, [tech.id]);
                    console.log(`✅ Técnico ${tech.username} actualizado con especialización 'general'`);
                }
            }
        }

        // 5. Crear tareas de ejemplo para pruebas
        console.log('\n5. Creando tareas de ejemplo...');
        
        const [existingTasks] = await connection.execute(`
            SELECT COUNT(*) as count FROM maintenancetasks
        `);
        
        if (existingTasks[0].count === 0) {
            const sampleTasks = [
                {
                    title: 'Mantenimiento cinta de correr modelo X1',
                    description: 'Revisión preventiva de cinta de correr, calibración de velocidad y lubricación',
                    priority: 'high',
                    equipment_type: 'cardio',
                    location_id: 1,
                    sla_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
                },
                {
                    title: 'Ajuste de pesas máquina multiestación',
                    description: 'Ajuste de poleas y calibración de pesos en máquina de fuerza',
                    priority: 'medium',
                    equipment_type: 'fuerza',
                    location_id: 1,
                    sla_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 horas
                },
                {
                    title: 'Inspección general equipos funcionales',
                    description: 'Revisión de estado general de equipos de entrenamiento funcional',
                    priority: 'low',
                    equipment_type: 'funcional',
                    location_id: 2,
                    sla_deadline: new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 horas
                }
            ];
            
            for (const task of sampleTasks) {
                await connection.execute(`
                    INSERT INTO maintenancetasks (title, description, priority, equipment_type, location_id, sla_deadline)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [task.title, task.description, task.priority, task.equipment_type, task.location_id, task.sla_deadline]);
                
                console.log(`✅ Tarea creada: ${task.title}`);
            }
        } else {
            console.log(`✅ Ya existen ${existingTasks[0].count} tareas en el sistema`);
        }

        console.log('\n🎉 Migración del sistema de asignación inteligente completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error durante la migración:', error.message);
        console.error('Stack:', error.stack);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Ejecutar migración
migrateIntelligentAssignmentFixed()
    .then(() => {
        console.log('\n✅ Proceso de migración finalizado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Error en migración:', error.message);
        process.exit(1);
    });