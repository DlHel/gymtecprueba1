/**
 * ⚡ APLICAR ÍNDICES - Script Simplificado
 * Ejecuta optimize-indexes.sql directamente
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp',
    multipleStatements: false // Ejecutar una a la vez para mejor control
};

async function applyIndexes() {
    let connection;
    
    try {
        console.log('\n⚡ APLICANDO ÍNDICES DE OPTIMIZACIÓN\n');
        
        // Conectar
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conectado a MySQL\n');
        
        // Leer SQL
        const sqlPath = path.join(__dirname, 'optimize-indexes.sql');
        const sql = await fs.readFile(sqlPath, 'utf8');
        
        // Extraer solo los ALTER TABLE
        const alterStatements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.startsWith('ALTER TABLE') && s.includes('ADD INDEX'));
        
        console.log(`📊 Encontrados ${alterStatements.length} índices para crear\n`);
        
        let created = 0, skipped = 0, errors = 0;
        
        for (const statement of alterStatements) {
            try {
                // Extraer nombre de tabla e índice
                const tableMatch = statement.match(/ALTER TABLE `(\w+)`/);
                const indexMatch = statement.match(/ADD INDEX `(\w+)`/);
                
                if (!tableMatch || !indexMatch) continue;
                
                const table = tableMatch[1];
                const indexName = indexMatch[1];
                
                // Verificar si existe
                const [rows] = await connection.query(
                    'SHOW INDEX FROM ?? WHERE Key_name = ?',
                    [table, indexName]
                );
                
                if (rows.length > 0) {
                    console.log(`⏭️  ${table}.${indexName} - Ya existe`);
                    skipped++;
                } else {
                    await connection.query(statement + ';');
                    console.log(`✅ ${table}.${indexName} - Creado`);
                    created++;
                }
            } catch (error) {
                console.log(`❌ Error: ${error.message}`);
                errors++;
            }
        }
        
        console.log(`\n╔═══════════════════════════════════════╗`);
        console.log(`║           RESUMEN                    ║`);
        console.log(`╠═══════════════════════════════════════╣`);
        console.log(`║  Creados:  ${created.toString().padEnd(3)}                       ║`);
        console.log(`║  Omitidos: ${skipped.toString().padEnd(3)}                       ║`);
        console.log(`║  Errores:  ${errors.toString().padEnd(3)}                       ║`);
        console.log(`╚═══════════════════════════════════════╝\n`);
        
        if (created > 0) {
            console.log('🎉 Optimización aplicada exitosamente\n');
        }
        
    } catch (error) {
        console.error(`\n❌ ERROR: ${error.message}\n`);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

applyIndexes();
