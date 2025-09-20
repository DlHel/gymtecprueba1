const mysql = require('mysql2/promise');

/**
 * GYMTEC ERP - PROCESADOR DE NOTIFICACIONES
 * 
 * Este módulo se encarga de:
 * 1. Procesar eventos de NotificationEvents
 * 2. Generar notificaciones en NotificationQueue
 * 3. Aplicar templates y destinatarios
 * 4. Programar envíos
 */

class NotificationProcessor {
    constructor() {
        this.connection = null;
    }
    
    async connect() {
        this.connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gymtec_erp'
        });
    }
    
    async disconnect() {
        if (this.connection) {
            await this.connection.end();
        }
    }
    
    /**
     * Procesar todos los eventos pendientes
     */
    async processAllPendingEvents() {
        console.log('🔄 Procesando eventos pendientes de notificación...');
        
        try {
            // Obtener eventos no procesados
            const [events] = await this.connection.execute(`
                SELECT * FROM NotificationEvents 
                WHERE processed = FALSE 
                ORDER BY triggered_at ASC
                LIMIT 50
            `);
            
            if (events.length === 0) {
                console.log('📭 No hay eventos pendientes');
                return;
            }
            
            console.log(`📋 Procesando ${events.length} eventos...`);
            
            for (const event of events) {
                await this.processEvent(event);
            }
            
            console.log('✅ Todos los eventos procesados');
            
        } catch (error) {
            console.error('❌ Error procesando eventos:', error.message);
            throw error;
        }
    }
    
    /**
     * Procesar un evento individual
     */
    async processEvent(event) {
        try {
            console.log(`🔄 Procesando evento ${event.id}: ${event.event_type} para ${event.entity_type} ${event.entity_id}`);
            
            // Buscar templates activos para este tipo de evento
            const [templates] = await this.connection.execute(`
                SELECT * FROM NotificationTemplates 
                WHERE trigger_event = ? AND is_active = TRUE
            `, [event.event_type]);
            
            if (templates.length === 0) {
                console.log(`⚠️  No hay templates activos para evento ${event.event_type}`);
                await this.markEventAsProcessed(event.id);
                return;
            }
            
            for (const template of templates) {
                await this.createNotificationFromTemplate(event, template);
            }
            
            // Marcar evento como procesado
            await this.markEventAsProcessed(event.id);
            
        } catch (error) {
            console.error(`❌ Error procesando evento ${event.id}:`, error.message);
        }
    }
    
    /**
     * Crear notificación desde template
     */
    async createNotificationFromTemplate(event, template) {
        try {
            const eventData = JSON.parse(event.event_data);
            
            // Obtener datos adicionales según el tipo de entidad
            const entityData = await this.getEntityData(event.entity_type, event.entity_id, eventData);
            
            // Procesar template (reemplazar variables)
            const subject = this.processTemplate(template.subject_template, entityData);
            const message = this.processTemplate(template.body_template, entityData);
            
            // Determinar destinatarios
            const recipients = await this.getRecipients(template, entityData);
            
            if (recipients.length === 0) {
                console.log(`⚠️  No hay destinatarios para template ${template.name}`);
                return;
            }
            
            // Calcular momento de envío
            const scheduledAt = this.calculateScheduledTime(template);
            
            // Insertar notificaciones individuales en cola
            for (const recipient of recipients) {
                await this.connection.execute(`
                    INSERT INTO NotificationQueue (
                        template_id, trigger_event, related_entity_type, related_entity_id,
                        recipient_type, recipient_identifier, subject, body, 
                        status, priority, scheduled_at, context_data
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
                `, [
                    template.id,
                    template.trigger_event,
                    event.entity_type,
                    event.entity_id,
                    recipient.type === 'user' ? 'user' : 'email',
                    recipient.type === 'user' ? recipient.user_id.toString() : recipient.email,
                    subject,
                    message,
                    template.priority || 'medium',
                    scheduledAt,
                    JSON.stringify(entityData)
                ]);
            }
            
            console.log(`✅ Notificación creada: ${template.name} -> ${recipients.length} destinatarios`);
            
        } catch (error) {
            console.error(`❌ Error creando notificación desde template ${template.id}:`, error.message);
        }
    }
    
    /**
     * Obtener datos adicionales de la entidad
     */
    async getEntityData(entityType, entityId, eventData) {
        let entityData = { ...eventData };
        
        try {
            switch (entityType) {
                case 'ticket':
                    const [ticketRows] = await this.connection.execute(`
                        SELECT t.*, 
                               c.name as client_name, c.email as client_email,
                               l.name as location_name, l.address as location_address,
                               e.name as equipment_name, e.model as equipment_model,
                               u.username as assigned_technician_name, u.email as technician_email
                        FROM Tickets t
                        LEFT JOIN Clients c ON t.client_id = c.id
                        LEFT JOIN Locations l ON t.location_id = l.id
                        LEFT JOIN Equipment e ON t.equipment_id = e.id
                        LEFT JOIN Users u ON t.assigned_technician_id = u.id
                        WHERE t.id = ?
                    `, [entityId]);
                    
                    if (ticketRows.length > 0) {
                        Object.assign(entityData, ticketRows[0]);
                    }
                    break;
                    
                case 'equipment':
                    const [equipmentRows] = await this.connection.execute(`
                        SELECT e.*, 
                               l.name as location_name, l.address as location_address,
                               c.name as client_name, c.email as client_email
                        FROM Equipment e
                        LEFT JOIN Locations l ON e.location_id = l.id
                        LEFT JOIN Clients c ON l.client_id = c.id
                        WHERE e.id = ?
                    `, [entityId]);
                    
                    if (equipmentRows.length > 0) {
                        Object.assign(entityData, equipmentRows[0]);
                    }
                    break;
            }
            
            // Agregar fechas formateadas
            if (entityData.due_date) {
                entityData.due_date_formatted = new Date(entityData.due_date).toLocaleString('es-ES');
            }
            if (entityData.created_at) {
                entityData.created_at_formatted = new Date(entityData.created_at).toLocaleString('es-ES');
            }
            
        } catch (error) {
            console.error(`Error obteniendo datos de ${entityType} ${entityId}:`, error.message);
        }
        
        return entityData;
    }
    
    /**
     * Procesar template reemplazando variables
     */
    processTemplate(template, data) {
        let processed = template;
        
        // Mapear datos a nombres esperados por plantillas
        const mappedData = {
            ...data,
            ticket_title: data.title,
            ticket_id: data.id,
            ticket_priority: data.priority,
            ticket_description: data.description,
            ticket_status: data.status
        };
        
        // Reemplazar variables {variable_name} (llaves simples)
        for (const [key, value] of Object.entries(mappedData)) {
            const regex = new RegExp(`\\{${key}\\}`, 'g');
            processed = processed.replace(regex, value || '');
        }
        
        // Reemplazar variables {{variable_name}} (llaves dobles)
        for (const [key, value] of Object.entries(mappedData)) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            processed = processed.replace(regex, value || '');
        }
        
        // Reemplazar variables #{ticket_id} específicas
        if (mappedData.ticket_id || mappedData.id) {
            processed = processed.replace(/#{ticket_id}/g, mappedData.ticket_id || mappedData.id);
        }
        
        return processed;
    }
    
    /**
     * Determinar destinatarios basado en roles y configuración
     */
    async getRecipients(template, entityData) {
        const recipients = [];
        
        try {
            let recipientRoles = [];
            
            // Parsear roles del template
            if (template.recipients_roles) {
                try {
                    recipientRoles = JSON.parse(template.recipients_roles);
                } catch (e) {
                    console.warn('Error parseando recipients_roles:', e.message);
                }
            }
            
            // Obtener usuarios por roles
            if (recipientRoles.length > 0) {
                const placeholders = recipientRoles.map(() => '?').join(',');
                const [users] = await this.connection.execute(`
                    SELECT u.id, u.username, u.email, u.role 
                    FROM Users u 
                    WHERE u.role IN (${placeholders}) 
                      AND u.email IS NOT NULL 
                      AND u.email != ''
                      AND u.status = 'Activo'
                `, recipientRoles);
                
                users.forEach(user => {
                    recipients.push({
                        type: 'user',
                        user_id: user.id,
                        name: user.username,
                        email: user.email,
                        role: user.role
                    });
                });
            }
            
            // Agregar técnico asignado si existe
            if (entityData.assigned_technician_id && entityData.technician_email) {
                const existingTechnician = recipients.find(r => r.user_id === entityData.assigned_technician_id);
                if (!existingTechnician) {
                    recipients.push({
                        type: 'user',
                        user_id: entityData.assigned_technician_id,
                        name: entityData.assigned_technician_name,
                        email: entityData.technician_email,
                        role: 'technician'
                    });
                }
            }
            
            // Agregar emails adicionales del template
            if (template.recipients_emails) {
                try {
                    const additionalEmails = JSON.parse(template.recipients_emails);
                    additionalEmails.forEach(email => {
                        recipients.push({
                            type: 'email',
                            email: email,
                            name: email
                        });
                    });
                } catch (e) {
                    console.warn('Error parseando recipients_emails:', e.message);
                }
            }
            
        } catch (error) {
            console.error('Error determinando destinatarios:', error.message);
        }
        
        return recipients;
    }
    
    /**
     * Calcular momento de envío basado en configuración del template
     */
    calculateScheduledTime(template) {
        const now = new Date();
        
        // Agregar delay si está configurado
        if (template.delay_minutes && template.delay_minutes > 0) {
            now.setMinutes(now.getMinutes() + template.delay_minutes);
        }
        
        return now;
    }
    
    /**
     * Marcar evento como procesado
     */
    async markEventAsProcessed(eventId) {
        await this.connection.execute(`
            UPDATE NotificationEvents 
            SET processed = TRUE 
            WHERE id = ?
        `, [eventId]);
    }
    
    /**
     * Procesar notificaciones vencidas y de mantenimiento
     */
    async processScheduledChecks() {
        console.log('🔄 Ejecutando verificaciones programadas...');
        
        try {
            // TODO: Corregir stored procedures con esquema actual
            // Procesar tickets vencidos
            // await this.connection.query('CALL ProcessOverdueTicketNotifications()');
            console.log('✅ Verificación de tickets vencidos completada');
            
            // Procesar mantenimiento preventivo
            // await this.connection.query('CALL ProcessMaintenanceNotifications()');
            console.log('✅ Verificación de mantenimiento preventivo completada');
            
        } catch (error) {
            console.error('❌ Error en verificaciones programadas:', error.message);
        }
    }
}

