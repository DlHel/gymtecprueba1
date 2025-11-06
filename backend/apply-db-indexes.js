/**
 * ⚡ APLICAR ÍNDICES - Versión Robusta
 * Aplica cada índice individualmente manejando errores de duplicados
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'config.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
};

async function applyIndexes() {
    let connection;
    
    try {
        console.log('\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║     APLICACIÓN DE ÍNDICES - GYMTEC ERP                   ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');
        
        // Conectar
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conectado a MySQL\n');
        
        // Leer SQL
        const sqlPath = path.join(__dirname, 'database', 'optimize-indexes.sql');
        const sql = await fs.readFile(sqlPath, 'utf8');
        
        // Extraer comandos ALTER TABLE
        const alterStatements = [];
        const lines = sql.split('\n');
        let currentStatement = '';
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Ignorar comentarios y líneas vacías
            if (trimmed.startsWith('--') || trimmed === '' || trimmed === 'USE `gymtec_erp`;' || trimmed === 'COMMIT;') {
                continue;
            }
            
            currentStatement += ' ' + trimmed;
            
            // Si encuentra punto y coma, es fin de statement
            if (trimmed.endsWith(';')) {
                if (currentStatement.trim().startsWith('ALTER TABLE') && currentStatement.includes('ADD INDEX')) {
                    alterStatements.push(currentStatement.trim());
                }
                currentStatement = '';
            }
        }
        
        console.log(`📊 Encontrados ${alterStatements.length} índices para aplicar\n`);
        
        let created = 0, skipped = 0, errors = 0;
        
        for (const statement of alterStatements) {
            try {
                // Extraer info del statement
                const tableMatch = statement.match(/ALTER TABLE `?(\w+)`?/i);
                const indexMatch = statement.match(/ADD INDEX `?(\w+)`?/i);
                
                if (!tableMatch || !indexMatch) continue;
                
                const table = tableMatch[1];
                const indexName = indexMatch[1];
                
                // Verificar si existe
                const [rows] = await connection.query(
                    'SELECT COUNT(*) as count FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?',
                    [dbConfig.database, table, indexName]
                );
                
                if (rows[0].count > 0) {
                    console.log(`⏭️  ${table}.${indexName} - Ya existe`);
                    skipped++;
                } else {
                    await connection.query(statement);
                    console.log(`✅ ${table}.${indexName} - Creado`);
                    created++;
                }
            } catch (error) {
                if (error.code === 'ER_DUP_KEYNAME') {
                    console.log(`⏭️  Índice duplicado (omitido)`);
                    skipped++;
                } else if (error.code === 'ER_BAD_FIELD_ERROR') {
                    console.log(`⚠️  Columna no existe (omitido) - ${error.message.split(':')[1]}`);
                    errors++;
                } else {
                    console.log(`❌ Error: ${error.message}`);
                    errors++;
                }
            }
        }
        
        console.log('\n╔═══════════════════════════════════════════╗');
        console.log('║           RESUMEN                        ║');
        console.log('╠═══════════════════════════════════════════╣');
        console.log(`║  Total de índices:    ${alterStatements.length.toString().padStart(3)}              ║`);
        console.log(`║  Creados:             ${created.toString().padStart(3)}              ║`);
        console.log(`║  Omitidos (existían): ${skipped.toString().padStart(3)}              ║`);
        console.log(`║  Errores:             ${errors.toString().padStart(3)}              ║`);
        console.log('╚═══════════════════════════════════════════╝\n');
        
        if (created > 0) {
            console.log('🎉 Optimización aplicada exitosamente\n');
            console.log('💡 Para verificar mejoras:');
            console.log('   cd backend/database');
            console.log('   node analyze-performance.js\n');
        } else if (skipped === alterStatements.length) {
            console.log('ℹ️  Todos los índices ya estaban aplicados\n');
        }
        
    } catch (error) {
        console.error(`\n❌ ERROR: ${error.message}\n`);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

applyIndexes();
