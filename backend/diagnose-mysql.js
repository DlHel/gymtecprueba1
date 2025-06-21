const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

console.log('🔍 DIAGNÓSTICO DE MYSQL');
console.log('='.repeat(30));

// Mostrar configuración
console.log('📋 CONFIGURACIÓN:');
console.log('   Host:', process.env.DB_HOST || 'localhost');
console.log('   User:', process.env.DB_USER || 'root');
console.log('   Database:', process.env.DB_NAME || 'gymtec_erp');

// Configuración de conexión
const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
});

console.log('\n📡 Intentando conectar...');

connection.connect((err) => {
    if (err) {
        console.error('❌ Error de conexión:', err.message);
        console.error('   Código:', err.code);
        console.error('   errno:', err.errno);
        process.exit(1);
    }
    
    console.log('✅ Conexión exitosa');
    
    // Verificar base de datos
    console.log('\n📊 Verificando base de datos...');
    connection.query('SELECT DATABASE() as current_db', (err, result) => {
        if (err) {
            console.error('❌ Error verificando BD:', err.message);
        } else {
            console.log('   Base de datos actual:', result[0].current_db);
        }
        
        // Listar tablas
        console.log('\n📋 Listando tablas...');
        connection.query('SHOW TABLES', (err, tables) => {
            if (err) {
                console.error('❌ Error listando tablas:', err.message);
            } else {
                console.log('   Tablas encontradas:', tables.length);
                tables.forEach(table => {
                    const tableName = Object.values(table)[0];
                    console.log('     •', tableName);
                });
            }
            
            // Verificar estructura de clients
            console.log('\n🔍 Estructura tabla CLIENTS:');
            connection.query('DESCRIBE clients', (err, fields) => {
                if (err) {
                    console.error('❌ Error describiendo clients:', err.message);
                } else {
                    fields.forEach(field => {
                        console.log(`     • ${field.Field} - ${field.Type} (${field.Null})`);
                    });
                }
                
                // Verificar estructura de users
                console.log('\n🔍 Estructura tabla USERS:');
                connection.query('DESCRIBE users', (err, fields) => {
                    if (err) {
                        console.error('❌ Error describiendo users:', err.message);
                    } else {
                        fields.forEach(field => {
                            console.log(`     • ${field.Field} - ${field.Type} (${field.Null})`);
                        });
                    }
                    
                    // Verificar estructura de locations
                    console.log('\n🔍 Estructura tabla LOCATIONS:');
                    connection.query('DESCRIBE locations', (err, fields) => {
                        if (err) {
                            console.error('❌ Error describiendo locations:', err.message);
                        } else {
                            fields.forEach(field => {
                                console.log(`     • ${field.Field} - ${field.Type} (${field.Null})`);
                            });
                        }
                        
                        console.log('\n✅ Diagnóstico completado');
                        connection.end();
                        console.log('🔐 Conexión cerrada');
                    });
                });
            });
        });
    });
}); 