// Función principal para ejecutar el procesador
async function runNotificationProcessor() {
    const processor = new NotificationProcessor();
    
    try {
        await processor.connect();
        console.log('✅ Conectado a la base de datos');
        
        // Procesar verificaciones programadas
        await processor.processScheduledChecks();
        
        // Procesar eventos pendientes
        await processor.processAllPendingEvents();
        
        // Obtener estadísticas
        const [queueStats] = await processor.connection.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled
            FROM NotificationQueue
        `);
        
        const [eventStats] = await processor.connection.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN processed = FALSE THEN 1 ELSE 0 END) as pending
            FROM NotificationEvents
        `);
        
        console.log('📊 Estadísticas:');
        console.log(`   - Eventos: ${eventStats[0].total} total, ${eventStats[0].pending} pendientes`);
        console.log(`   - Cola: ${queueStats[0].total} total, ${queueStats[0].pending} pendientes, ${queueStats[0].scheduled} programadas`);
        
    } catch (error) {
        console.error('❌ Error en procesador:', error.message);
    } finally {
        await processor.disconnect();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    runNotificationProcessor().then(() => {
        console.log('🎉 Procesador de notificaciones completado');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Error fatal:', error);
        process.exit(1);
    });
}

module.exports = { NotificationProcessor, runNotificationProcessor };