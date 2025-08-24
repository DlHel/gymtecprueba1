#!/usr/bin/env node

/**
 * GYMTEC ERP - Fase 1 Core Business Enhancement Installer
 * 
 * Este script instala las mejoras extraídas del documento LAMP:
 * - Sistema de Contratos y SLA
 * - Workflow de Tickets con Guardias de Estado  
 * - Checklist Obligatorio por Tipo de Ticket
 * - Sistema de Auditoría Completo
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Configuración de la base de datos
const DB_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gymtec_erp',
    multipleStatements: true
};

class Phase1Installer {
    constructor() {
        this.connection = null;
        this.logMessages = [];
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        console.log(logMessage);
        this.logMessages.push(logMessage);
    }

    async connect() {
        try {
            this.connection = await mysql.createConnection(DB_CONFIG);
            this.log('✅ Conexión a MySQL establecida correctamente');
            return true;
        } catch (error) {
            this.log(`❌ Error de conexión: ${error.message}`);
            return false;
        }
    }

    async executeSQLFile(filePath) {
        try {
            const sqlContent = await fs.readFile(filePath, 'utf8');
            this.log(`📄 Ejecutando archivo SQL: ${path.basename(filePath)}`);
            
            // Dividir en statements individuales y ejecutar uno por uno
            const statements = sqlContent.split(';').filter(stmt => stmt.trim());
            
            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i].trim();
                if (statement && !statement.startsWith('--') && statement !== '') {
                    try {
                        await this.connection.execute(statement);
                        this.log(`  ✅ Statement ${i + 1}/${statements.length} ejecutado`);
                    } catch (error) {
                        if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
                            this.log(`  ⚠️  Statement ${i + 1} - ya existe: ${error.message}`);
                        } else {
                            this.log(`  ❌ Error en statement ${i + 1}: ${error.message}`);
                            throw error;
                        }
                    }
                }
            }
            
            this.log(`✅ Archivo SQL completado: ${path.basename(filePath)}`);
            return true;
        } catch (error) {
            this.log(`❌ Error ejecutando ${filePath}: ${error.message}`);
            return false;
        }
    }

    async verifyInstallation() {
        this.log('🔍 Verificando instalación...');
        
        const tables = [
            'Contracts',
            'ChecklistTemplates', 
            'ChecklistTemplateItems',
            'TicketChecklist',
            'TicketChecklistItems',
            'AuditLog',
            'SystemSettings'
        ];

        const verificationResults = {};

        for (const table of tables) {
            try {
                const [rows] = await this.connection.execute(
                    `SELECT COUNT(*) as count FROM information_schema.tables 
                     WHERE table_schema = 'gymtec_erp' AND table_name = ?`,
                    [table]
                );
                
                const exists = rows[0].count > 0;
                verificationResults[table] = exists;
                
                if (exists) {
                    this.log(`  ✅ Tabla ${table} existe`);
                } else {
                    this.log(`  ❌ Tabla ${table} NO existe`);
                }
            } catch (error) {
                this.log(`  ❌ Error verificando tabla ${table}: ${error.message}`);
                verificationResults[table] = false;
            }
        }

        return verificationResults;
    }

    async verifyTicketsColumns() {
        this.log('🔍 Verificando nuevas columnas en tabla Tickets...');
        
        const expectedColumns = [
            'ticket_type',
            'sla_deadline', 
            'sla_status',
            'workflow_stage',
            'checklist_completed',
            'can_close',
            'contract_id'
        ];

        try {
            const [columns] = await this.connection.execute(
                `SELECT COLUMN_NAME FROM information_schema.columns 
                 WHERE table_schema = 'gymtec_erp' AND table_name = 'Tickets'`
            );
            
            const existingColumns = columns.map(col => col.COLUMN_NAME);
            
            for (const column of expectedColumns) {
                if (existingColumns.includes(column)) {
                    this.log(`  ✅ Columna Tickets.${column} existe`);
                } else {
                    this.log(`  ❌ Columna Tickets.${column} NO existe`);
                }
            }
        } catch (error) {
            this.log(`❌ Error verificando columnas: ${error.message}`);
        }
    }

    async countInitialData() {
        this.log('📊 Verificando datos iniciales...');
        
        try {
            // Verificar configuraciones del sistema
            const [settings] = await this.connection.execute(
                'SELECT COUNT(*) as count FROM SystemSettings'
            );
            this.log(`  📋 Configuraciones del sistema: ${settings[0].count}`);

            // Verificar templates de checklist
            const [templates] = await this.connection.execute(
                'SELECT COUNT(*) as count FROM ChecklistTemplates'
            );
            this.log(`  📋 Templates de checklist: ${templates[0].count}`);

            // Verificar items de checklist
            const [items] = await this.connection.execute(
                'SELECT COUNT(*) as count FROM ChecklistTemplateItems'
            );
            this.log(`  📋 Items de checklist: ${items[0].count}`);

        } catch (error) {
            this.log(`❌ Error contando datos iniciales: ${error.message}`);
        }
    }

    async install() {
        this.log('🚀 INICIANDO INSTALACIÓN FASE 1 - CORE BUSINESS');
        this.log('================================================');
        
        // 1. Conectar a la base de datos
        if (!(await this.connect())) {
            return false;
        }

        // 2. Ejecutar script de mejoras
        const sqlFilePath = path.join(__dirname, 'database', 'phase1-enhancements.sql');
        if (!(await this.executeSQLFile(sqlFilePath))) {
            return false;
        }

        // 3. Verificar instalación
        const verificationResults = await this.verifyInstallation();
        await this.verifyTicketsColumns();
        await this.countInitialData();

        // 4. Resumen final
        this.log('================================================');
        this.log('📋 RESUMEN DE INSTALACIÓN:');
        
        const allTablesExist = Object.values(verificationResults).every(exists => exists);
        
        if (allTablesExist) {
            this.log('✅ INSTALACIÓN COMPLETADA EXITOSAMENTE');
            this.log('');
            this.log('🎯 FUNCIONALIDADES IMPLEMENTADAS:');
            this.log('   • Sistema de Contratos y SLA automático');
            this.log('   • Workflow de tickets con guardias de estado');
            this.log('   • Checklist obligatorio por tipo de ticket');
            this.log('   • Sistema de auditoría completo');
            this.log('   • Configuraciones centralizadas del sistema');
            this.log('');
            this.log('📋 PRÓXIMOS PASOS:');
            this.log('   1. Actualizar APIs del backend');
            this.log('   2. Implementar triggers de auditoría');
            this.log('   3. Crear interfaz de checklist en frontend');
            this.log('   4. Configurar sistema de notificaciones SLA');
        } else {
            this.log('❌ INSTALACIÓN INCOMPLETA - Algunas tablas no se crearon');
        }

        // 5. Guardar log de instalación
        await this.saveInstallationLog();

        return allTablesExist;
    }

    async saveInstallationLog() {
        try {
            const logContent = this.logMessages.join('\n');
            const logPath = path.join(__dirname, '..', 'logs', `phase1-install-${Date.now()}.log`);
            
            // Crear directorio de logs si no existe
            const logsDir = path.dirname(logPath);
            await fs.mkdir(logsDir, { recursive: true });
            
            await fs.writeFile(logPath, logContent);
            this.log(`📝 Log guardado en: ${logPath}`);
        } catch (error) {
            this.log(`⚠️  No se pudo guardar el log: ${error.message}`);
        }
    }

    async close() {
        if (this.connection) {
            await this.connection.end();
            this.log('🔒 Conexión cerrada');
        }
    }
}

// Ejecutar instalación si se llama directamente
if (require.main === module) {
    (async () => {
        const installer = new Phase1Installer();
        
        try {
            const success = await installer.install();
            process.exit(success ? 0 : 1);
        } catch (error) {
            console.error('💥 Error crítico durante la instalación:', error);
            process.exit(1);
        } finally {
            await installer.close();
        }
    })();
}

module.exports = Phase1Installer;
