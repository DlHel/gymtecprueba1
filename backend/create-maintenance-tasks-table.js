/**
 * GYMTEC ERP - Crear Tabla MaintenanceTasks
 * Script para crear la tabla de tareas de mantenimiento del planificador
 */

const db = require('./src/db-adapter');

const createMaintenanceTasksTable = () => {
    console.log('🏗️ Creando tabla MaintenanceTasks...');

    const sql = `
        CREATE TABLE IF NOT EXISTS MaintenanceTasks (
            id INT PRIMARY KEY AUTO_INCREMENT,
            title VARCHAR(255) NOT NULL COMMENT 'Título de la tarea',
            description TEXT COMMENT 'Descripción detallada de la tarea',
            type ENUM('maintenance', 'inspection', 'repair', 'cleaning') NOT NULL DEFAULT 'maintenance' COMMENT 'Tipo de tarea',
            status ENUM('pending', 'in_progress', 'completed', 'cancelled', 'scheduled') NOT NULL DEFAULT 'pending' COMMENT 'Estado de la tarea',
            priority ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium' COMMENT 'Prioridad de la tarea',
            
            -- Relaciones
            equipment_id INT COMMENT 'ID del equipo asociado',
            technician_id INT COMMENT 'ID del técnico asignado',
            client_id INT COMMENT 'ID del cliente propietario del equipo',
            location_id INT COMMENT 'ID de la ubicación',
            ticket_id INT COMMENT 'ID del ticket relacionado (opcional)',
            
            -- Programación
            scheduled_date DATE NOT NULL COMMENT 'Fecha programada',
            scheduled_time TIME COMMENT 'Hora programada (opcional)',
            estimated_duration INT COMMENT 'Duración estimada en minutos',
            
            -- Tracking
            started_at TIMESTAMP NULL COMMENT 'Fecha/hora de inicio real',
            completed_at TIMESTAMP NULL COMMENT 'Fecha/hora de finalización',
            actual_duration INT COMMENT 'Duración real en minutos',
            
            -- Información adicional
            notes TEXT COMMENT 'Notas adicionales',
            checklist_template_id INT COMMENT 'ID de plantilla de checklist',
            is_preventive BOOLEAN DEFAULT FALSE COMMENT 'Es mantenimiento preventivo',
            recurrence_pattern VARCHAR(100) COMMENT 'Patrón de recurrencia (CRON-like)',
            next_occurrence DATE COMMENT 'Próxima ocurrencia si es recurrente',
            
            -- Auditoría
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_by INT COMMENT 'ID del usuario que creó la tarea',
            
            -- Índices y claves foráneas
            INDEX idx_scheduled_date (scheduled_date),
            INDEX idx_technician_id (technician_id),
            INDEX idx_equipment_id (equipment_id),
            INDEX idx_status (status),
            INDEX idx_type (type),
            INDEX idx_client_id (client_id),
            
            FOREIGN KEY (equipment_id) REFERENCES Equipment(id) ON DELETE SET NULL,
            FOREIGN KEY (technician_id) REFERENCES Users(id) ON DELETE SET NULL,
            FOREIGN KEY (client_id) REFERENCES Clients(id) ON DELETE SET NULL,
            FOREIGN KEY (location_id) REFERENCES Locations(id) ON DELETE SET NULL,
            FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE SET NULL,
            FOREIGN KEY (created_by) REFERENCES Users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
        COMMENT='Tabla de tareas de mantenimiento programadas y ejecutadas';
    `;

    db.run(sql, [], function(err) {
        if (err) {
            console.error('❌ Error creando tabla MaintenanceTasks:', err.message);
            return;
        }
        
        console.log('✅ Tabla MaintenanceTasks creada exitosamente');
        
        // Crear tabla relacionada para recurrencias
        createRecurrenceTable();
    });
};

const createRecurrenceTable = () => {
    console.log('🔄 Creando tabla MaintenanceRecurrence...');

    const sql = `
        CREATE TABLE IF NOT EXISTS MaintenanceRecurrence (
            id INT PRIMARY KEY AUTO_INCREMENT,
            task_id INT NOT NULL COMMENT 'ID de la tarea padre',
            recurrence_type ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom') NOT NULL COMMENT 'Tipo de recurrencia',
            interval_value INT DEFAULT 1 COMMENT 'Intervalo (ej: cada 2 semanas)',
            days_of_week SET('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') COMMENT 'Días de la semana',
            day_of_month INT COMMENT 'Día del mes (1-31)',
            month_of_year INT COMMENT 'Mes del año (1-12)',
            cron_expression VARCHAR(100) COMMENT 'Expresión CRON personalizada',
            
            start_date DATE NOT NULL COMMENT 'Fecha de inicio de recurrencia',
            end_date DATE COMMENT 'Fecha de fin (opcional)',
            max_occurrences INT COMMENT 'Máximo número de ocurrencias',
            current_occurrences INT DEFAULT 0 COMMENT 'Ocurrencias actuales',
            
            is_active BOOLEAN DEFAULT TRUE COMMENT 'Recurrencia activa',
            last_generated TIMESTAMP NULL COMMENT 'Última vez que se generó una tarea',
            next_due DATE COMMENT 'Próxima fecha programada',
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            FOREIGN KEY (task_id) REFERENCES MaintenanceTasks(id) ON DELETE CASCADE,
            INDEX idx_next_due (next_due),
            INDEX idx_is_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
        COMMENT='Configuración de recurrencia para tareas de mantenimiento';
    `;

    db.run(sql, [], function(err) {
        if (err) {
            console.error('❌ Error creando tabla MaintenanceRecurrence:', err.message);
            return;
        }
        
        console.log('✅ Tabla MaintenanceRecurrence creada exitosamente');
        
        // Insertar datos de prueba
        insertSampleData();
    });
};

