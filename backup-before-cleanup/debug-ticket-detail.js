const db = require('./src/db-adapter');

console.log('🔍 Verificando tablas relacionadas con tickets...\n');

// Verificar si existen las tablas
const tables = ['TicketPhotos', 'TicketActivities'];

tables.forEach(tableName => {
    db.all(`DESCRIBE ${tableName}`, [], (err, columns) => {
        if (err) {
            console.log(`❌ Tabla ${tableName} NO EXISTE:`, err.message);
        } else {
            console.log(`✅ Tabla ${tableName} SÍ EXISTE:`);
            console.table(columns);
        }
    });
});

// Intentar la consulta exacta que falla
setTimeout(() => {
    console.log('\n🧪 Probando consulta completa del ticket 7...');
    
    const ticketSql = `
        SELECT 
            t.*,
            c.name as client_name,
            c.legal_name as client_legal_name,
            c.rut as client_rut,
            c.address as client_address,
            c.phone as client_phone,
            c.email as client_email,
            l.name as location_name,
            l.address as location_address,
            l.phone as location_phone,
            e.name as equipment_name,
            e.custom_id as equipment_custom_id,
            e.serial_number as equipment_serial,
            e.acquisition_date as equipment_installation,
            em.name as equipment_model_name,
            em.category as equipment_category,
            em.brand as equipment_brand,
            u.username as assigned_to_name
        FROM Tickets t
        LEFT JOIN Clients c ON t.client_id = c.id
        LEFT JOIN Locations l ON t.location_id = l.id
        LEFT JOIN Equipment e ON t.equipment_id = e.id
        LEFT JOIN EquipmentModels em ON e.model_id = em.id
        LEFT JOIN Users u ON t.assigned_technician_id = u.id
        WHERE t.id = ?
    `;
    
    db.get(ticketSql, [7], (err, ticket) => {
        if (err) {
            console.error('❌ Error en consulta principal:', err.message);
        } else {
            console.log('✅ Consulta principal exitosa:', ticket?.title || 'null');
            
            // Probar consulta de fotos
            db.all('SELECT * FROM TicketPhotos WHERE ticket_id = ?', [7], (err, photos) => {
                if (err) {
                    console.error('❌ Error consultando TicketPhotos:', err.message);
                } else {
                    console.log(`✅ TicketPhotos: ${photos.length} fotos encontradas`);
                    
                    // Probar consulta de actividades
                    db.all('SELECT * FROM TicketActivities WHERE ticket_id = ?', [7], (err, activities) => {
                        if (err) {
                            console.error('❌ Error consultando TicketActivities:', err.message);
                        } else {
                            console.log(`✅ TicketActivities: ${activities.length} actividades encontradas`);
                        }
                        process.exit(0);
                    });
                }
            });
        }
    });
}, 1000);
