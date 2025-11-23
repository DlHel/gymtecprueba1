/**
 * Script para ejecutar la migración de aprobación de períodos
 */
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
require('dotenv').config({ path: '../config.env' });

async function runMigration() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gymtec_erp',
        multipleStatements: true
    });

    try {
        console.log('🔄 Ejecutando migración de aprobación de períodos...');
        
        const sql = await fs.readFile('./database/migrations/add-payroll-approval-fields.sql', 'utf8');
        
        // Ejecutar cada statement por separado para evitar errores de sintaxis de MySQL
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));
        
        for (const statement of statements) {
            try {
                await connection.query(statement);
                console.log('✅', statement.substring(0, 60) + '...');
            } catch (err) {
                // Ignorar errores de "columna ya existe" o "constraint ya existe"
                if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME') {
                    console.log('⚠️  Ya existe:', statement.substring(0, 60) + '...');
                } else {
                    console.error('❌ Error:', err.message);
                }
            }
        }
        
        console.log('\n✅ Migración completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error ejecutando migración:', error);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

runMigration();
