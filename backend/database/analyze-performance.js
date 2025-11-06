/**
 * 📊 ANÁLISIS DE PERFORMANCE DE QUERIES
 * Detecta queries lentas y sugiere optimizaciones
 * Fecha: 6 de noviembre de 2025
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
};

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Queries comunes del sistema para analizar
 */
const commonQueries = [
    {
        name: 'Dashboard - Tickets por estado',
        query: `SELECT status, COUNT(*) as count FROM Tickets WHERE client_id = 1 GROUP BY status`
    },
    {
        name: 'Tickets - Listar con prioridad',
        query: `SELECT * FROM Tickets WHERE status = 'Abierto' AND priority = 'Alta' ORDER BY created_at DESC LIMIT 50`
    },
    {
        name: 'Equipos - Por sede y activos',
        query: `SELECT * FROM Equipment WHERE location_id = 1 AND activo = 1`
    },
    {
        name: 'Inventario - Historial de transacciones',
        query: `SELECT * FROM InventoryTransactions WHERE spare_part_id = 1 ORDER BY transaction_date DESC LIMIT 100`
    },
    {
        name: 'Usuarios - Login por email',
        query: `SELECT * FROM Users WHERE email = 'admin@gymtec.cl'`
    },
    {
        name: 'Tickets - Por técnico asignado',
        query: `SELECT * FROM Tickets WHERE assigned_technician_id = 1 AND status IN ('Abierto', 'En Progreso')`
    },
    {
        name: 'Contratos - Activos por cliente',
        query: `SELECT * FROM Contracts WHERE client_id = 1 AND is_active = 1`
    },
    {
        name: 'Asistencia - Por técnico y mes',
        query: `SELECT * FROM Attendance WHERE technician_id = 1 AND date >= '2025-11-01' AND date <= '2025-11-30'`
    }
];

/**
 * Analiza el plan de ejecución de una query
 */
async function analyzeQuery(connection, queryName, query) {
    try {
        const [explainResults] = await connection.query(`EXPLAIN ${query}`);
        
        let score = 100;
        let warnings = [];
        let recommendations = [];

        for (const row of explainResults) {
            // Verificar type de scan
            if (row.type === 'ALL') {
                score -= 30;
                warnings.push('⚠️  Full table scan detectado');
                recommendations.push('Agregar índice en columnas de WHERE/JOIN');
            } else if (row.type === 'index') {
                score -= 10;
                warnings.push('ℹ️  Index scan completo');
            }

            // Verificar posible optimización de índices
            if (row.possible_keys === null) {
                score -= 20;
                warnings.push('⚠️  No hay índices posibles para esta query');
                recommendations.push('Crear índice en columnas filtradas');
            }

            // Verificar Extra para operaciones costosas
            if (row.Extra) {
                if (row.Extra.includes('Using filesort')) {
                    score -= 15;
                    warnings.push('⚠️  Filesort requerido (ordenamiento costoso)');
                    recommendations.push('Agregar índice en columnas de ORDER BY');
                }
                if (row.Extra.includes('Using temporary')) {
                    score -= 15;
                    warnings.push('⚠️  Tabla temporal requerida');
                }
            }

            // Verificar rows examinadas
            if (row.rows > 1000) {
                score -= Math.min(20, Math.floor(row.rows / 1000) * 5);
                warnings.push(`⚠️  Examina ${row.rows} filas`);
            }
        }

        return {
            name: queryName,
            score: Math.max(0, score),
            warnings,
            recommendations,
            explainResults
        };
    } catch (error) {
        return {
            name: queryName,
            score: 0,
            warnings: [`❌ Error: ${error.message}`],
            recommendations: [],
            explainResults: []
        };
    }
}

/**
 * Obtiene estadísticas de tablas
 */
async function getTableStats(connection) {
    const [stats] = await connection.query(`
        SELECT 
            table_name,
            table_rows,
            ROUND(data_length / 1024 / 1024, 2) as data_mb,
            ROUND(index_length / 1024 / 1024, 2) as index_mb,
            ROUND((data_length + index_length) / 1024 / 1024, 2) as total_mb
        FROM information_schema.tables 
        WHERE table_schema = ?
        AND table_type = 'BASE TABLE'
        ORDER BY (data_length + index_length) DESC
        LIMIT 10
    `, [dbConfig.database]);

    return stats;
}

/**
 * Análisis principal
 */
async function runPerformanceAnalysis() {
    let connection;

    try {
        log('\n╔══════════════════════════════════════════════════════════╗', 'cyan');
        log('║      ANÁLISIS DE PERFORMANCE - GYMTEC ERP              ║', 'cyan');
        log('╚══════════════════════════════════════════════════════════╝\n', 'cyan');

        // Conectar
        log('📡 Conectando a MySQL...', 'yellow');
        connection = await mysql.createConnection(dbConfig);
        log('✅ Conexión exitosa\n', 'green');

        // Estadísticas de tablas
        log('📊 ESTADÍSTICAS DE TABLAS\n', 'cyan');
        const tableStats = await getTableStats(connection);
        console.table(tableStats);

        // Analizar queries comunes
        log('\n🔍 ANÁLISIS DE QUERIES COMUNES\n', 'cyan');
        const results = [];

        for (const { name, query } of commonQueries) {
            log(`\n${name}`, 'bold');
            log(`Query: ${query}`, 'gray');
            
            const analysis = await analyzeQuery(connection, name, query);
            results.push(analysis);

            // Mostrar score
            const scoreColor = analysis.score >= 80 ? 'green' : analysis.score >= 60 ? 'yellow' : 'red';
            log(`Score: ${analysis.score}/100`, scoreColor);

            // Mostrar warnings
            if (analysis.warnings.length > 0) {
                analysis.warnings.forEach(w => log(`  ${w}`, 'yellow'));
            }

            // Mostrar recomendaciones
            if (analysis.recommendations.length > 0) {
                log('  💡 Recomendaciones:', 'cyan');
                analysis.recommendations.forEach(r => log(`    - ${r}`, 'gray'));
            }
        }

        // Resumen final
        const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
        const needsOptimization = results.filter(r => r.score < 70);

        log('\n╔══════════════════════════════════════════════════════════╗', 'cyan');
        log('║                     RESUMEN                             ║', 'cyan');
        log('╠══════════════════════════════════════════════════════════╣', 'cyan');
        log(`║  Score promedio:              ${Math.round(avgScore)}/100                 ║`, avgScore >= 70 ? 'green' : 'yellow');
        log(`║  Queries analizadas:          ${results.length}                      ║`, 'cyan');
        log(`║  Queries necesitan mejora:    ${needsOptimization.length}                      ║`, needsOptimization.length > 0 ? 'yellow' : 'green');
        log('╚══════════════════════════════════════════════════════════╝\n', 'cyan');

        if (avgScore < 70) {
            log('⚠️  ACCIÓN RECOMENDADA:', 'yellow');
            log('  Ejecutar: node apply-index-optimization.js', 'gray');
            log('  Para aplicar índices optimizados\n', 'gray');
        } else {
            log('✅ Performance aceptable - No se requieren cambios inmediatos\n', 'green');
        }

    } catch (error) {
        log(`\n❌ ERROR: ${error.message}`, 'red');
        log(error.stack, 'gray');
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            log('📡 Conexión cerrada\n', 'gray');
        }
    }
}

// Ejecutar análisis
runPerformanceAnalysis().catch(console.error);
