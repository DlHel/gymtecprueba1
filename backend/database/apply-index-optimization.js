/**
 * ⚡ SCRIPT DE OPTIMIZACIÓN DE ÍNDICES
 * Aplica índices de manera segura con verificación previa
 * Fecha: 6 de noviembre de 2025
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config.env') });

// Configuración de la base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp',
    multipleStatements: true
};

// Colores para consola
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Verifica si un índice ya existe en una tabla
 */
async function indexExists(connection, tableName, indexName) {
    try {
        const [rows] = await connection.query(
            `SHOW INDEX FROM ?? WHERE Key_name = ?`,
            [tableName, indexName]
        );
        return rows.length > 0;
    } catch (error) {
        return false;
    }
}

/**
 * Aplica índices de manera segura
 */
async function applyOptimizations() {
    let connection;
    const stats = {
        total: 0,
        created: 0,
        skipped: 0,
        failed: 0
    };

    try {
        log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
        log('║     OPTIMIZACIÓN DE ÍNDICES - GYMTEC ERP             ║', 'cyan');
        log('╚════════════════════════════════════════════════════════╝', 'cyan');

        // Conectar a la base de datos
        log('\n📡 Conectando a MySQL...', 'yellow');
        connection = await mysql.createConnection(dbConfig);
        log('✅ Conexión exitosa', 'green');

        // Leer archivo SQL
        const sqlPath = path.join(__dirname, 'optimize-indexes.sql');
        log(`\n📄 Leyendo ${path.basename(sqlPath)}...`, 'yellow');
        const sqlContent = await fs.readFile(sqlPath, 'utf8');

        // Extraer comandos ALTER TABLE del archivo SQL
        const alterStatements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.startsWith('ALTER TABLE'))
            .map(stmt => {
                const match = stmt.match(/ALTER TABLE `(\w+)`.*ADD INDEX `(\w+)`/);
                return match ? {
                    table: match[1],
                    indexName: match[2],
                    statement: stmt + ';'
                } : null;
            })
            .filter(Boolean);

        stats.total = alterStatements.length;
        log(`📊 Encontrados ${stats.total} índices a procesar\n`, 'cyan');

        // Aplicar cada índice individualmente
        for (const { table, indexName, statement } of alterStatements) {
            try {
                // Verificar si el índice ya existe
                const exists = await indexExists(connection, table, indexName);
                
                if (exists) {
                    log(`⏭️  ${table}.${indexName} - Ya existe, omitiendo`, 'gray');
                    stats.skipped++;
                } else {
                    log(`⚙️  Creando ${table}.${indexName}...`, 'yellow');
                    await connection.query(statement);
                    log(`✅ ${table}.${indexName} - Creado`, 'green');
                    stats.created++;
                }
            } catch (error) {
                log(`❌ ${table}.${indexName} - Error: ${error.message}`, 'red');
                stats.failed++;
            }
        }

        // Resumen final
        log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
        log('║              RESUMEN DE OPTIMIZACIÓN                  ║', 'cyan');
        log('╠════════════════════════════════════════════════════════╣', 'cyan');
        log(`║  Total de índices:     ${stats.total.toString().padStart(3)} índices                  ║`, 'cyan');
        log(`║  Creados:              ${stats.created.toString().padStart(3)} índices                  ║`, 'green');
        log(`║  Omitidos (existían):  ${stats.skipped.toString().padStart(3)} índices                  ║`, 'gray');
        log(`║  Errores:              ${stats.failed.toString().padStart(3)} índices                  ║`, stats.failed > 0 ? 'red' : 'cyan');
        log('╚════════════════════════════════════════════════════════╝', 'cyan');

        if (stats.created > 0) {
            log('\n💡 RECOMENDACIONES:', 'yellow');
            log('  1. Ejecutar ANALYZE TABLE en las tablas modificadas', 'gray');
            log('  2. Monitorear performance de queries en las próximas 24h', 'gray');
            log('  3. Revisar slow query log para detectar nuevas oportunidades\n', 'gray');
        }

        log('🎉 Optimización completada\n', 'green');

    } catch (error) {
        log(`\n❌ ERROR CRÍTICO: ${error.message}`, 'red');
        log(error.stack, 'gray');
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            log('📡 Conexión cerrada', 'gray');
        }
    }
}

// Verificar argumentos de línea de comando
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

if (dryRun) {
    log('\n⚠️  MODO DRY RUN - No se aplicarán cambios\n', 'yellow');
    log('Para aplicar cambios, ejecuta: node apply-index-optimization.js\n', 'gray');
    process.exit(0);
}

// Ejecutar optimización
applyOptimizations().catch(console.error);
