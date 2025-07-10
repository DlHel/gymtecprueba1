const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './config.env' });

console.log('🔧 CONFIGURANDO MYSQL PARA GYMTEC ERP...\n');

// Configuración de conexión
const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
};

console.log(`📡 Conectando a MySQL en ${config.host}:${config.port}...`);

// Crear conexión inicial (sin especificar base de datos)
const connection = mysql.createConnection(config);

connection.connect((err) => {
    if (err) {
        console.error('❌ Error conectando a MySQL:', err.message);
        console.log('\n💡 SOLUCIONES:');
        console.log('   • Verifica que XAMPP esté instalado');
        console.log('   • Abre XAMPP Control Panel');
        console.log('   • Inicia el servicio MySQL');
        console.log('   • Verifica que el puerto 3306 esté libre');
        process.exit(1);
    }
    
    console.log('✅ Conectado a MySQL exitosamente');
    
    // Crear base de datos
    const dbName = process.env.DB_NAME || 'gymtec_erp';
    console.log(`\n📋 Creando base de datos: ${dbName}...`);
    
    connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`, (err) => {
        if (err) {
            console.error('❌ Error creando base de datos:', err.message);
            process.exit(1);
        }
        
        console.log('✅ Base de datos creada/verificada');
        
        // Cambiar a la base de datos creada
        connection.changeUser({ database: dbName }, (err) => {
            if (err) {
                console.error('❌ Error seleccionando base de datos:', err.message);
                process.exit(1);
            }
            
            // Ejecutar schema
            console.log('\n🏗️  Ejecutando esquema de base de datos...');
            const schemaPath = path.join(__dirname, 'mysql-schema.sql');
            
            if (!fs.existsSync(schemaPath)) {
                console.error('❌ Archivo de esquema no encontrado:', schemaPath);
                process.exit(1);
            }
            
            const schema = fs.readFileSync(schemaPath, 'utf8');
            const statements = schema.split(';').filter(stmt => stmt.trim());
            
            let completed = 0;
            const total = statements.length;
            
            statements.forEach((statement, index) => {
                if (statement.trim()) {
                    connection.query(statement, (err) => {
                        if (err && !err.message.includes('already exists')) {
                            console.error(`❌ Error en statement ${index + 1}:`, err.message);
                        }
                        
                        completed++;
                        if (completed === total) {
                            console.log('✅ Esquema de base de datos ejecutado');
                            
                            // Verificar tablas creadas
                            connection.query('SHOW TABLES', (err, results) => {
                                if (err) {
                                    console.error('❌ Error verificando tablas:', err.message);
                                } else {
                                    console.log(`\n📊 Tablas creadas: ${results.length}`);
                                    results.forEach(row => {
                                        const tableName = Object.values(row)[0];
                                        console.log(`   • ${tableName}`);
                                    });
                                }
                                
                                console.log('\n🎉 CONFIGURACIÓN COMPLETADA');
                                console.log('💡 Puedes acceder a phpMyAdmin en: http://localhost/phpmyadmin');
                                console.log(`💡 Base de datos: ${dbName}`);
                                console.log('\n🚀 Listo para ejecutar: npm start');
                                
                                connection.end();
                                process.exit(0);
                            });
                        }
                    });
                }
            });
        });
    });
}); 