#!/usr/bin/env node
/**
 * Script de verificación completa del backend en VPS
 * Verifica todos los endpoints críticos y tablas de la base de datos
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Configuración de base de datos
const DB_CONFIG = {
    host: 'localhost',
    user: 'gymtec_user',
    password: 'gymtec_2024_secure',
    database: 'gymtec_erp',
    port: 3306
};

// Colores para consola
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function verifyTables(connection) {
    log('\n📊 VERIFICANDO TABLAS DE LA BASE DE DATOS', 'cyan');
    log('='.repeat(60), 'cyan');
    
    const requiredTables = [
        'Users', 'Clients', 'Locations', 'EquipmentModels', 'Equipment',
        'Tickets', 'TicketChecklist', 'ChecklistTemplates', 'TicketPhotos',
        'TicketNotes', 'EquipmentNotes', 'EquipmentPhotos', 'ModelPhotos',
        'Inventory', 'InventoryMovements', 'Suppliers', 'PurchaseOrders',
        'Contracts', 'MaintenancePlans', 'WorkOrders', 'Invoices',
        'Staff', 'Attendance', 'Assignments', 'Notifications'
    ];
    
    const missingTables = [];
    const existingTables = [];
    
    for (const table of requiredTables) {
        try {
            const [rows] = await connection.query(`SHOW TABLES LIKE '${table}'`);
            if (rows.length > 0) {
                existingTables.push(table);
                log(`  ✅ ${table}`, 'green');
            } else {
                missingTables.push(table);
                log(`  ❌ ${table} - FALTANTE`, 'red');
            }
        } catch (error) {
            missingTables.push(table);
            log(`  ❌ ${table} - ERROR: ${error.message}`, 'red');
        }
    }
    
    log(`\n📈 Resumen: ${existingTables.length}/${requiredTables.length} tablas existentes`, 'blue');
    
    return { existingTables, missingTables };
}

async function verifyTableStructure(connection, tableName) {
    try {
        const [columns] = await connection.query(`DESCRIBE ${tableName}`);
        return columns;
    } catch (error) {
        log(`  ❌ Error verificando estructura de ${tableName}: ${error.message}`, 'red');
        return null;
    }
}

async function checkCriticalEndpoints(connection) {
    log('\n🔍 VERIFICANDO DATOS CRÍTICOS PARA ENDPOINTS', 'cyan');
    log('='.repeat(60), 'cyan');
    
    const checks = [
        {
            name: 'Usuarios',
            query: 'SELECT COUNT(*) as count FROM Users',
            table: 'Users'
        },
        {
            name: 'Clientes',
            query: 'SELECT COUNT(*) as count FROM Clients',
            table: 'Clients'
        },
        {
            name: 'Ubicaciones',
            query: 'SELECT COUNT(*) as count FROM Locations',
            table: 'Locations'
        },
        {
            name: 'Modelos de Equipo',
            query: 'SELECT COUNT(*) as count FROM EquipmentModels',
            table: 'EquipmentModels'
        },
        {
            name: 'Equipos',
            query: 'SELECT COUNT(*) as count FROM Equipment',
            table: 'Equipment'
        },
        {
            name: 'Tickets',
            query: 'SELECT COUNT(*) as count FROM Tickets',
            table: 'Tickets'
        },
        {
            name: 'Notas de Equipo',
            query: 'SELECT COUNT(*) as count FROM EquipmentNotes',
            table: 'EquipmentNotes'
        },
        {
            name: 'Fotos de Equipo',
            query: 'SELECT COUNT(*) as count FROM EquipmentPhotos',
            table: 'EquipmentPhotos'
        }
    ];
    
    const results = [];
    
    for (const check of checks) {
        try {
            const [rows] = await connection.query(check.query);
            const count = rows[0].count;
            results.push({ name: check.name, count, success: true });
            log(`  ✅ ${check.name}: ${count} registros`, count > 0 ? 'green' : 'yellow');
        } catch (error) {
            results.push({ name: check.name, count: 0, success: false, error: error.message });
            log(`  ❌ ${check.name}: ERROR - ${error.message}`, 'red');
        }
    }
    
    return results;
}

async function verifyEquipmentRelations(connection) {
    log('\n🔗 VERIFICANDO RELACIONES DE EQUIPOS', 'cyan');
    log('='.repeat(60), 'cyan');
    
    try {
        // Verificar equipos con ubicaciones y modelos
        const [equipment] = await connection.query(`
            SELECT 
                e.id,
                e.serial_number,
                e.location_id,
                e.model_id,
                l.name as location_name,
                m.name as model_name
            FROM Equipment e
            LEFT JOIN Locations l ON e.location_id = l.id
            LEFT JOIN EquipmentModels m ON e.model_id = m.id
        `);
        
        log(`\n  Total equipos: ${equipment.length}`, 'blue');
        
        equipment.forEach(eq => {
            const locationStatus = eq.location_name ? '✅' : '❌';
            const modelStatus = eq.model_name ? '✅' : '❌';
            log(`  Equipo #${eq.id} (${eq.serial_number}): ${locationStatus} Ubicación | ${modelStatus} Modelo`, 
                eq.location_name && eq.model_name ? 'green' : 'yellow');
        });
        
        return equipment;
    } catch (error) {
        log(`  ❌ Error verificando relaciones: ${error.message}`, 'red');
        return [];
    }
}

async function createMissingTables(connection, missingTables) {
    if (missingTables.length === 0) {
        log('\n✅ No hay tablas faltantes', 'green');
        return;
    }
    
    log(`\n🔨 CREANDO ${missingTables.length} TABLAS FALTANTES`, 'yellow');
    log('='.repeat(60), 'yellow');
    
    // Leer el schema SQL
    const schemaPath = path.join(__dirname, '..', 'backend', 'database', 'mysql-schema.sql');
    
    try {
        const schema = await fs.readFile(schemaPath, 'utf8');
        
        // Extraer CREATE TABLE statements para cada tabla faltante
        for (const table of missingTables) {
            const regex = new RegExp(`CREATE TABLE.*?${table}[\\s\\S]*?;`, 'i');
            const match = schema.match(regex);
            
            if (match) {
                try {
                    await connection.query(match[0]);
                    log(`  ✅ Tabla ${table} creada exitosamente`, 'green');
                } catch (error) {
                    log(`  ❌ Error creando ${table}: ${error.message}`, 'red');
                }
            } else {
                log(`  ⚠️  No se encontró definición para ${table} en schema`, 'yellow');
            }
        }
    } catch (error) {
        log(`  ❌ Error leyendo schema: ${error.message}`, 'red');
    }
}

async function verifyServerEndpoints() {
    log('\n🚀 VERIFICANDO ENDPOINTS DEL SERVIDOR', 'cyan');
    log('='.repeat(60), 'cyan');
    
    const serverPath = path.join(__dirname, '..', 'backend', 'src', 'server-clean.js');
    
    try {
        const serverCode = await fs.readFile(serverPath, 'utf8');
        
        const endpoints = {
            equipment: [
                '/api/equipment',
                '/api/equipment/:id',
                '/api/equipment/:id/tickets',
                '/api/equipment/:id/notes',
                '/api/equipment/:id/photos'
            ],
            models: [
                '/api/models',
                '/api/models/:id',
                '/api/models/:id/photos',
                '/api/models/:id/main-photo'
            ],
            locations: [
                '/api/locations/:id/equipment'
            ],
            dashboard: [
                '/api/dashboard/activity'
            ]
        };
        
        for (const [category, routes] of Object.entries(endpoints)) {
            log(`\n  ${category.toUpperCase()}:`, 'blue');
            for (const route of routes) {
                const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const pattern = escaped.replace(/:id/g, ':\\w+');
                const regex = new RegExp(`app\\.\\w+\\(['"]${pattern}['"]`, 'g');
                const found = serverCode.match(regex);
                
                if (found && found.length > 0) {
                    log(`    ✅ ${route}`, 'green');
                } else {
                    log(`    ❌ ${route} - NO ENCONTRADO`, 'red');
                }
            }
        }
    } catch (error) {
        log(`  ❌ Error verificando servidor: ${error.message}`, 'red');
    }
}

async function generateReport(results) {
    log('\n📋 GENERANDO REPORTE FINAL', 'magenta');
    log('='.repeat(60), 'magenta');
    
    const report = {
        timestamp: new Date().toISOString(),
        ...results
    };
    
    const reportPath = path.join(__dirname, '..', 'logs', `vps-verification-${Date.now()}.json`);
    
    try {
        await fs.mkdir(path.dirname(reportPath), { recursive: true });
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        log(`\n✅ Reporte guardado en: ${reportPath}`, 'green');
    } catch (error) {
        log(`\n❌ Error guardando reporte: ${error.message}`, 'red');
    }
    
    return report;
}

async function main() {
    log('\n' + '='.repeat(60), 'bright');
    log('🔍 VERIFICACIÓN COMPLETA DEL BACKEND VPS - GYMTEC ERP', 'bright');
    log('='.repeat(60) + '\n', 'bright');
    
    let connection;
    
    try {
        // Conectar a la base de datos
        log('📡 Conectando a MySQL...', 'cyan');
        connection = await mysql.createConnection(DB_CONFIG);
        log('✅ Conexión establecida\n', 'green');
        
        // 1. Verificar tablas
        const { existingTables, missingTables } = await verifyTables(connection);
        
        // 2. Crear tablas faltantes si es necesario
        if (missingTables.length > 0) {
            await createMissingTables(connection, missingTables);
        }
        
        // 3. Verificar datos críticos
        const dataResults = await checkCriticalEndpoints(connection);
        
        // 4. Verificar relaciones de equipos
        const equipmentRelations = await verifyEquipmentRelations(connection);
        
        // 5. Verificar endpoints del servidor
        await verifyServerEndpoints();
        
        // 6. Generar reporte
        const report = await generateReport({
            existingTables,
            missingTables,
            dataResults,
            equipmentCount: equipmentRelations.length
        });
        
        log('\n' + '='.repeat(60), 'bright');
        log('✅ VERIFICACIÓN COMPLETADA', 'green');
        log('='.repeat(60) + '\n', 'bright');
        
        // Resumen final
        log('📊 RESUMEN:', 'magenta');
        log(`  • Tablas existentes: ${existingTables.length}`, 'green');
        log(`  • Tablas faltantes: ${missingTables.length}`, missingTables.length > 0 ? 'yellow' : 'green');
        log(`  • Equipos en sistema: ${equipmentRelations.length}`, 'blue');
        
        const emptyTables = dataResults.filter(r => r.success && r.count === 0);
        if (emptyTables.length > 0) {
            log(`\n⚠️  ADVERTENCIA: ${emptyTables.length} tablas sin datos:`, 'yellow');
            emptyTables.forEach(t => log(`    • ${t.name}`, 'yellow'));
        }
        
    } catch (error) {
        log(`\n❌ ERROR FATAL: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            log('\n📡 Conexión cerrada', 'cyan');
        }
    }
}

// Ejecutar
main().catch(console.error);
