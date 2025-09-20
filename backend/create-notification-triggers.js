const mysql = require('mysql2/promise');

async function createNotificationTriggers() {
    console.log('🔄 Creando triggers automáticos para notificaciones...');
    
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gymtec_erp'
        });
        
        console.log('✅ Conectado a MySQL');
        
        // 1. TRIGGER AFTER INSERT - Cuando se crea un nuevo ticket
        await connection.query(`
            DROP TRIGGER IF EXISTS ticket_created_notification
        `);
        
        await connection.query(`
            CREATE TRIGGER ticket_created_notification
            AFTER INSERT ON Tickets
            FOR EACH ROW
            BEGIN
                -- Insertar evento de creación de ticket
                INSERT INTO NotificationEvents (
                    entity_type, entity_id, event_type, event_data, triggered_at, processed
                ) VALUES (
                    'ticket', 
                    NEW.id, 
                    'ticket_created',
                    JSON_OBJECT(
                        'ticket_id', NEW.id,
                        'title', NEW.title,
                        'status', NEW.status,
                        'priority', NEW.priority,
                        'client_id', NEW.client_id,
                        'location_id', NEW.location_id,
                        'equipment_id', NEW.equipment_id,
                        'assigned_technician_id', NEW.assigned_technician_id,
                        'due_date', NEW.due_date,
                        'created_at', NEW.created_at
                    ),
                    NOW(),
                    FALSE
                );
                
                -- Si el ticket tiene un técnico asignado, generar notificación de asignación
                IF NEW.assigned_technician_id IS NOT NULL THEN
                    INSERT INTO NotificationEvents (
                        entity_type, entity_id, event_type, event_data, triggered_at, processed
                    ) VALUES (
                        'ticket', 
                        NEW.id, 
                        'assignment_change',
                        JSON_OBJECT(
                            'ticket_id', NEW.id,
                            'title', NEW.title,
                            'assigned_to', NEW.assigned_technician_id,
                            'previous_assigned_to', NULL
                        ),
                        NOW(),
                        FALSE
                    );
                END IF;
            END
        `);
        console.log('✅ Trigger ticket_created_notification creado');
        
        // 2. TRIGGER AFTER UPDATE - Cuando se actualiza un ticket
        await connection.query(`
            DROP TRIGGER IF EXISTS ticket_updated_notification
        `);
        
        await connection.query(`
            CREATE TRIGGER ticket_updated_notification
            AFTER UPDATE ON Tickets
            FOR EACH ROW
            BEGIN
                -- Detectar cambio de estado
                IF NEW.status != OLD.status THEN
                    INSERT INTO NotificationEvents (
                        entity_type, entity_id, event_type, event_data, triggered_at, processed
                    ) VALUES (
                        'ticket', 
                        NEW.id, 
                        'status_change',
                        JSON_OBJECT(
                            'ticket_id', NEW.id,
                            'title', NEW.title,
                            'old_status', OLD.status,
                            'new_status', NEW.status,
                            'changed_by', USER(),
                            'change_date', NOW()
                        ),
                        NOW(),
                        FALSE
                    );
                END IF;
                
                -- Detectar cambio de asignación
                IF NEW.assigned_technician_id != OLD.assigned_technician_id THEN
                    INSERT INTO NotificationEvents (
                        entity_type, entity_id, event_type, event_data, triggered_at, processed
                    ) VALUES (
                        'ticket', 
                        NEW.id, 
                        'assignment_change',
                        JSON_OBJECT(
                            'ticket_id', NEW.id,
                            'title', NEW.title,
                            'old_assigned_to', OLD.assigned_technician_id,
                            'new_assigned_to', NEW.assigned_technician_id,
                            'changed_by', USER(),
                            'change_date', NOW()
                        ),
                        NOW(),
                        FALSE
                    );
                END IF;
                
                -- Detectar escalamiento de prioridad
                IF NEW.priority != OLD.priority THEN
                    -- Solo notificar si la prioridad aumenta
                    IF (OLD.priority = 'Baja' AND NEW.priority IN ('Media', 'Alta', 'Urgente')) OR
                       (OLD.priority = 'Media' AND NEW.priority IN ('Alta', 'Urgente')) OR
                       (OLD.priority = 'Alta' AND NEW.priority = 'Urgente') THEN
                        INSERT INTO NotificationEvents (
                            entity_type, entity_id, event_type, event_data, triggered_at, processed
                        ) VALUES (
                            'ticket', 
                            NEW.id, 
                            'priority_escalation',
                            JSON_OBJECT(
                                'ticket_id', NEW.id,
                                'title', NEW.title,
                                'old_priority', OLD.priority,
                                'new_priority', NEW.priority,
                                'escalated_by', USER(),
                                'escalation_date', NOW()
                            ),
                            NOW(),
                            FALSE
                        );
                    END IF;
                END IF;
                
                -- Insertar evento general de actualización
                INSERT INTO NotificationEvents (
                    entity_type, entity_id, event_type, event_data, triggered_at, processed
                ) VALUES (
                    'ticket', 
                    NEW.id, 
                    'ticket_updated',
                    JSON_OBJECT(
                        'ticket_id', NEW.id,
                        'title', NEW.title,
                        'status', NEW.status,
                        'priority', NEW.priority,
                        'updated_at', NEW.updated_at
                    ),
                    NOW(),
                    FALSE
                );
            END
        `);
        console.log('✅ Trigger ticket_updated_notification creado');
        
        // 3. Crear función para procesar notificaciones vencidas (stored procedure)
        await connection.query(`
            DROP PROCEDURE IF EXISTS ProcessOverdueTicketNotifications
        `);
        
        await connection.query(`
            CREATE PROCEDURE ProcessOverdueTicketNotifications()
            BEGIN
                DECLARE done INT DEFAULT FALSE;
                DECLARE ticket_id INT;
                DECLARE ticket_title VARCHAR(300);
                DECLARE ticket_due_date DATETIME;
                DECLARE hours_overdue INT;
                
                -- Cursor para tickets vencidos
                DECLARE ticket_cursor CURSOR FOR
                    SELECT t.id, t.title, t.due_date,
                           TIMESTAMPDIFF(HOUR, t.due_date, NOW()) as hours_over
                    FROM Tickets t
                    WHERE t.status NOT IN ('Resuelto', 'Cerrado')
                      AND t.due_date IS NOT NULL
                      AND t.due_date < NOW()
                      AND NOT EXISTS (
                          SELECT 1 FROM NotificationEvents ne
                          WHERE ne.entity_type = 'ticket' 
                            AND ne.entity_id = t.id 
                            AND ne.event_type = 'ticket_overdue'
                            AND DATE(ne.triggered_at) = DATE(NOW())
                      );
                
                DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
                
                OPEN ticket_cursor;
                
                read_loop: LOOP
                    FETCH ticket_cursor INTO ticket_id, ticket_title, ticket_due_date, hours_overdue;
                    IF done THEN
                        LEAVE read_loop;
                    END IF;
                    
                    -- Insertar evento de ticket vencido
                    INSERT INTO NotificationEvents (
                        entity_type, entity_id, event_type, event_data, triggered_at, processed
                    ) VALUES (
                        'ticket', 
                        ticket_id, 
                        'ticket_overdue',
                        JSON_OBJECT(
                            'ticket_id', ticket_id,
                            'title', ticket_title,
                            'due_date', ticket_due_date,
                            'hours_overdue', hours_overdue
                        ),
                        NOW(),
                        FALSE
                    );
                END LOOP;
                
                CLOSE ticket_cursor;
            END
        `);
        console.log('✅ Stored procedure ProcessOverdueTicketNotifications creado');
        
        // 4. Crear función para procesar notificaciones de mantenimiento preventivo
        await connection.query(`
            DROP PROCEDURE IF EXISTS ProcessMaintenanceNotifications
        `);
        
        await connection.query(`
            CREATE PROCEDURE ProcessMaintenanceNotifications()
            BEGIN
                DECLARE done INT DEFAULT FALSE;
                DECLARE equipment_id INT;
                DECLARE equipment_name VARCHAR(255);
                DECLARE last_maintenance DATE;
                DECLARE days_since_maintenance INT;
                
                -- Cursor para equipos que necesitan mantenimiento
                DECLARE maintenance_cursor CURSOR FOR
                    SELECT e.id, e.name, e.last_maintenance_date,
                           DATEDIFF(NOW(), COALESCE(e.last_maintenance_date, e.created_at)) as days_since
                    FROM Equipment e
                    WHERE e.activo = 1
                      AND DATEDIFF(NOW(), COALESCE(e.last_maintenance_date, e.created_at)) >= 90
                      AND NOT EXISTS (
                          SELECT 1 FROM NotificationEvents ne
                          WHERE ne.entity_type = 'equipment' 
                            AND ne.entity_id = e.id 
                            AND ne.event_type IN ('maintenance_due', 'maintenance_overdue')
                            AND DATE(ne.triggered_at) = DATE(NOW())
                      );
                
                DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
                
                OPEN maintenance_cursor;
                
                read_loop: LOOP
                    FETCH maintenance_cursor INTO equipment_id, equipment_name, last_maintenance, days_since_maintenance;
                    IF done THEN
                        LEAVE read_loop;
                    END IF;
                    
                    -- Determinar si es debido o vencido
                    IF days_since_maintenance >= 120 THEN
                        -- Mantenimiento vencido
                        INSERT INTO NotificationEvents (
                            entity_type, entity_id, event_type, event_data, triggered_at, processed
                        ) VALUES (
                            'equipment', 
                            equipment_id, 
                            'maintenance_overdue',
                            JSON_OBJECT(
                                'equipment_id', equipment_id,
                                'equipment_name', equipment_name,
                                'last_maintenance_date', last_maintenance,
                                'days_overdue', days_since_maintenance - 90
                            ),
                            NOW(),
                            FALSE
                        );
                    ELSE
                        -- Mantenimiento debido
                        INSERT INTO NotificationEvents (
                            entity_type, entity_id, event_type, event_data, triggered_at, processed
                        ) VALUES (
                            'equipment', 
                            equipment_id, 
                            'maintenance_due',
                            JSON_OBJECT(
                                'equipment_id', equipment_id,
                                'equipment_name', equipment_name,
                                'last_maintenance_date', last_maintenance,
                                'days_since_maintenance', days_since_maintenance
                            ),
                            NOW(),
                            FALSE
                        );
                    END IF;
                END LOOP;
                
                CLOSE maintenance_cursor;
            END
        `);
        console.log('✅ Stored procedure ProcessMaintenanceNotifications creado');
        
        // 5. Verificar triggers creados
        const [triggers] = await connection.execute(`
            SHOW TRIGGERS WHERE \`Table\` = 'Tickets'
        `);
        
        console.log('🔧 Triggers creados para tabla Tickets:');
        triggers.forEach(trigger => {
            console.log(`   - ${trigger.Trigger} (${trigger.Event} ${trigger.Timing})`);
        });
        
        // 6. Verificar procedures creados
        const [procedures] = await connection.execute(`
            SHOW PROCEDURE STATUS WHERE Db = 'gymtec_erp' AND Name LIKE '%Notification%'
        `);
        
        console.log('⚙️  Stored procedures de notificaciones:');
        procedures.forEach(proc => {
            console.log(`   - ${proc.Name}`);
        });
        
        await connection.end();
        console.log('🎉 Triggers y procedures de notificaciones creados exitosamente');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('📍 Stack:', error.stack);
        process.exit(1);
    }
}

if (require.main === module) {
    createNotificationTriggers();
}

module.exports = { createNotificationTriggers };