/**
 * Script para migrar la tabla Tickets y agregar columnas SLA
 * Ejecutar: node migrate-sla-support.js
 */

const fs = require('fs');
const path = require('path');

// Cargar configuración de base de datos
require('dotenv').config({ path: './config.env' });

const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp',
    port: process.env.DB_PORT || 3306
};

async function runMigration() {
    let connection;
    
    try {
        console.log('🔄 Conectando a MySQL...');
        connection = await mysql.createConnection(dbConfig);
        
        console.log('✅ Conexión establecida');
        
        // Verificar si la tabla Tickets existe
        const [tablesResult] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Tickets'
        `, [dbConfig.database]);
        
        if (tablesResult[0].count === 0) {
            console.log('❌ La tabla Tickets no existe. Ejecutar primero el schema principal.');
            return;
        }
        
        console.log('✅ Tabla Tickets encontrada');
        
        // Verificar estructura actual
        console.log('\n📋 Estructura actual de Tickets:');
        const [columns] = await connection.execute(`DESCRIBE Tickets`);
        console.table(columns.map(col => ({
            Field: col.Field,
            Type: col.Type,
            Null: col.Null,
            Key: col.Key,
            Default: col.Default
        })));
        
        // Verificar qué columnas SLA ya existen
        const slaColumns = ['contract_id', 'sla_deadline', 'sla_status', 'workflow_stage'];
        const existingColumns = columns.map(col => col.Field);
        
        console.log('\n🔍 Verificando columnas SLA...');
        for (const column of slaColumns) {
            const exists = existingColumns.includes(column);
            console.log(`   ${column}: ${exists ? '✅ Existe' : '❌ No existe'}`);
        }
        
        // Ejecutar migraciones
        console.log('\n🚀 Ejecutando migraciones...');
        
        // Agregar contract_id
        if (!existingColumns.includes('contract_id')) {
            console.log('   Agregando contract_id...');
            await connection.execute(`
                ALTER TABLE Tickets 
                ADD COLUMN contract_id INT(11) NULL
            `);
            console.log('   ✅ contract_id agregado');
        }
        
        // Agregar sla_deadline
        if (!existingColumns.includes('sla_deadline')) {
            console.log('   Agregando sla_deadline...');
            await connection.execute(`
                ALTER TABLE Tickets 
                ADD COLUMN sla_deadline DATETIME NULL
            `);
            console.log('   ✅ sla_deadline agregado');
        }
        
        // Agregar sla_status
        if (!existingColumns.includes('sla_status')) {
            console.log('   Agregando sla_status...');
            await connection.execute(`
                ALTER TABLE Tickets 
                ADD COLUMN sla_status ENUM('cumplido', 'en_riesgo', 'vencido') NULL DEFAULT NULL
            `);
            console.log('   ✅ sla_status agregado');
        }
        
        // Agregar workflow_stage
        if (!existingColumns.includes('workflow_stage')) {
            console.log('   Agregando workflow_stage...');
            await connection.execute(`
                ALTER TABLE Tickets 
                ADD COLUMN workflow_stage ENUM('pendiente', 'en_progreso', 'completado', 'cerrado') NULL DEFAULT 'pendiente'
            `);
            console.log('   ✅ workflow_stage agregado');
        }
        
        // Agregar índices (MySQL ignora si ya existen)
        console.log('\n🔗 Agregando índices...');
        try {
            await connection.execute(`ALTER TABLE Tickets ADD INDEX idx_tickets_sla_deadline (sla_deadline)`);
            console.log('   ✅ Índice sla_deadline agregado');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('   ℹ️  Índice sla_deadline ya existe');
            } else {
                console.log('   ⚠️  Error agregando índice sla_deadline:', error.message);
            }
        }
        
        try {
            await connection.execute(`ALTER TABLE Tickets ADD INDEX idx_tickets_sla_status (sla_status)`);
            console.log('   ✅ Índice sla_status agregado');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('   ℹ️  Índice sla_status ya existe');
            } else {
                console.log('   ⚠️  Error agregando índice sla_status:', error.message);
            }
        }
        
        try {
            await connection.execute(`ALTER TABLE Tickets ADD INDEX idx_tickets_contract (contract_id)`);
            console.log('   ✅ Índice contract_id agregado');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('   ℹ️  Índice contract_id ya existe');
            } else {
                console.log('   ⚠️  Error agregando índice contract_id:', error.message);
            }
        }
        
        try {
            await connection.execute(`ALTER TABLE Tickets ADD INDEX idx_tickets_workflow (workflow_stage)`);
            console.log('   ✅ Índice workflow_stage agregado');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('   ℹ️  Índice workflow_stage ya existe');
            } else {
                console.log('   ⚠️  Error agregando índice workflow_stage:', error.message);
            }
        }
        
        // Verificar estructura final
        console.log('\n📋 Estructura final de Tickets:');
        const [finalColumns] = await connection.execute(`DESCRIBE Tickets`);
        console.table(finalColumns.map(col => ({
            Field: col.Field,
            Type: col.Type,
            Null: col.Null,
            Key: col.Key,
            Default: col.Default
        })));
        
        console.log('\n🎉 Migración SLA completada exitosamente!');
        console.log('\n📌 Próximos pasos:');
        console.log('   1. Verificar que la tabla Contracts exista y tenga datos');
        console.log('   2. Probar los endpoints de contratos y SLA');
        console.log('   3. Verificar el frontend de contratos');
        
    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        console.error('   Código de error:', error.code);
        console.error('   SQL State:', error.sqlState);
        console.error('   Stack:', error.stack);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Conexión cerrada');
        }
    }
}

// Ejecutar migración
if (require.main === module) {
    runMigration().catch(console.error);
}

module.exports = { runMigration };