// Script de diagnóstico para verificar el estado del servidor backend
const mysql = require('mysql2/promise');
const http = require('http');

console.log('🔍 DIAGNÓSTICO DEL SERVIDOR BACKEND - Gymtec ERP');
console.log('================================================\n');

// Configuración de la base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp',
    connectTimeout: 5000,
    acquireTimeout: 5000,
    timeout: 5000
};

async function checkDatabaseConnection() {
    console.log('1️⃣ VERIFICANDO CONEXIÓN A MYSQL...');

    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conexión a MySQL exitosa');

        // Verificar que la base de datos existe
        const [rows] = await connection.execute('SHOW DATABASES LIKE ?', [dbConfig.database]);
        if (rows.length === 0) {
            console.log('❌ La base de datos no existe');
            return false;
        }
        console.log('✅ Base de datos encontrada');

        // Verificar tablas principales
        const [tables] = await connection.execute('SHOW TABLES');
        console.log(`✅ Encontradas ${tables.length} tablas`);

        // Verificar tabla Users
        try {
            const [users] = await connection.execute('SELECT COUNT(*) as count FROM Users');
            console.log(`✅ Tabla Users: ${users[0].count} registros`);
        } catch (error) {
            console.log('⚠️ Tabla Users no encontrada o vacía');
        }

        await connection.end();
        return true;

    } catch (error) {
        console.log('❌ Error de conexión a MySQL:', error.message);
        return false;
    }
}

async function checkBackendServer() {
    console.log('\n2️⃣ VERIFICANDO SERVIDOR BACKEND...');

    return new Promise((resolve) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/inventory',
            method: 'GET',
            timeout: 5000
        }, (res) => {
            console.log(`✅ Servidor responde (Status: ${res.statusCode})`);
            resolve(true);
        });

        req.on('error', (err) => {
            console.log('❌ Servidor no responde:', err.message);
            resolve(false);
        });

        req.on('timeout', () => {
            console.log('❌ Timeout conectando al servidor');
            req.destroy();
            resolve(false);
        });

        req.end();
    });
}

async function checkFrontendServer() {
    console.log('\n3️⃣ VERIFICANDO SERVIDOR FRONTEND...');

    return new Promise((resolve) => {
        const req = http.request({
            hostname: 'localhost',
            port: 8080,
            path: '/inventario.html',
            method: 'GET',
            timeout: 5000
        }, (res) => {
            console.log(`✅ Frontend responde (Status: ${res.statusCode})`);
            resolve(true);
        });

        req.on('error', (err) => {
            console.log('❌ Frontend no responde:', err.message);
            resolve(false);
        });

        req.on('timeout', () => {
            console.log('❌ Timeout conectando al frontend');
            req.destroy();
            resolve(false);
        });

        req.end();
    });
}

async function runDiagnostics() {
    console.log('🚀 Iniciando diagnóstico completo...\n');

    const dbOk = await checkDatabaseConnection();
    const backendOk = await checkBackendServer();
    const frontendOk = await checkFrontendServer();

    console.log('\n📊 RESULTADOS DEL DIAGNÓSTICO:');
    console.log('=====================================');
    console.log(`MySQL Database: ${dbOk ? '✅ OK' : '❌ FAIL'}`);
    console.log(`Backend Server:  ${backendOk ? '✅ OK' : '❌ FAIL'}`);
    console.log(`Frontend Server: ${frontendOk ? '✅ OK' : '❌ FAIL'}`);

    if (dbOk && backendOk && frontendOk) {
        console.log('\n🎉 TODOS LOS SERVICIOS ESTÁN FUNCIONANDO CORRECTAMENTE');
        console.log('\n💡 Si aún no se cargan los datos en inventario, verifica:');
        console.log('   - Que estés autenticado en la aplicación');
        console.log('   - Que la consola del navegador no muestre errores de red');
        console.log('   - Que el token JWT no haya expirado');
    } else {
        console.log('\n⚠️  HAY PROBLEMAS QUE REQUIEREN ATENCIÓN:');

        if (!dbOk) {
            console.log('\n🔧 SOLUCIONES PARA MYSQL:');
            console.log('   1. Verifica que XAMPP/MySQL esté ejecutándose');
            console.log('   2. Verifica las credenciales en config.env');
            console.log('   3. Asegúrate de que el usuario root tenga permisos');
            console.log('   4. Ejecuta: node database/setup-mysql.js');
        }

        if (!backendOk) {
            console.log('\n🔧 SOLUCIONES PARA BACKEND:');
            console.log('   1. Ejecuta: npm start');
            console.log('   2. Verifica que el puerto 3000 no esté ocupado');
            console.log('   3. Revisa los logs del servidor en busca de errores');
        }

        if (!frontendOk) {
            console.log('\n🔧 SOLUCIONES PARA FRONTEND:');
            console.log('   1. Ejecuta: cd ../frontend && python -m http.server 8080');
            console.log('   2. Verifica que el puerto 8080 no esté ocupado');
            console.log('   3. Asegúrate de que estés en el directorio correcto');
        }
    }

    console.log('\n🔄 Para reiniciar todos los servicios:');
    console.log('   start-servers.bat');

    process.exit(dbOk && backendOk && frontendOk ? 0 : 1);
}

// Ejecutar diagnóstico
runDiagnostics().catch(error => {
    console.error('💥 Error ejecutando diagnóstico:', error);
    process.exit(1);
});
