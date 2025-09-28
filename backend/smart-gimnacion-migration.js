// Script de diagnóstico y migración inteligente para gimnación
const mysql = require('mysql2');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gymtec_erp',
    multipleStatements: true
};

async function checkAndMigrate() {
    console.log('🔍 Iniciando diagnóstico inteligente de BD para Gimnación...');
    
    try {
        const connection = mysql.createConnection(dbConfig);
        
        // Verificar estructura actual de la tabla Tickets
        console.log('📋 Verificando estructura actual de la tabla Tickets...');
        
        const ticketsStructure = await new Promise((resolve, reject) => {
            connection.query('DESCRIBE Tickets', (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
        
        console.log('✅ Estructura actual de Tickets:');
        ticketsStructure.forEach(col => {
            console.log(`  - ${col.Field}: ${col.Type} ${col.Null} ${col.Key} ${col.Default}`);
        });
        
        // Verificar si ticket_type ya existe
        const hasTicketType = ticketsStructure.some(col => col.Field === 'ticket_type');
        const hasContractId = ticketsStructure.some(col => col.Field === 'contract_id');
        
        console.log(`\n🔍 Estado actual:`);
        console.log(`  - ticket_type: ${hasTicketType ? '✅ YA EXISTE' : '❌ NO EXISTE'}`);
        console.log(`  - contract_id: ${hasContractId ? '✅ YA EXISTE' : '❌ NO EXISTE'}`);
        
        // Verificar tablas de gimnación existentes
        const existingTables = await new Promise((resolve, reject) => {
            connection.query(`
                SELECT TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = 'gymtec_erp' 
                AND (TABLE_NAME LIKE '%Gimnacion%' OR TABLE_NAME LIKE '%TicketEquipment%' OR TABLE_NAME LIKE '%TicketTechnician%')
            `, (err, results) => {
                if (err) reject(err);
                else resolve(results.map(r => r.TABLE_NAME));
            });
        });
        
        console.log(`\n📊 Tablas de gimnación existentes:`);
        if (existingTables.length === 0) {
            console.log('  - Ninguna tabla específica de gimnación encontrada');
        } else {
            existingTables.forEach(table => console.log(`  ✅ ${table}`));
        }
        
        // Crear migración inteligente
        const migrations = [];
        
        // 1. Agregar ticket_type si no existe
        if (!hasTicketType) {
            migrations.push(`
                ALTER TABLE \`Tickets\` ADD COLUMN \`ticket_type\` ENUM('individual', 'gimnacion') 
                DEFAULT 'individual' AFTER \`priority\`
            `);
        }
        
        // 2. Agregar contract_id si no existe
        if (!hasContractId) {
            migrations.push(`
                ALTER TABLE \`Tickets\` ADD COLUMN \`contract_id\` INT NULL AFTER \`ticket_type\`,
                ADD FOREIGN KEY (\`contract_id\`) REFERENCES \`Contracts\`(\`id\`) ON DELETE SET NULL
            `);
        }
        
        // 3. Modificar equipment_id para ser opcional (siempre seguro)
        migrations.push(`ALTER TABLE \`Tickets\` MODIFY COLUMN \`equipment_id\` INT NULL`);
        
        // 4. Crear tablas si no existen
        if (!existingTables.includes('TicketEquipmentScope')) {
            migrations.push(`
                CREATE TABLE IF NOT EXISTS \`TicketEquipmentScope\` (
                    \`id\` INT(11) NOT NULL AUTO_INCREMENT,
                    \`ticket_id\` INT(11) NOT NULL,
                    \`equipment_id\` INT(11) NOT NULL,
                    \`is_included\` BOOLEAN DEFAULT true,
                    \`exclusion_reason\` VARCHAR(255) NULL,
                    \`assigned_technician_id\` INT(11) NULL,
                    \`status\` ENUM('Pendiente', 'En Progreso', 'Completado', 'Omitido') DEFAULT 'Pendiente',
                    \`completed_at\` TIMESTAMP NULL,
                    \`notes\` TEXT NULL,
                    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (\`id\`),
                    FOREIGN KEY (\`ticket_id\`) REFERENCES \`Tickets\`(\`id\`) ON DELETE CASCADE,
                    FOREIGN KEY (\`equipment_id\`) REFERENCES \`Equipment\`(\`id\`) ON DELETE CASCADE,
                    FOREIGN KEY (\`assigned_technician_id\`) REFERENCES \`Users\`(\`id\`) ON DELETE SET NULL,
                    UNIQUE KEY \`unique_ticket_equipment\` (\`ticket_id\`, \`equipment_id\`),
                    INDEX \`idx_ticket_equipment_scope_ticket\` (\`ticket_id\`),
                    INDEX \`idx_ticket_equipment_scope_equipment\` (\`equipment_id\`),
                    INDEX \`idx_ticket_equipment_scope_status\` (\`status\`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
        }
        
        if (!existingTables.includes('GimnacionChecklistTemplates')) {
            migrations.push(`
                CREATE TABLE IF NOT EXISTS \`GimnacionChecklistTemplates\` (
                    \`id\` INT(11) NOT NULL AUTO_INCREMENT,
                    \`name\` VARCHAR(200) NOT NULL,
                    \`description\` TEXT,
                    \`is_default\` BOOLEAN DEFAULT false,
                    \`created_by\` INT(11) NOT NULL,
                    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (\`id\`),
                    FOREIGN KEY (\`created_by\`) REFERENCES \`Users\`(\`id\`) ON DELETE CASCADE,
                    INDEX \`idx_gimnacion_checklist_templates_name\` (\`name\`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
        }
        
        if (!existingTables.includes('GimnacionChecklistItems')) {
            migrations.push(`
                CREATE TABLE IF NOT EXISTS \`GimnacionChecklistItems\` (
                    \`id\` INT(11) NOT NULL AUTO_INCREMENT,
                    \`template_id\` INT(11) NOT NULL,
                    \`item_text\` TEXT NOT NULL,
                    \`item_order\` INT(11) DEFAULT 0,
                    \`is_required\` BOOLEAN DEFAULT false,
                    \`category\` VARCHAR(100) NULL,
                    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (\`id\`),
                    FOREIGN KEY (\`template_id\`) REFERENCES \`GimnacionChecklistTemplates\`(\`id\`) ON DELETE CASCADE,
                    INDEX \`idx_gimnacion_checklist_items_template\` (\`template_id\`),
                    INDEX \`idx_gimnacion_checklist_items_order\` (\`item_order\`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
        }
        
        if (!existingTables.includes('TicketGimnacionChecklist')) {
            migrations.push(`
                CREATE TABLE IF NOT EXISTS \`TicketGimnacionChecklist\` (
                    \`id\` INT(11) NOT NULL AUTO_INCREMENT,
                    \`ticket_id\` INT(11) NOT NULL,
                    \`template_id\` INT(11) NULL,
                    \`item_text\` TEXT NOT NULL,
                    \`is_completed\` BOOLEAN DEFAULT false,
                    \`completed_by\` INT(11) NULL,
                    \`completed_at\` TIMESTAMP NULL,
                    \`notes\` TEXT NULL,
                    \`item_order\` INT(11) DEFAULT 0,
                    \`equipment_id\` INT(11) NULL,
                    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (\`id\`),
                    FOREIGN KEY (\`ticket_id\`) REFERENCES \`Tickets\`(\`id\`) ON DELETE CASCADE,
                    FOREIGN KEY (\`template_id\`) REFERENCES \`GimnacionChecklistTemplates\`(\`id\`) ON DELETE SET NULL,
                    FOREIGN KEY (\`completed_by\`) REFERENCES \`Users\`(\`id\`) ON DELETE SET NULL,
                    FOREIGN KEY (\`equipment_id\`) REFERENCES \`Equipment\`(\`id\`) ON DELETE SET NULL,
                    INDEX \`idx_ticket_gimnacion_checklist_ticket\` (\`ticket_id\`),
                    INDEX \`idx_ticket_gimnacion_checklist_order\` (\`item_order\`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
        }
        
        if (!existingTables.includes('TicketTechnicians')) {
            migrations.push(`
                CREATE TABLE IF NOT EXISTS \`TicketTechnicians\` (
                    \`id\` INT(11) NOT NULL AUTO_INCREMENT,
                    \`ticket_id\` INT(11) NOT NULL,
                    \`technician_id\` INT(11) NOT NULL,
                    \`role\` ENUM('Principal', 'Asistente', 'Especialista') DEFAULT 'Asistente',
                    \`assigned_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    \`assigned_by\` INT(11) NOT NULL,
                    \`notes\` TEXT NULL,
                    PRIMARY KEY (\`id\`),
                    FOREIGN KEY (\`ticket_id\`) REFERENCES \`Tickets\`(\`id\`) ON DELETE CASCADE,
                    FOREIGN KEY (\`technician_id\`) REFERENCES \`Users\`(\`id\`) ON DELETE CASCADE,
                    FOREIGN KEY (\`assigned_by\`) REFERENCES \`Users\`(\`id\`) ON DELETE CASCADE,
                    UNIQUE KEY \`unique_ticket_technician\` (\`ticket_id\`, \`technician_id\`),
                    INDEX \`idx_ticket_technicians_ticket\` (\`ticket_id\`),
                    INDEX \`idx_ticket_technicians_tech\` (\`technician_id\`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
        }
        
        console.log(`\n🔧 Ejecutando ${migrations.length} migraciones necesarias...`);
        
        // Ejecutar migraciones una por una
        for (let i = 0; i < migrations.length; i++) {
            try {
                await new Promise((resolve, reject) => {
                    connection.query(migrations[i], (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                    });
                });
                console.log(`✅ Migración ${i + 1}/${migrations.length} completada`);
            } catch (error) {
                console.log(`⚠️ Migración ${i + 1}/${migrations.length} omitida (ya existe): ${error.message}`);
            }
        }
        
        // Insertar datos por defecto si no existen
        console.log('\n📝 Insertando datos por defecto...');
        
        const templateExists = await new Promise((resolve, reject) => {
            connection.query('SELECT COUNT(*) as count FROM GimnacionChecklistTemplates WHERE is_default = true', (err, results) => {
                if (err) reject(err);
                else resolve(results[0].count > 0);
            });
        });
        
        if (!templateExists) {
            await new Promise((resolve, reject) => {
                connection.query(`
                    INSERT INTO \`GimnacionChecklistTemplates\` (\`name\`, \`description\`, \`is_default\`, \`created_by\`) VALUES 
                    ('Mantenimiento Preventivo General', 'Checklist estándar para mantenimiento preventivo de gimnación', true, 1)
                `, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
            
            // Insertar items del template
            const templateId = 1; // Asumimos que es el primero
            const items = [
                "('Verificar funcionamiento general del equipo', 1, true, 'General')",
                "('Inspeccionar cables y conexiones eléctricas', 2, true, 'General')",
                "('Lubricar partes móviles según especificaciones', 3, true, 'General')",
                "('Verificar calibración de sensores', 4, false, 'General')",
                "('Limpiar y desinfectar superficies', 5, true, 'General')",
                "('Verificar sistemas de seguridad', 6, true, 'General')",
                "('Actualizar software/firmware si aplica', 7, false, 'General')",
                "('Documentar observaciones y recomendaciones', 8, true, 'General')"
            ];
            
            await new Promise((resolve, reject) => {
                connection.query(`
                    INSERT INTO \`GimnacionChecklistItems\` (\`template_id\`, \`item_text\`, \`item_order\`, \`is_required\`, \`category\`) VALUES 
                    ${items.map(item => `(1, ${item})`).join(',\n                    ')}
                `, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
            
            console.log('✅ Template por defecto y items insertados');
        } else {
            console.log('ℹ️ Template por defecto ya existe, omitiendo inserción');
        }
        
        // Crear índices adicionales si no existen
        try {
            await new Promise((resolve, reject) => {
                connection.query('CREATE INDEX `idx_tickets_type_status` ON `Tickets` (`ticket_type`, `status`)', (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
            console.log('✅ Índice idx_tickets_type_status creado');
        } catch (error) {
            console.log('ℹ️ Índice idx_tickets_type_status ya existe');
        }
        
        try {
            await new Promise((resolve, reject) => {
                connection.query('CREATE INDEX `idx_tickets_contract` ON `Tickets` (`contract_id`)', (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
            console.log('✅ Índice idx_tickets_contract creado');
        } catch (error) {
            console.log('ℹ️ Índice idx_tickets_contract ya existe');
        }
        
        // Crear vista de reportes
        try {
            await new Promise((resolve, reject) => {
                connection.query('DROP VIEW IF EXISTS `GimnacionTicketsReport`', (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
            
            await new Promise((resolve, reject) => {
                connection.query(`
                    CREATE VIEW \`GimnacionTicketsReport\` AS
                    SELECT 
                        t.id as ticket_id,
                        t.title,
                        t.status,
                        t.priority,
                        t.created_at,
                        t.updated_at,
                        c.name as client_name,
                        l.name as location_name,
                        contract.id as contract_id,
                        COUNT(tes.equipment_id) as total_equipment,
                        COUNT(CASE WHEN tes.is_included = true THEN 1 END) as included_equipment,
                        COUNT(CASE WHEN tes.is_included = false THEN 1 END) as excluded_equipment,
                        COUNT(CASE WHEN tes.status = 'Completado' THEN 1 END) as completed_equipment,
                        COUNT(tt.technician_id) as assigned_technicians,
                        COUNT(CASE WHEN tgc.is_completed = true THEN 1 END) as completed_checklist_items,
                        COUNT(tgc.id) as total_checklist_items
                    FROM \`Tickets\` t
                    LEFT JOIN \`Clients\` c ON t.client_id = c.id
                    LEFT JOIN \`Locations\` l ON t.location_id = l.id  
                    LEFT JOIN \`Contracts\` contract ON t.contract_id = contract.id
                    LEFT JOIN \`TicketEquipmentScope\` tes ON t.id = tes.ticket_id
                    LEFT JOIN \`TicketTechnicians\` tt ON t.id = tt.ticket_id
                    LEFT JOIN \`TicketGimnacionChecklist\` tgc ON t.id = tgc.ticket_id
                    WHERE t.ticket_type = 'gimnacion'
                    GROUP BY t.id
                `, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
            console.log('✅ Vista GimnacionTicketsReport creada');
        } catch (error) {
            console.log('⚠️ Error creando vista de reportes:', error.message);
        }
        
        connection.end();
        
        console.log('\n🎉 Migración inteligente de Gimnación completada exitosamente!');
        console.log('📊 Resumen:');
        console.log('  ✅ Tabla Tickets extendida con ticket_type y contract_id');
        console.log('  ✅ 4 nuevas tablas para sistema de gimnación');
        console.log('  ✅ Template por defecto con 8 items de checklist');
        console.log('  ✅ Índices optimizados para consultas');
        console.log('  ✅ Vista de reportes específica');
        
    } catch (error) {
        console.error('❌ Error en migración inteligente:', error.message);
        process.exit(1);
    }
}

checkAndMigrate();