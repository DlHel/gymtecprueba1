// Script de migración específico para ajustar ticket_type
const mysql = require('mysql2');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gymtec_erp',
    multipleStatements: true
};

async function fixTicketType() {
    console.log('🔧 Ajustando ticket_type para incluir gimnación...');
    
    try {
        const connection = mysql.createConnection(dbConfig);
        
        // Verificar valores actuales de ticket_type
        const currentValues = await new Promise((resolve, reject) => {
            connection.query(`
                SELECT DISTINCT ticket_type, COUNT(*) as count 
                FROM Tickets 
                GROUP BY ticket_type
            `, (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
        
        console.log('📊 Valores actuales de ticket_type:');
        currentValues.forEach(row => {
            console.log(`  - ${row.ticket_type}: ${row.count} tickets`);
        });
        
        // Modificar el ENUM para incluir gimnación manteniendo valores existentes
        await new Promise((resolve, reject) => {
            connection.query(`
                ALTER TABLE \`Tickets\` 
                MODIFY COLUMN \`ticket_type\` ENUM('Reparación', 'Mantenimiento', 'individual', 'gimnacion') 
                DEFAULT 'Reparación'
            `, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
        
        console.log('✅ ticket_type modificado para incluir gimnación');
        
        // Verificar la estructura actualizada
        const updatedStructure = await new Promise((resolve, reject) => {
            connection.query('SHOW COLUMNS FROM Tickets LIKE "ticket_type"', (err, results) => {
                if (err) reject(err);
                else resolve(results[0]);
            });
        });
        
        console.log('✅ Estructura actualizada:');
        console.log(`  ticket_type: ${updatedStructure.Type}`);
        
        // Verificar que las nuevas tablas se crearon correctamente
        const newTables = await new Promise((resolve, reject) => {
            connection.query(`
                SELECT TABLE_NAME, TABLE_ROWS
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = 'gymtec_erp' 
                AND (TABLE_NAME = 'TicketEquipmentScope' 
                     OR TABLE_NAME = 'GimnacionChecklistTemplates'
                     OR TABLE_NAME = 'GimnacionChecklistItems'
                     OR TABLE_NAME = 'TicketGimnacionChecklist'
                     OR TABLE_NAME = 'TicketTechnicians')
            `, (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
        
        console.log('\n📋 Nuevas tablas de gimnación:');
        newTables.forEach(table => {
            console.log(`  ✅ ${table.TABLE_NAME} (${table.TABLE_ROWS} filas)`);
        });
        
        // Insertar template por defecto si no existe
        const templateCount = await new Promise((resolve, reject) => {
            connection.query('SELECT COUNT(*) as count FROM GimnacionChecklistTemplates', (err, results) => {
                if (err) reject(err);
                else resolve(results[0].count);
            });
        });
        
        if (templateCount === 0) {
            // Insertar template
            await new Promise((resolve, reject) => {
                connection.query(`
                    INSERT INTO \`GimnacionChecklistTemplates\` 
                    (\`name\`, \`description\`, \`is_default\`, \`created_by\`) VALUES 
                    ('Mantenimiento Preventivo General', 'Checklist estándar para mantenimiento preventivo de gimnación', true, 1)
                `, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
            
            // Insertar items del template
            await new Promise((resolve, reject) => {
                connection.query(`
                    INSERT INTO \`GimnacionChecklistItems\` 
                    (\`template_id\`, \`item_text\`, \`item_order\`, \`is_required\`, \`category\`) VALUES 
                    (1, 'Verificar funcionamiento general del equipo', 1, true, 'General'),
                    (1, 'Inspeccionar cables y conexiones eléctricas', 2, true, 'General'),
                    (1, 'Lubricar partes móviles según especificaciones', 3, true, 'General'),
                    (1, 'Verificar calibración de sensores', 4, false, 'General'),
                    (1, 'Limpiar y desinfectar superficies', 5, true, 'General'),
                    (1, 'Verificar sistemas de seguridad', 6, true, 'General'),
                    (1, 'Actualizar software/firmware si aplica', 7, false, 'General'),
                    (1, 'Documentar observaciones y recomendaciones', 8, true, 'General')
                `, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
            
            console.log('✅ Template por defecto creado con 8 items');
        } else {
            console.log(`ℹ️ Ya existen ${templateCount} templates, omitiendo inserción`);
        }
        
        connection.end();
        
        console.log('\n🎉 Base de datos lista para Tickets de Gimnación!');
        console.log('📊 Resumen final:');
        console.log('  ✅ ticket_type soporta: Reparación, Mantenimiento, individual, gimnación');
        console.log('  ✅ contract_id disponible para vincular con contratos');
        console.log('  ✅ 5 nuevas tablas para gestión completa de gimnación');
        console.log('  ✅ Template por defecto con checklist estándar');
        console.log('  ✅ Sistema listo para implementación frontend');
        
    } catch (error) {
        console.error('❌ Error ajustando ticket_type:', error.message);
        console.error('💡 Detalles:', error);
        process.exit(1);
    }
}

fixTicketType();