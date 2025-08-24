#!/usr/bin/env node

/**
 * Instalador simplificado para Fase 1
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

const DB_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gymtec_erp',
    multipleStatements: true
};

async function runSimpleInstaller() {
    let connection;
    
    try {
        console.log('🔌 Conectando a MySQL...');
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('✅ Conectado exitosamente');

        console.log('📄 Leyendo archivo SQL...');
        const sqlFile = path.join(__dirname, 'database', 'phase1-simple.sql');
        const sqlContent = await fs.readFile(sqlFile, 'utf8');

        console.log('⚡ Ejecutando SQL...');
        await connection.execute(sqlContent);
        console.log('✅ SQL ejecutado exitosamente');

        // Verificar que las tablas se crearon
        console.log('🔍 Verificando instalación...');
        
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

        // Verificar columnas de Tickets
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

        // Verificar datos iniciales
        const [settings] = await connection.execute('SELECT COUNT(*) as count FROM SystemSettings');
        const [templates] = await connection.execute('SELECT COUNT(*) as count FROM ChecklistTemplates');
        
        console.log(`📊 Configuraciones del sistema: ${settings[0].count}`);
        console.log(`📊 Templates de checklist: ${templates[0].count}`);

        console.log('🎉 INSTALACIÓN FASE 1 COMPLETADA EXITOSAMENTE');
        console.log('');
        console.log('🎯 FUNCIONALIDADES IMPLEMENTADAS:');
        console.log('   • Sistema de Contratos y SLA automático');
        console.log('   • Workflow de tickets mejorado');
        console.log('   • Checklist básico implementado');
        console.log('   • Configuraciones del sistema');

    } catch (error) {
        console.error('❌ Error durante la instalación:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔒 Conexión cerrada');
        }
    }
}

runSimpleInstaller();