const insertSampleData = () => {
    console.log('📊 Insertando datos de prueba...');

    // Primero obtener IDs de equipos existentes
    db.all('SELECT id, name FROM Equipment LIMIT 5', [], (err, equipmentRows) => {
        if (err) {
            console.error('❌ Error obteniendo equipos:', err.message);
            return;
        }

        // Obtener técnicos
        db.all("SELECT id, username FROM Users WHERE role = 'technician' OR role = 'admin' LIMIT 3", [], (err, technicianRows) => {
            if (err) {
                console.error('❌ Error obteniendo técnicos:', err.message);
                return;
            }

            if (equipmentRows.length === 0) {
                console.log('⚠️ No hay equipos en la BD. Creando datos básicos...');
                insertBasicTestData();
                return;
            }

            const tasks = [
                {
                    title: 'Mantenimiento Preventivo Cinta',
                    description: 'Revisión mensual completa de cinta de correr',
                    type: 'maintenance',
                    equipment_id: equipmentRows[0]?.id,
                    technician_id: technicianRows[0]?.id,
                    scheduled_date: '2025-09-22',
                    scheduled_time: '09:00:00',
                    estimated_duration: 120,
                    is_preventive: true,
                    notes: 'Revisar tensión de banda, lubricación y calibración'
                },
                {
                    title: 'Inspección Semanal Equipos Cardio',
                    description: 'Inspección de seguridad semanal',
                    type: 'inspection',
                    equipment_id: equipmentRows[1]?.id,
                    technician_id: technicianRows[1]?.id || technicianRows[0]?.id,
                    scheduled_date: '2025-09-21',
                    scheduled_time: '14:00:00',
                    estimated_duration: 60,
                    notes: 'Verificar estado general y funcionalidad'
                },
                {
                    title: 'Reparación Bicicleta Estática',
                    description: 'Solucionar problema en pedales reportado',
                    type: 'repair',
                    equipment_id: equipmentRows[2]?.id,
                    technician_id: technicianRows[0]?.id,
                    scheduled_date: '2025-09-25',
                    scheduled_time: '10:30:00',
                    estimated_duration: 90,
                    priority: 'high',
                    notes: 'Cliente reporta ruido extraño en pedales'
                },
                {
                    title: 'Limpieza Profunda Equipos',
                    description: 'Limpieza y desinfección completa',
                    type: 'cleaning',
                    scheduled_date: '2025-09-23',
                    scheduled_time: '16:00:00',
                    estimated_duration: 180,
                    is_preventive: true,
                    notes: 'Limpieza semanal programada'
                }
            ];

            let insertedCount = 0;
            tasks.forEach((task, index) => {
                const sql = `
                    INSERT INTO MaintenanceTasks 
                    (title, description, type, equipment_id, technician_id, scheduled_date, 
                     scheduled_time, estimated_duration, priority, is_preventive, notes, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
                `;

                const values = [
                    task.title,
                    task.description,
                    task.type,
                    task.equipment_id,
                    task.technician_id,
                    task.scheduled_date,
                    task.scheduled_time,
                    task.estimated_duration,
                    task.priority || 'medium',
                    task.is_preventive || false,
                    task.notes
                ];

                db.run(sql, values, function(err) {
                    if (err) {
                        console.error(`❌ Error insertando tarea ${index + 1}:`, err.message);
                    } else {
                        console.log(`✅ Tarea creada: ${task.title} (ID: ${this.lastID})`);
                    }
                    
                    insertedCount++;
                    if (insertedCount === tasks.length) {
                        console.log('🎉 Datos de prueba insertados completamente');
                        process.exit(0);
                    }
                });
            });
        });
    });
};

const insertBasicTestData = () => {
    console.log('🔧 Creando datos básicos de prueba...');
    
    const tasks = [
        {
            title: 'Mantenimiento General',
            description: 'Mantenimiento preventivo general',
            type: 'maintenance',
            scheduled_date: '2025-09-22',
            scheduled_time: '09:00:00'
        },
        {
            title: 'Inspección de Seguridad',
            description: 'Inspección de seguridad semanal',
            type: 'inspection',
            scheduled_date: '2025-09-21',
            scheduled_time: '14:00:00'
        }
    ];

    let insertedCount = 0;
    tasks.forEach((task, index) => {
        const sql = `
            INSERT INTO MaintenanceTasks 
            (title, description, type, scheduled_date, scheduled_time, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
        `;

        db.run(sql, [task.title, task.description, task.type, task.scheduled_date, task.scheduled_time], function(err) {
            if (err) {
                console.error(`❌ Error insertando tarea básica ${index + 1}:`, err.message);
            } else {
                console.log(`✅ Tarea básica creada: ${task.title}`);
            }
            
            insertedCount++;
            if (insertedCount === tasks.length) {
                console.log('🎉 Datos básicos insertados');
                process.exit(0);
            }
        });
    });
};

// Ejecutar script
console.log('🚀 Iniciando creación de tablas del planificador...');
createMaintenanceTasksTable();