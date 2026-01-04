const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Configuración de la base de datos MySQL
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp',
    charset: 'utf8mb4',
    multipleStatements: true
};

// Pool de conexiones para mejor rendimiento
const pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Función para inicializar la base de datos
async function initializeDB() {
    try {
        console.log('🔌 Conectando a MySQL...');
        
        // Primero conectar sin especificar base de datos para crearla si no existe
        const tempConnection = await mysql.createConnection({
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password,
            multipleStatements: true
        });

        // Crear base de datos si no existe
        await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log(`✅ Base de datos '${dbConfig.database}' verificada/creada`);
        
        await tempConnection.end();

        // Ahora conectar al pool y ejecutar el esquema
        const connection = await pool.getConnection();
        
        // Leer y ejecutar el esquema MySQL
        const schemaPath = path.join(__dirname, '..', 'database', 'mysql-schema.sql');
        
        if (fs.existsSync(schemaPath)) {
            console.log('📋 Ejecutando esquema MySQL...');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            
            // Ejecutar el esquema completo
            await connection.query(schema);
            console.log('✅ Esquema MySQL ejecutado correctamente');
        } else {
            console.warn('⚠️  Archivo de esquema MySQL no encontrado:', schemaPath);
        }

        connection.release();
        console.log('🚀 Base de datos MySQL inicializada correctamente');

    } catch (error) {
        console.error('❌ Error inicializando base de datos MySQL:', error.message);
        
        // Información adicional para debugging
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('💡 Verifica las credenciales de MySQL');
            console.error('   - Usuario:', dbConfig.user);
            console.error('   - Host:', dbConfig.host);
            console.error('   - Puerto:', dbConfig.port);
        } else if (error.code === 'ECONNREFUSED') {
            console.error('💡 MySQL server no está ejecutándose o no es accesible');
            console.error('   - Verifica que MySQL esté instalado y ejecutándose');
            console.error('   - Host:', dbConfig.host, 'Puerto:', dbConfig.port);
        }
        
        throw error;
    }
}

// Wrapper para ejecutar queries con manejo de errores
async function query(sql, params = []) {
    try {
        // Usar pool.query() en lugar de pool.execute() para mayor compatibilidad
        // execute() es más estricto con prepared statements y puede fallar con queries complejas
        const [results] = await pool.query(sql, params);
        return results;
    } catch (error) {
        console.error('❌ Error ejecutando query MySQL:', error.message);
        console.error('📝 SQL:', sql);
        console.error('📋 Params:', params);
        throw error;
    }
}

// Función para obtener una sola fila
async function get(sql, params = []) {
    const results = await query(sql, params);
    return results[0] || null;
}

// Función para obtener todas las filas
async function all(sql, params = []) {
    return await query(sql, params);
}

// Función para ejecutar queries que modifican datos (INSERT, UPDATE, DELETE)
async function run(sql, params = []) {
    try {
        const [result] = await pool.execute(sql, params);
        return {
            insertId: result.insertId,
            affectedRows: result.affectedRows,
            changedRows: result.changedRows
        };
    } catch (error) {
        console.error('❌ Error ejecutando comando MySQL:', error.message);
        console.error('📝 SQL:', sql);
        console.error('📋 Params:', params);
        throw error;
    }
}

// Función para cerrar el pool de conexiones
async function close() {
    await pool.end();
    console.log('🔌 Pool de conexiones MySQL cerrado');
}

// Función para verificar la conexión
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        console.log('✅ Conexión MySQL verificada correctamente');
        return true;
    } catch (error) {
        console.error('❌ Error probando conexión MySQL:', error.message);
        return false;
    }
}

// Exportar las funciones para mantener compatibilidad con el código existente
module.exports = {
    // Funciones principales
    query,
    get,
    all,
    run,
    
    // Funciones de gestión
    initializeDB,
    testConnection,
    close,
    
    // Pool para uso directo si es necesario
    pool,
    
    // Configuración para debugging
    config: dbConfig
}; 