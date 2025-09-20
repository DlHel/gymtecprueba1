const mysql = require('mysql2/promise');

async function createMissingTables() {
    console.log('🔄 Creando tablas faltantes de notificaciones...');
    
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gymtec_erp'
        });
        
        console.log('✅ Conectado a MySQL');
        
        // 1. Crear tabla NotificationLogs si no existe
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS \`NotificationLogs\` (
                \`id\` INT(11) NOT NULL AUTO_INCREMENT,
                \`queue_id\` INT(11) DEFAULT NULL COMMENT 'Referencia a la cola original',
                \`template_id\` INT(11),
                
                \`related_entity_type\` ENUM('ticket', 'equipment', 'client', 'user', 'contract') NOT NULL,
                \`related_entity_id\` INT(11) NOT NULL,
                \`ticket_id\` INT(11) DEFAULT NULL,
                
                \`type\` ENUM('email', 'sms', 'push', 'in_app', 'webhook') NOT NULL,
                \`priority\` ENUM('low', 'medium', 'high', 'critical') NOT NULL,
                \`title\` VARCHAR(255) NOT NULL,
                \`message\` TEXT NOT NULL,
                \`recipients\` JSON NOT NULL,
                
                \`status\` ENUM('sent', 'delivered', 'failed', 'bounced') NOT NULL,
                \`sent_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`delivered_at\` TIMESTAMP NULL,
                \`failed_at\` TIMESTAMP NULL,
                \`bounce_reason\` VARCHAR(255) DEFAULT NULL,
                
                \`provider\` VARCHAR(50) COMMENT 'Proveedor usado (SendGrid, AWS SES, etc.)',
                \`provider_message_id\` VARCHAR(255) COMMENT 'ID del mensaje del proveedor',
                \`response_data\` JSON COMMENT 'Respuesta completa del proveedor',
                
                PRIMARY KEY (\`id\`),
                FOREIGN KEY (\`queue_id\`) REFERENCES \`NotificationQueue\` (\`id\`) ON DELETE SET NULL,
                FOREIGN KEY (\`template_id\`) REFERENCES \`NotificationTemplates\` (\`id\`) ON DELETE SET NULL,
                FOREIGN KEY (\`ticket_id\`) REFERENCES \`Tickets\` (\`id\`) ON DELETE CASCADE,
                
                INDEX \`idx_logs_status\` (\`status\`),
                INDEX \`idx_logs_sent\` (\`sent_at\`),
                INDEX \`idx_logs_ticket\` (\`ticket_id\`),
                INDEX \`idx_logs_entity\` (\`related_entity_type\`, \`related_entity_id\`),
                INDEX \`idx_logs_type\` (\`type\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Tabla NotificationLogs creada');
        
        // 2. Crear tabla NotificationEvents
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS \`NotificationEvents\` (
                \`id\` INT(11) NOT NULL AUTO_INCREMENT,
                \`entity_type\` ENUM('ticket', 'equipment', 'client', 'user', 'contract') NOT NULL,
                \`entity_id\` INT(11) NOT NULL,
                \`event_type\` VARCHAR(50) NOT NULL COMMENT 'Tipo de evento que ocurrió',
                \`event_data\` JSON COMMENT 'Datos del evento (cambios, valores anteriores, etc.)',
                \`triggered_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`processed\` BOOLEAN DEFAULT FALSE COMMENT 'Si ya se procesó para notificaciones',
                
                PRIMARY KEY (\`id\`),
                INDEX \`idx_events_entity\` (\`entity_type\`, \`entity_id\`),
                INDEX \`idx_events_type\` (\`event_type\`),
                INDEX \`idx_events_processed\` (\`processed\`),
                INDEX \`idx_events_triggered\` (\`triggered_at\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Tabla NotificationEvents creada');
        
        // 3. Crear tabla UserNotificationPreferences
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS \`UserNotificationPreferences\` (
                \`id\` INT(11) NOT NULL AUTO_INCREMENT,
                \`user_id\` INT(11) NOT NULL,
                \`notification_type\` ENUM(
                    'ticket_created', 
                    'ticket_updated', 
                    'ticket_overdue', 
                    'sla_warning', 
                    'sla_breach',
                    'maintenance_due',
                    'maintenance_overdue',
                    'equipment_warranty_expiring',
                    'status_change',
                    'assignment_change',
                    'priority_escalation'
                ) NOT NULL,
                \`delivery_method\` ENUM('email', 'sms', 'push', 'in_app') NOT NULL,
                \`is_enabled\` BOOLEAN DEFAULT TRUE,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                PRIMARY KEY (\`id\`),
                FOREIGN KEY (\`user_id\`) REFERENCES \`Users\` (\`id\`) ON DELETE CASCADE,
                UNIQUE KEY \`unique_user_notification\` (\`user_id\`, \`notification_type\`, \`delivery_method\`),
                INDEX \`idx_preferences_user\` (\`user_id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Tabla UserNotificationPreferences creada');
        
        // 4. Insertar templates específicos para tickets usando la estructura existente
        await connection.execute(`
            INSERT IGNORE INTO \`NotificationTemplates\` (
                \`name\`, \`type\`, \`trigger_event\`, \`subject_template\`, \`body_template\`, 
                \`recipients_roles\`, \`priority\`, \`is_active\`
            ) VALUES
            ('Nuevo Ticket Creado', 'email', 'ticket_created', 
             'Nuevo Ticket #{ticket_id}: {ticket_title}',
             'Se ha creado un nuevo ticket:\\n\\nID: #{ticket_id}\\nTítulo: {ticket_title}\\nPrioridad: {ticket_priority}\\nCliente: {client_name}\\nEquipo: {equipment_name}\\nDescripción: {ticket_description}\\n\\nAsignado a: {assigned_technician}\\nFecha de vencimiento: {due_date}',
             '["admin", "manager", "technician"]', 'medium', TRUE),
            
            ('Ticket Vencido', 'email', 'ticket_overdue',
             'URGENTE: Ticket #{ticket_id} VENCIDO',
             'El siguiente ticket ha excedido su fecha límite:\\n\\nID: #{ticket_id}\\nTítulo: {ticket_title}\\nCliente: {client_name}\\nFecha límite: {due_date}\\nTiempo excedido: {hours_overdue} horas\\n\\nAcción inmediata requerida.',
             '["admin", "manager"]', 'high', TRUE),
             
            ('Mantenimiento Preventivo Vencido', 'email', 'maintenance_overdue',
             'ATENCIÓN: Mantenimiento Preventivo Vencido - {equipment_name}',
             'El mantenimiento preventivo del siguiente equipo está VENCIDO:\\n\\nEquipo: {equipment_name}\\nUbicación: {location_name}\\nÚltimo mantenimiento: {last_maintenance_date}\\nDías de retraso: {days_overdue}\\nCliente: {client_name}\\n\\nProgramar mantenimiento URGENTE.',
             '["admin", "manager"]', 'high', TRUE),
             
            ('Cambio de Estado', 'email', 'status_change',
             'Ticket #{ticket_id}: Estado cambiado a {new_status}',
             'El estado del ticket ha cambiado:\\n\\nID: #{ticket_id}\\nTítulo: {ticket_title}\\nEstado anterior: {old_status}\\nNuevo estado: {new_status}\\nCambiado por: {changed_by}\\nFecha: {change_date}',
             '["admin", "manager"]', 'medium', TRUE),
             
            ('Asignación de Ticket', 'email', 'assignment_change',
             'Ticket #{ticket_id} asignado: {ticket_title}',
             'Se le ha asignado un nuevo ticket:\\n\\nID: #{ticket_id}\\nTítulo: {ticket_title}\\nPrioridad: {ticket_priority}\\nCliente: {client_name}\\nDescripción: {ticket_description}\\n\\nFecha límite: {due_date}',
             '["technician"]', 'medium', TRUE),
             
            ('Mantenimiento Preventivo Próximo', 'email', 'maintenance_due',
             'Mantenimiento Preventivo: {equipment_name}',
             'Es hora de realizar mantenimiento preventivo al siguiente equipo:\\n\\nEquipo: {equipment_name}\\nUbicación: {location_name}\\nÚltimo mantenimiento: {last_maintenance_date}\\nCliente: {client_name}\\n\\nPor favor, programe el mantenimiento.',
             '["admin", "manager", "technician"]', 'medium', TRUE)
        `);
        console.log('✅ Templates adicionales insertados');
        
        // 5. Verificar estructura final
        const [tables] = await connection.execute(`
            SHOW TABLES LIKE 'Notification%'
        `);
        
        console.log('📊 Todas las tablas de notificaciones:');
        tables.forEach(table => {
            console.log(`   - ${Object.values(table)[0]}`);
        });
        
        // 6. Contar templates
        const [templateCount] = await connection.execute(`
            SELECT COUNT(*) as total FROM NotificationTemplates
        `);
        
        console.log(`🔔 Total de templates: ${templateCount[0].total}`);
        
        await connection.end();
        console.log('🎉 Todas las tablas de notificaciones completadas');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    createMissingTables();
}

module.exports = { createMissingTables };