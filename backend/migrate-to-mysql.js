const sqlite3 = require('sqlite3').verbose();
const mysql = require('./src/mysql-database');
const path = require('path');
require('dotenv').config();

console.log('🔄 Iniciando migración de SQLite a MySQL...');

// Configuración de SQLite
const sqliteDbPath = path.join(__dirname, 'database', 'gymtec.db');

// Función principal de migración
async function migrateData() {
    let sqliteDb = null;
    
    try {
        // Conectar a SQLite
        console.log('📂 Conectando a SQLite...');
        sqliteDb = new sqlite3.Database(sqliteDbPath);
        
        // Inicializar MySQL
        console.log('🔌 Inicializando MySQL...');
        await mysql.initializeDB();
        
        // Migrar cada tabla
        await migrateTable('Clients', sqliteDb);
        await migrateTable('Locations', sqliteDb);
        await migrateTable('Equipment', sqliteDb);
        await migrateTable('SpareParts', sqliteDb);
        await migrateTable('Tickets', sqliteDb);
        await migrateTable('EquipmentNotes', sqliteDb);
        
        // Intentar migrar tablas de modelos si existen
        try {
            await migrateTable('EquipmentModels', sqliteDb);
            await migrateTable('ModelPhotos', sqliteDb);
        } catch (error) {
            console.log('ℹ️  Tablas de modelos no encontradas en SQLite (es normal si no se han creado)');
        }
        
        console.log('✅ Migración completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        throw error;
    } finally {
        if (sqliteDb) {
            sqliteDb.close();
            console.log('📂 Conexión SQLite cerrada');
        }
    }
}

// Función para migrar una tabla específica
async function migrateTable(tableName, sqliteDb) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log(`📋 Migrando tabla: ${tableName}`);
            
            // Obtener datos de SQLite
            sqliteDb.all(`SELECT * FROM ${tableName}`, async (err, rows) => {
                if (err) {
                    if (err.message.includes('no such table')) {
                        console.log(`ℹ️  Tabla ${tableName} no existe en SQLite, omitiendo...`);
                        resolve();
                        return;
                    }
                    reject(err);
                    return;
                }
                
                if (rows.length === 0) {
                    console.log(`ℹ️  Tabla ${tableName} está vacía, omitiendo...`);
                    resolve();
                    return;
                }
                
                try {
                    // Limpiar tabla MySQL primero (solo datos, no estructura)
                    await mysql.query(`DELETE FROM \`${tableName}\``);
                    
                    // Preparar datos para MySQL
                    for (const row of rows) {
                        await insertRowToMySQL(tableName, row);
                    }
                    
                    console.log(`✅ Tabla ${tableName} migrada: ${rows.length} registros`);
                    resolve();
                    
                } catch (mysqlError) {
                    console.error(`❌ Error migrando ${tableName} a MySQL:`, mysqlError.message);
                    reject(mysqlError);
                }
            });
            
        } catch (error) {
            reject(error);
        }
    });
}

// Función para insertar una fila en MySQL
async function insertRowToMySQL(tableName, row) {
    const columns = Object.keys(row);
    const values = Object.values(row);
    const placeholders = columns.map(() => '?').join(', ');
    const columnNames = columns.map(col => `\`${col}\``).join(', ');
    
    const sql = `INSERT INTO \`${tableName}\` (${columnNames}) VALUES (${placeholders})`;
    
    try {
        await mysql.run(sql, values);
    } catch (error) {
        // Si hay error de constraint, intentar sin el ID para que MySQL lo genere
        if (error.message.includes('Duplicate entry') && columns.includes('id')) {
            const filteredColumns = columns.filter(col => col !== 'id');
            const filteredValues = filteredColumns.map(col => row[col]);
            const filteredPlaceholders = filteredColumns.map(() => '?').join(', ');
            const filteredColumnNames = filteredColumns.map(col => `\`${col}\``).join(', ');
            
            const newSql = `INSERT INTO \`${tableName}\` (${filteredColumnNames}) VALUES (${filteredPlaceholders})`;
            await mysql.run(newSql, filteredValues);
        } else {
            throw error;
        }
    }
}

// Función para verificar si MySQL está disponible
async function checkMySQLConnection() {
    try {
        const isConnected = await mysql.testConnection();
        if (!isConnected) {
            throw new Error('No se pudo conectar a MySQL');
        }
        console.log('✅ Conexión MySQL verificada');
        return true;
    } catch (error) {
        console.error('❌ Error conectando a MySQL:', error.message);
        console.error('💡 Asegúrate de que:');
        console.error('   - MySQL Server esté instalado y ejecutándose');
        console.error('   - Las credenciales en .env sean correctas');
        console.error('   - El usuario tenga permisos para crear bases de datos');
        return false;
    }
}

// Función para verificar si SQLite existe
function checkSQLiteExists() {
    const fs = require('fs');
    if (!fs.existsSync(sqliteDbPath)) {
        console.error('❌ Archivo SQLite no encontrado:', sqliteDbPath);
        console.error('💡 Si es una instalación nueva, no hay datos que migrar');
        return false;
    }
    console.log('✅ Archivo SQLite encontrado');
    return true;
}

// Ejecutar migración
async function main() {
    try {
        console.log('🚀 Verificando prerrequisitos...');
        
        // Verificar MySQL
        const mysqlOk = await checkMySQLConnection();
        if (!mysqlOk) {
            process.exit(1);
        }
        
        // Verificar SQLite
        const sqliteOk = checkSQLiteExists();
        if (!sqliteOk) {
            console.log('ℹ️  No hay datos SQLite para migrar. Inicializando MySQL vacío...');
            await mysql.initializeDB();
            console.log('✅ MySQL inicializado correctamente');
            process.exit(0);
        }
        
        // Ejecutar migración
        await migrateData();
        console.log('🎉 Migración completada exitosamente');
        
    } catch (error) {
        console.error('💥 Error fatal durante la migración:', error);
        process.exit(1);
    } finally {
        await mysql.close();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main();
}

module.exports = { migrateData, checkMySQLConnection }; 