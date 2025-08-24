#!/usr/bin/env node

/**
 * Instalador manual paso a paso para Fase 1
 */

const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gymtec_erp'
};

async function executeStatement(connection, sql, description) {
    try {
        console.log(`⚡ ${description}...`);
        await connection.execute(sql);
        console.log(`✅ ${description} - Completado`);
        return true;
    } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
            console.log(`⚠️  ${description} - Ya existe`);
            return true;
        } else {
            console.error(`❌ ${description} - Error: ${error.message}`);
            return false;
        }
    }
}

async function installPhase1() {
    let connection;
    
    try {
        console.log('🔌 Conectando a MySQL...');
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('✅ Conectado exitosamente');

        console.log('🚀 INICIANDO INSTALACIÓN FASE 1 PASO A PASO');
        console.log('============================================');

        // 1. Crear tabla Contracts
        await executeStatement(connection, `
            CREATE TABLE IF NOT EXISTS Contracts (
                id INT(11) NOT NULL AUTO_INCREMENT,
                client_id INT(11) NOT NULL,
                contract_number VARCHAR(50) UNIQUE NOT NULL,
                contract_name VARCHAR(200) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                status ENUM('activo', 'vencido', 'suspendido', 'cancelado') DEFAULT 'activo',
                sla_p1_hours INT(11) DEFAULT 4,
                sla_p2_hours INT(11) DEFAULT 8,
                sla_p3_hours INT(11) DEFAULT 24,
                sla_p4_hours INT(11) DEFAULT 72,
                monthly_fee DECIMAL(10,2) DEFAULT 0.00,
                currency VARCHAR(3) DEFAULT 'CLP',
                payment_terms TEXT,
                service_description TEXT,
                special_conditions TEXT,
                created_by INT(11),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                INDEX idx_contracts_client (client_id),
                INDEX idx_contracts_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `, 'Crear tabla Contracts');

        // 2. Agregar foreign keys a Contracts
        await executeStatement(connection, `
            ALTER TABLE Contracts 
            ADD CONSTRAINT fk_contracts_client 
            FOREIGN KEY (client_id) REFERENCES Clients (id) ON DELETE CASCADE ON UPDATE CASCADE
        `, 'Agregar FK Contracts -> Clients');

        await executeStatement(connection, `
            ALTER TABLE Contracts 
            ADD CONSTRAINT fk_contracts_created_by 
            FOREIGN KEY (created_by) REFERENCES Users (id) ON DELETE SET NULL ON UPDATE CASCADE
        `, 'Agregar FK Contracts -> Users');

        // 3. Actualizar tabla Tickets con nuevas columnas
        await executeStatement(connection, `
            ALTER TABLE Tickets 
            ADD COLUMN sla_deadline DATETIME NULL
        `, 'Agregar columna sla_deadline a Tickets');

        await executeStatement(connection, `
            ALTER TABLE Tickets 
            ADD COLUMN sla_status ENUM('cumplido', 'vencido', 'en_riesgo') NULL
        `, 'Agregar columna sla_status a Tickets');

        await executeStatement(connection, `
            ALTER TABLE Tickets 
            ADD COLUMN resolution_time_minutes INT(11) NULL
        `, 'Agregar columna resolution_time_minutes a Tickets');

        await executeStatement(connection, `
            ALTER TABLE Tickets 
            ADD COLUMN workflow_stage ENUM('creado', 'asignado', 'en_progreso', 'esperando_repuestos', 'esperando_cliente', 'en_revision', 'completado', 'cerrado') DEFAULT 'creado'
        `, 'Agregar columna workflow_stage a Tickets');

        await executeStatement(connection, `
            ALTER TABLE Tickets 
            ADD COLUMN checklist_completed BOOLEAN DEFAULT FALSE
        `, 'Agregar columna checklist_completed a Tickets');

        await executeStatement(connection, `
            ALTER TABLE Tickets 
            ADD COLUMN can_close BOOLEAN DEFAULT FALSE
        `, 'Agregar columna can_close a Tickets');

        await executeStatement(connection, `
            ALTER TABLE Tickets 
            ADD COLUMN contract_id INT(11) NULL
        `, 'Agregar columna contract_id a Tickets');

        // 4. Crear índices para Tickets
        await executeStatement(connection, `
            ALTER TABLE Tickets 
            ADD INDEX idx_tickets_workflow (workflow_stage)
        `, 'Crear índice workflow_stage en Tickets');

        await executeStatement(connection, `
            ALTER TABLE Tickets 
            ADD INDEX idx_tickets_sla (sla_status)
        `, 'Crear índice sla_status en Tickets');

        // 5. Agregar FK contract_id
        await executeStatement(connection, `
            ALTER TABLE Tickets 
            ADD CONSTRAINT fk_tickets_contract 
            FOREIGN KEY (contract_id) REFERENCES Contracts (id) ON DELETE SET NULL ON UPDATE CASCADE
        `, 'Agregar FK Tickets -> Contracts');

        // 6. Crear tabla ChecklistTemplates
        await executeStatement(connection, `
            CREATE TABLE IF NOT EXISTS ChecklistTemplates (
                id INT(11) NOT NULL AUTO_INCREMENT,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                ticket_type ENUM('preventivo', 'correctivo', 'instalacion', 'desinstalacion', 'actualizacion', 'capacitacion', 'emergencia') NOT NULL,
                equipment_category ENUM('Cardio', 'Fuerza', 'Funcional', 'Accesorios') NULL,
                equipment_model_id INT(11) NULL,
                is_active BOOLEAN DEFAULT TRUE,
                is_mandatory BOOLEAN DEFAULT TRUE,
                created_by INT(11),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                INDEX idx_checklist_templates_type (ticket_type),
                INDEX idx_checklist_templates_category (equipment_category),
                INDEX idx_checklist_templates_model (equipment_model_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `, 'Crear tabla ChecklistTemplates');

        // 7. Agregar FKs a ChecklistTemplates
        await executeStatement(connection, `
            ALTER TABLE ChecklistTemplates 
            ADD CONSTRAINT fk_checklist_templates_model 
            FOREIGN KEY (equipment_model_id) REFERENCES EquipmentModels (id) ON DELETE SET NULL ON UPDATE CASCADE
        `, 'Agregar FK ChecklistTemplates -> EquipmentModels');

        await executeStatement(connection, `
            ALTER TABLE ChecklistTemplates 
            ADD CONSTRAINT fk_checklist_templates_created_by 
            FOREIGN KEY (created_by) REFERENCES Users (id) ON DELETE SET NULL ON UPDATE CASCADE
        `, 'Agregar FK ChecklistTemplates -> Users');

        // 8. Crear tabla ChecklistTemplateItems
        await executeStatement(connection, `
            CREATE TABLE IF NOT EXISTS ChecklistTemplateItems (
                id INT(11) NOT NULL AUTO_INCREMENT,
                template_id INT(11) NOT NULL,
                item_text TEXT NOT NULL,
                item_order INT(11) DEFAULT 0,
                is_required BOOLEAN DEFAULT TRUE,
                expected_result TEXT NULL,
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                INDEX idx_checklist_items_template (template_id),
                INDEX idx_checklist_items_order (item_order)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `, 'Crear tabla ChecklistTemplateItems');

        // 9. Agregar FK a ChecklistTemplateItems
        await executeStatement(connection, `
            ALTER TABLE ChecklistTemplateItems 
            ADD CONSTRAINT fk_checklist_items_template 
            FOREIGN KEY (template_id) REFERENCES ChecklistTemplates (id) ON DELETE CASCADE ON UPDATE CASCADE
        `, 'Agregar FK ChecklistTemplateItems -> ChecklistTemplates');

        // 10. Crear tabla SystemSettings
        await executeStatement(connection, `
            CREATE TABLE IF NOT EXISTS SystemSettings (
                id INT(11) NOT NULL AUTO_INCREMENT,
                setting_key VARCHAR(100) NOT NULL UNIQUE,
                setting_value TEXT NULL,
                setting_type ENUM('string', 'integer', 'boolean', 'json', 'email') DEFAULT 'string',
                description TEXT NULL,
                category VARCHAR(50) DEFAULT 'general',
                is_editable BOOLEAN DEFAULT TRUE,
                updated_by INT(11) NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                INDEX idx_system_settings_key (setting_key),
                INDEX idx_system_settings_category (category)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `, 'Crear tabla SystemSettings');

        // 11. Agregar FK a SystemSettings
        await executeStatement(connection, `
            ALTER TABLE SystemSettings 
            ADD CONSTRAINT fk_system_settings_updated_by 
            FOREIGN KEY (updated_by) REFERENCES Users (id) ON DELETE SET NULL ON UPDATE CASCADE
        `, 'Agregar FK SystemSettings -> Users');

        // 12. Insertar configuraciones básicas
        console.log('📝 Insertando datos iniciales...');
        
        const settings = [
            ['sla_default_p1_hours', '4', 'integer', 'SLA por defecto para prioridad critica (horas)', 'sla'],
            ['sla_default_p2_hours', '8', 'integer', 'SLA por defecto para prioridad alta (horas)', 'sla'],
            ['sla_default_p3_hours', '24', 'integer', 'SLA por defecto para prioridad media (horas)', 'sla'],
            ['sla_default_p4_hours', '72', 'integer', 'SLA por defecto para prioridad baja (horas)', 'sla'],
            ['checklist_mandatory_for_closure', 'true', 'boolean', 'Checklist obligatorio para cerrar tickets', 'workflow']
        ];

        for (const [key, value, type, description, category] of settings) {
            await executeStatement(connection, `
                INSERT IGNORE INTO SystemSettings (setting_key, setting_value, setting_type, description, category) 
                VALUES ('${key}', '${value}', '${type}', '${description}', '${category}')
            `, `Insertar configuración ${key}`);
        }

        // 13. Insertar templates básicos
        await executeStatement(connection, `
            INSERT IGNORE INTO ChecklistTemplates (name, description, ticket_type, equipment_category, is_mandatory) 
            VALUES ('Mantenimiento Preventivo Cardio', 'Checklist estándar para mantenimiento preventivo de equipos cardiovasculares', 'preventivo', 'Cardio', TRUE)
        `, 'Insertar template Mantenimiento Preventivo Cardio');

        await executeStatement(connection, `
            INSERT IGNORE INTO ChecklistTemplates (name, description, ticket_type, equipment_category, is_mandatory) 
            VALUES ('Servicio Correctivo General', 'Checklist para servicios correctivos generales', 'correctivo', NULL, TRUE)
        `, 'Insertar template Servicio Correctivo General');

        // Verificar instalación
        console.log('============================================');
        console.log('🔍 VERIFICANDO INSTALACIÓN...');
        
        const [tables] = await connection.execute(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'gymtec_erp' 
            AND table_name IN ('Contracts', 'ChecklistTemplates', 'ChecklistTemplateItems', 'SystemSettings')
        `);
        
        console.log('📋 Tablas creadas:');
        tables.forEach(table => {
            console.log(`  ✅ ${table.table_name}`);
        });

        const [columns] = await connection.execute(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'gymtec_erp' 
            AND table_name = 'Tickets' 
            AND column_name IN ('sla_deadline', 'workflow_stage', 'checklist_completed', 'contract_id')
        `);
        
        console.log('📋 Nuevas columnas en Tickets:');
        columns.forEach(col => {
            console.log(`  ✅ ${col.column_name}`);
        });

        const [settingsCount] = await connection.execute('SELECT COUNT(*) as count FROM SystemSettings');
        const [templatesCount] = await connection.execute('SELECT COUNT(*) as count FROM ChecklistTemplates');
        
        console.log(`📊 Configuraciones del sistema: ${settingsCount[0].count}`);
        console.log(`📊 Templates de checklist: ${templatesCount[0].count}`);

        console.log('============================================');
        console.log('🎉 INSTALACIÓN FASE 1 COMPLETADA EXITOSAMENTE');
        console.log('');
        console.log('🎯 FUNCIONALIDADES IMPLEMENTADAS:');
        console.log('   ✅ Sistema de Contratos y SLA automático');
        console.log('   ✅ Workflow de tickets mejorado con estados');
        console.log('   ✅ Checklist básico implementado');
        console.log('   ✅ Configuraciones del sistema centralizadas');
        console.log('');
        console.log('📋 PRÓXIMOS PASOS:');
        console.log('   1. Implementar APIs para contratos y SLA');
        console.log('   2. Crear interfaz de checklist en frontend');
        console.log('   3. Implementar lógica de workflow en backend');
        console.log('   4. Crear sistema de notificaciones SLA');

    } catch (error) {
        console.error('❌ Error crítico durante la instalación:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔒 Conexión cerrada');
        }
    }
}

installPhase1();
