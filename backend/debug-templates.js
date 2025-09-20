const mysql = require('mysql2/promise');

async function debugTemplatesAndData() {
    console.log('🔍 DEBUG - Templates y Datos');
    console.log('=' .repeat(50));
    
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'gymtec_erp'
    });
    
    // 1. Ver templates
    console.log('\n📋 TEMPLATES DE NOTIFICACIÓN:');
    const [templates] = await connection.execute('SELECT * FROM NotificationTemplates WHERE is_active = TRUE');
    templates.forEach(template => {
        console.log(`\n${template.name} (${template.trigger_event}):`);
        console.log(`  Subject: ${template.subject_template}`);
        console.log(`  Body: ${template.body_template}`);
        console.log(`  Recipients: ${template.recipients_roles}`);
    });
    
    // 2. Ver datos del último ticket
    console.log('\n\n📊 DATOS DEL ÚLTIMO TICKET:');
    const [ticketData] = await connection.execute(`
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
        ORDER BY t.id DESC LIMIT 1
    `);
    
    if (ticketData.length > 0) {
        console.log('Datos disponibles:');
        Object.keys(ticketData[0]).forEach(key => {
            console.log(`  ${key}: ${ticketData[0][key]}`);
        });
    }
    
    // 3. Ver notificaciones generadas
    console.log('\n\n📬 NOTIFICACIONES EN COLA:');
    const [notifications] = await connection.execute(`
        SELECT nq.*, nt.subject_template, nt.body_template
        FROM NotificationQueue nq
        JOIN NotificationTemplates nt ON nq.template_id = nt.id
        ORDER BY nq.created_at DESC LIMIT 5
    `);
    
    notifications.forEach(notif => {
        console.log(`\nTemplate: ${notif.subject_template}`);
        console.log(`Resultado: ${notif.subject}`);
        console.log(`Context: ${notif.context_data ? JSON.stringify(JSON.parse(notif.context_data), null, 2) : 'N/A'}`);
    });
    
    await connection.end();
}

debugTemplatesAndData();